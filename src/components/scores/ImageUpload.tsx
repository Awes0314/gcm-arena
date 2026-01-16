'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { X, Upload, Image as ImageIcon } from 'lucide-react'

interface ImageUploadProps {
  onImageSelect: (file: File) => void
  onImageRemove: () => void
  selectedImage: File | null
  disabled?: boolean
}

export function ImageUpload({
  onImageSelect,
  onImageRemove,
  selectedImage,
  disabled = false,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate preview URL when image is selected
  const generatePreview = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback(
    (file: File) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください')
        return
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        alert('ファイルサイズは5MB以下にしてください')
        return
      }

      onImageSelect(file)
      generatePreview(file)
    },
    [onImageSelect, generatePreview]
  )

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        handleFileSelect(files[0])
      }
    },
    [disabled, handleFileSelect]
  )

  // Handle file input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFileSelect(files[0])
      }
    },
    [handleFileSelect]
  )

  // Handle remove image
  const handleRemove = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    onImageRemove()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [previewUrl, onImageRemove])

  // Handle click on drop zone
  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])

  return (
    <div className="space-y-2">
      <Label>リザルト画像 *</Label>
      
      {!selectedImage ? (
        <Card
          className={`border-2 border-dashed transition-colors cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <CardContent className="flex flex-col items-center justify-center py-10 px-6 text-center">
            <Upload className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-sm font-medium mb-1">
              画像をドラッグ&ドロップ
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              または
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation()
                handleClick()
              }}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              ファイルを選択
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              PNG, JPG, JPEG (最大5MB)
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              {previewUrl && (
                <div className="relative rounded-lg overflow-hidden bg-muted w-full" style={{ minHeight: '200px' }}>
                  <Image
                    src={previewUrl}
                    alt="プレビュー"
                    width={800}
                    height={600}
                    className="w-full h-auto max-h-96 object-contain"
                    style={{ width: '100%', height: 'auto' }}
                    priority
                    unoptimized // For blob URLs
                  />
                </div>
              )}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium truncate max-w-xs">
                    {selectedImage.name}
                  </span>
                  <span className="text-muted-foreground">
                    ({(selectedImage.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  )
}
