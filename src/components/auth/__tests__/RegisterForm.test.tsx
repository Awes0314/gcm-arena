import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RegisterForm } from '../RegisterForm'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
  }),
}))

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

describe('RegisterForm - Terms Agreement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Terms Agreement Checkbox (Requirement 12.2)', () => {
    it('should display terms agreement checkbox', () => {
      render(<RegisterForm />)
      
      // The text is split across elements, so check for the parts
      expect(screen.getByRole('link', { name: /利用規約/ })).toBeInTheDocument()
      expect(screen.getByText(/に同意します/)).toBeInTheDocument()
    })

    it('should have a link to terms page', () => {
      render(<RegisterForm />)
      
      const termsLink = screen.getByRole('link', { name: /利用規約/ })
      expect(termsLink).toBeInTheDocument()
      expect(termsLink).toHaveAttribute('href', '/terms')
      expect(termsLink).toHaveAttribute('target', '_blank')
    })

    it('should have checkbox that can be checked', () => {
      render(<RegisterForm />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
      
      // Check the checkbox
      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
    })
  })

  describe('Form Fields', () => {
    it('should have all required form fields', () => {
      render(<RegisterForm />)
      
      expect(screen.getByLabelText('表示名')).toBeInTheDocument()
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
      expect(screen.getByLabelText('パスワード', { selector: '#password' })).toBeInTheDocument()
      expect(screen.getByLabelText('パスワード（確認）')).toBeInTheDocument()
    })

    it('should have a submit button', () => {
      render(<RegisterForm />)
      
      const submitButton = screen.getByRole('button', { name: /登録/ })
      expect(submitButton).toBeInTheDocument()
    })

    it('should have a link to login page', () => {
      render(<RegisterForm />)
      
      const loginLink = screen.getByRole('link', { name: /ログイン/ })
      expect(loginLink).toBeInTheDocument()
      expect(loginLink).toHaveAttribute('href', '/login')
    })

    it('should display terms agreement requirement', () => {
      render(<RegisterForm />)
      
      // Verify the terms agreement is part of the form
      expect(screen.getByText(/に同意します/)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /利用規約/ })).toBeInTheDocument()
    })
  })
})
