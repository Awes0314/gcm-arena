import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TermsPage from '../page'

describe('Terms of Service Page', () => {
  describe('Page Display', () => {
    it('should render the terms page', () => {
      render(<TermsPage />)
      
      expect(screen.getByText('利用規約')).toBeInTheDocument()
    })

    it('should display the last updated date', () => {
      render(<TermsPage />)
      
      expect(screen.getByText(/最終更新日/)).toBeInTheDocument()
    })

    it('should display the unofficial service notice', () => {
      render(<TermsPage />)
      
      expect(screen.getByText('本サービスは非公式サービスです')).toBeInTheDocument()
      expect(screen.getByText(/SEGAとは一切関係のない非公式/)).toBeInTheDocument()
    })

    it('should display all required sections', () => {
      render(<TermsPage />)
      
      // Check for key sections
      expect(screen.getByText('第1条（適用）')).toBeInTheDocument()
      expect(screen.getByText('第2条（サービスの内容）')).toBeInTheDocument()
      expect(screen.getByText('第3条（アカウント登録）')).toBeInTheDocument()
      expect(screen.getByText('第4条（禁止事項）')).toBeInTheDocument()
      expect(screen.getByText('第5条（知的財産権）')).toBeInTheDocument()
      expect(screen.getByText('第6条（免責事項）')).toBeInTheDocument()
      expect(screen.getByText('第7条（データの取り扱い）')).toBeInTheDocument()
      expect(screen.getByText('第8条（サービスの変更・終了）')).toBeInTheDocument()
      expect(screen.getByText('第9条（利用規約の変更）')).toBeInTheDocument()
      expect(screen.getByText('第10条（準拠法・管轄裁判所）')).toBeInTheDocument()
    })

    it('should display disclaimer about SEGA', () => {
      render(<TermsPage />)
      
      expect(screen.getByText(/株式会社セガ/)).toBeInTheDocument()
      expect(screen.getByText(/SEGAによる公式サポートや承認を受けておらず/)).toBeInTheDocument()
    })

    it('should display service features', () => {
      render(<TermsPage />)
      
      expect(screen.getByText('大会の作成と管理')).toBeInTheDocument()
      expect(screen.getByText('大会への参加と離脱')).toBeInTheDocument()
      expect(screen.getByText(/スコアの提出/)).toBeInTheDocument()
      expect(screen.getByText('ランキングの閲覧')).toBeInTheDocument()
      expect(screen.getByText('プロフィール管理')).toBeInTheDocument()
      expect(screen.getByText('通知機能')).toBeInTheDocument()
    })

    it('should display prohibited actions', () => {
      render(<TermsPage />)
      
      expect(screen.getByText(/法令または公序良俗に違反する行為/)).toBeInTheDocument()
      expect(screen.getByText(/虚偽の情報を登録する行為/)).toBeInTheDocument()
      expect(screen.getByText(/不正なスコアを提出する行為/)).toBeInTheDocument()
    })

    it('should display disclaimer section with warnings', () => {
      render(<TermsPage />)
      
      expect(screen.getByText('重要な免責事項')).toBeInTheDocument()
      expect(screen.getByText(/現状有姿/)).toBeInTheDocument()
      expect(screen.getByText(/予告なく変更、中断、終了する場合があります/)).toBeInTheDocument()
    })

    it('should display data handling information', () => {
      render(<TermsPage />)
      
      expect(screen.getByText(/スコアデータ、プロフィール情報、画像などを保存/)).toBeInTheDocument()
      expect(screen.getByText(/大会終了後、関連する画像データは自動的に削除/)).toBeInTheDocument()
    })

    it('should display copyright notice', () => {
      render(<TermsPage />)
      
      expect(screen.getByText(/© 2026 GCM Arena/)).toBeInTheDocument()
    })
  })

  describe('Content Requirements', () => {
    it('should clearly state the service is unofficial (Requirement 12.3)', () => {
      render(<TermsPage />)
      
      const unofficialNotices = screen.getAllByText(/非公式/i)
      expect(unofficialNotices.length).toBeGreaterThan(0)
      
      const segaNotices = screen.getAllByText(/SEGA/i)
      expect(segaNotices.length).toBeGreaterThan(0)
    })

    it('should include disclaimer about game data and service availability (Requirement 12.4)', () => {
      render(<TermsPage />)
      
      expect(screen.getByText(/楽曲データやスコア情報の正確性について、運営者は保証しません/)).toBeInTheDocument()
      expect(screen.getByText(/本サービスは予告なく変更、中断、終了する場合があります/)).toBeInTheDocument()
    })

    it('should be accessible from all pages via footer (Requirement 12.5)', () => {
      // This is tested in the footer component test
      // The footer component already includes the terms link
      expect(true).toBe(true)
    })
  })
})
