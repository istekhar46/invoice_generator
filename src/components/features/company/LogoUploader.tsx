/**
 * Logo Uploader Component
 * Handles company logo upload with preview functionality
 */

import React, { useRef, useState } from 'react'
import { Upload, X, Image } from 'lucide-react'
import { Button } from '../../ui/Button'
import { cn } from '../../../utils/classNames'

interface LogoUploaderProps {
  currentLogo?: string
  onLogoUpload: (file: File) => Promise<void>
  onLogoRemove?: () => void
  loading?: boolean
  error?: string | null
  className?: string
}

export const LogoUploader: React.FC<LogoUploaderProps> = ({
  currentLogo,
  onLogoUpload,
  onLogoRemove,
  loading = false,
  error,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFileSelect = async (file: File) => {
    try {
      await onLogoUpload(file)
    } catch (error) {
      // Error handling is managed by the parent component
      console.error('Logo upload failed:', error)
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
    
    const file = event.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveLogo = () => {
    if (onLogoRemove) {
      onLogoRemove()
    }
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Company Logo
      </label>
      
      <div className="space-y-4">
        {/* Current Logo Preview */}
        {currentLogo && (
          <div className="relative inline-block">
            <img
              src={currentLogo}
              alt="Company Logo"
              className="h-24 w-24 rounded-lg border border-gray-200 object-contain bg-gray-50"
            />
            {onLogoRemove && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Remove logo"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Upload Area */}
        <div
          className={cn(
            'relative rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors',
            dragOver && 'border-blue-500 bg-blue-50',
            !dragOver && 'hover:border-gray-400',
            loading && 'pointer-events-none opacity-50'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="sr-only"
            disabled={loading}
          />

          <div className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              {loading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              ) : (
                <Upload className="h-6 w-6 text-gray-400" />
              )}
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">
                {loading ? 'Uploading...' : 'Upload a logo'}
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, GIF up to 5MB
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="small"
              onClick={handleClick}
              disabled={loading}
            >
              <Image className="mr-2 h-4 w-4" />
              Choose File
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {/* Help Text */}
        <p className="text-xs text-gray-500">
          Your logo will appear on invoices and other business documents. 
          For best results, use a square image with a transparent background.
        </p>
      </div>
    </div>
  )
}