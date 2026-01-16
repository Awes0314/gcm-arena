import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Footer } from '../Footer'

describe('Footer Component', () => {
  describe('Terms Link (Requirement 12.5)', () => {
    it('should display terms link in footer', () => {
      render(<Footer />)
      
      const termsLinks = screen.getAllByRole('link', { name: /利用規約/ })
      expect(termsLinks.length).toBeGreaterThan(0)
    })

    it('should have correct href for terms link', () => {
      render(<Footer />)
      
      const termsLinks = screen.getAllByRole('link', { name: /利用規約/ })
      termsLinks.forEach(link => {
        expect(link).toHaveAttribute('href', '/terms')
      })
    })

    it('should display unofficial service notice', () => {
      render(<Footer />)
      
      expect(screen.getByText(/本サービスはSEGAとは一切関係のない非公式サービスです/)).toBeInTheDocument()
    })

    it('should display copyright notice', () => {
      render(<Footer />)
      
      expect(screen.getByText(/© 2026 GCM Arena/)).toBeInTheDocument()
    })
  })

  describe('Footer Structure', () => {
    it('should render footer element', () => {
      const { container } = render(<Footer />)
      
      const footer = container.querySelector('footer')
      expect(footer).toBeInTheDocument()
    })

    it('should display about section', () => {
      render(<Footer />)
      
      expect(screen.getByText('GCM Arena について')).toBeInTheDocument()
    })

    it('should display features section', () => {
      render(<Footer />)
      
      expect(screen.getByText('機能')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '大会一覧' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '大会作成' })).toBeInTheDocument()
    })

    it('should display support section', () => {
      render(<Footer />)
      
      expect(screen.getByText('サポート')).toBeInTheDocument()
    })

    it('should display legal notice section', () => {
      render(<Footer />)
      
      expect(screen.getByText('注意事項')).toBeInTheDocument()
    })

    it('should have privacy policy link', () => {
      render(<Footer />)
      
      const privacyLink = screen.getByRole('link', { name: /プライバシーポリシー/ })
      expect(privacyLink).toBeInTheDocument()
      expect(privacyLink).toHaveAttribute('href', '/privacy')
    })
  })

  describe('Accessibility', () => {
    it('should have proper link hover states', () => {
      render(<Footer />)
      
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).toHaveClass(/hover:/)
      })
    })

    it('should have proper semantic structure', () => {
      const { container } = render(<Footer />)
      
      const footer = container.querySelector('footer')
      expect(footer).toBeInTheDocument()
      
      const headings = container.querySelectorAll('h3')
      expect(headings.length).toBeGreaterThan(0)
    })
  })
})
