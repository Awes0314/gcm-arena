# Security Documentation

## Overview

This document outlines the security measures implemented in the GCM Arena platform to protect against common web vulnerabilities.

## Cross-Site Scripting (XSS) Protection

### React's Built-in Protection

React automatically escapes all content rendered in JSX, preventing XSS attacks by default. This means that user-generated content like tournament titles, descriptions, and display names are automatically escaped when rendered.

### Additional Sanitization

We implement additional sanitization layers for defense-in-depth:

1. **Input Sanitization** (`src/lib/utils/sanitization.ts`)
   - All user input is sanitized before being stored in the database
   - HTML tags are removed from plain text fields
   - Dangerous protocols (javascript:, data:, etc.) are blocked from URLs
   - DOMPurify is used for sanitizing HTML content where needed

2. **Validation** (`src/lib/utils/validation.ts`)
   - Input validation ensures data conforms to expected formats
   - Length limits prevent buffer overflow attacks
   - Type checking prevents type confusion attacks

### Protected Fields

- **Display Names**: HTML tags removed, length limited to 50 characters
- **Tournament Titles**: HTML tags removed, length limited to 100 characters
- **Tournament Descriptions**: Basic HTML tags allowed (b, i, em, strong, a, p, br, ul, ol, li), dangerous content removed
- **URLs**: Only http:// and https:// protocols allowed
- **JSON Objects**: All string values recursively sanitized

## SQL Injection Protection

### Primary Protection: Parameterized Queries

Supabase uses parameterized queries for all database operations, which prevents SQL injection attacks. User input is never directly concatenated into SQL queries.

### Row-Level Security (RLS)

All database tables have RLS policies enabled, providing an additional layer of protection:

- Users can only modify their own data
- Public data is read-only for non-owners
- Write operations require authentication
- RLS policies are enforced at the database level, preventing bypass through direct API access

### Defense-in-Depth

The `escapeSqlLike` function in `sanitization.ts` provides additional protection for LIKE queries, though this is primarily a defense-in-depth measure since parameterized queries are the primary protection.

## Cross-Site Request Forgery (CSRF) Protection

### Next.js Built-in Protection

Next.js provides built-in CSRF protection through:

1. **SameSite Cookies**: Supabase Auth uses SameSite cookies, which prevent cookies from being sent with cross-site requests
2. **Origin Checking**: Next.js automatically checks the Origin header for state-changing requests

### Supabase Auth Session Management

Supabase Auth uses HTTPOnly cookies with the following security attributes:

- **HTTPOnly**: Prevents JavaScript access to cookies
- **Secure**: Cookies only sent over HTTPS in production
- **SameSite=Lax**: Prevents CSRF attacks while allowing normal navigation

### API Route Protection

All state-changing API routes (POST, PATCH, DELETE) require authentication:

```typescript
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  return NextResponse.json(
    { error: { code: 'AUTH_REQUIRED', message: '認証が必要です' } },
    { status: 401 }
  )
}
```

This ensures that:
- Requests must include a valid session cookie
- The session cookie must be from the same site (SameSite protection)
- Unauthenticated requests are rejected

### CORS Configuration

The bookmarklet API endpoint has specific CORS configuration:

```typescript
// Only allows POST and OPTIONS methods
'Access-Control-Allow-Methods': 'POST, OPTIONS'

// Requires authentication via cookies (credentials)
// Note: Credentials are not allowed with wildcard origins in production
```

For production, the CORS origin should be restricted to specific domains rather than using `*`.

## Rate Limiting

### Implementation

Rate limiting is implemented using a sliding window algorithm (`src/lib/utils/rate-limiter.ts`):

- **In-memory storage**: Suitable for single-instance deployments
- **Automatic cleanup**: Expired entries are cleaned up every 5 minutes
- **Per-user and per-IP**: Rate limits can be applied per authenticated user or per IP address

### Rate Limit Configurations

Different endpoints have different rate limits based on their sensitivity:

| Endpoint | Limit | Window | Reason |
|----------|-------|--------|--------|
| General API | 100 requests | 15 minutes | Normal usage |
| Authentication | 5 requests | 15 minutes | Prevent brute force |
| Score Submission | 30 requests | 5 minutes | Prevent spam |
| Bookmarklet | 60 requests | 5 minutes | Allow automation |
| Tournament Creation | 5 requests | 1 hour | Prevent abuse |
| Image Upload | 20 requests | 10 minutes | Prevent storage abuse |

### Rate Limit Headers

Rate-limited responses include helpful headers:

- `X-RateLimit-Remaining`: Number of requests remaining
- `X-RateLimit-Reset`: When the rate limit resets (ISO 8601 timestamp)
- `Retry-After`: Seconds until the rate limit resets

### Production Considerations

For production deployments with multiple instances, consider:

- Using Redis for distributed rate limiting
- Implementing rate limiting at the CDN/load balancer level
- Monitoring rate limit violations for potential attacks

## Content Security Policy (CSP)

### Current Implementation

Next.js provides basic CSP through its security headers. The current configuration should be enhanced with:

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
      "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'",
    ].join('; '),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]
```

## Authentication Security

### Password Requirements

Supabase Auth enforces:
- Minimum password length (configurable, default 6 characters)
- Email verification (optional but recommended)
- Rate limiting on authentication attempts

### Session Management

- Sessions are stored in HTTPOnly cookies
- Sessions expire after inactivity (configurable in Supabase)
- Refresh tokens are rotated on use
- Sessions can be revoked server-side

### Best Practices

1. **Enable email verification** in Supabase Auth settings
2. **Configure password strength requirements** in Supabase Auth settings
3. **Enable MFA** for admin accounts (if available)
4. **Monitor failed login attempts** for potential attacks

## File Upload Security

### Image Upload Protection

1. **File Type Validation**: Only image files are accepted
2. **File Size Limits**: Maximum 5MB per image
3. **Rate Limiting**: 20 uploads per 10 minutes per user
4. **Storage Isolation**: Images are stored in user-specific paths
5. **Automatic Cleanup**: Images are deleted when tournaments end

### Recommendations

- Implement virus scanning for uploaded files (e.g., ClamAV)
- Use image processing to strip EXIF data and re-encode images
- Consider using a CDN with image optimization (e.g., Cloudflare Images)

## Environment Variables

### Required Security Configuration

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # Keep secret!

# Schema Configuration
SUPABASE_SCHEMA=dev # or 'public' for production

# Bookmarklet Control
BOOKMARKLET_ENABLED=true # Set to 'false' to disable
```

### Security Best Practices

1. **Never commit secrets** to version control
2. **Use different keys** for development and production
3. **Rotate keys regularly** (at least annually)
4. **Limit service role key usage** to server-side only
5. **Use environment-specific configurations** in Vercel

## Monitoring and Logging

### Security Events to Monitor

1. **Failed authentication attempts**: Potential brute force attacks
2. **Rate limit violations**: Potential DoS attacks or abuse
3. **RLS policy violations**: Potential privilege escalation attempts
4. **Unusual API patterns**: Potential automated attacks
5. **Large file uploads**: Potential storage abuse

### Logging Best Practices

- Log security events with timestamps and user identifiers
- Do not log sensitive data (passwords, tokens, etc.)
- Implement log rotation and retention policies
- Use structured logging for easier analysis
- Consider using a logging service (e.g., Datadog, Sentry)

## Incident Response

### In Case of Security Incident

1. **Disable affected functionality** (e.g., set BOOKMARKLET_ENABLED=false)
2. **Revoke compromised credentials** in Supabase dashboard
3. **Review logs** for extent of compromise
4. **Notify affected users** if personal data was accessed
5. **Patch vulnerabilities** and deploy fixes
6. **Conduct post-mortem** to prevent future incidents

## Security Checklist for Production

- [ ] Enable HTTPS only (Vercel does this automatically)
- [ ] Configure CSP headers in next.config.ts
- [ ] Enable email verification in Supabase Auth
- [ ] Configure strong password requirements
- [ ] Set up monitoring and alerting
- [ ] Implement distributed rate limiting (Redis)
- [ ] Restrict CORS origins (no wildcards)
- [ ] Enable Supabase database backups
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Review and test RLS policies
- [ ] Implement virus scanning for uploads
- [ ] Configure log retention policies
- [ ] Set up incident response procedures
- [ ] Conduct security audit/penetration testing

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [React Security](https://react.dev/learn/escape-hatches#security-pitfalls)
