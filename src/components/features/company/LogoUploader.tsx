/**
 * Logo Uploader Component
 * Handles company logo upload, update, and delete with preview functionality
 */

import React, { useRef, useState } from 'react'
import { Upload, Image, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '../../ui/Button'
import { cn } from '../../../utils/classNames'

interface LogoUploaderProps {
  currentLogo?: string
  onLogoUpload: (file: File) => Promise<void>
  onLogoDelete?: () => Promise<void>
  loading?: boolean
  deleting?: boolean
  error?: string | null
  className?: string
}

export const LogoUploader: React.FC<LogoUploaderProps> = ({
  currentLogo,
  onLogoUpload,
  onLogoDelete,
  loading = false,
  deleting = false,
  error,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const isProcessing = loading || deleting

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return
    }

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
    if (!isProcessing) {
      fileInputRef.current?.click()
    }
  }

  const handleDeleteLogo = async () => {
    if (onLogoDelete && !isProcessing) {
      try {
        await onLogoDelete()
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } catch (error) {
        console.error('Logo deletion failed:', error)
      }
    }
  }

  const handleReplaceLogo = () => {
    if (!isProcessing) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <label className="mb-3 block text-sm font-medium text-gray-700">
        Company Logo
      </label>
      
      <div className="space-y-4">
        {/* Current Logo Preview with Actions */}
        {currentLogo && (
          <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="relative">
              <img
                src={currentLogo}
                alt="Company Logo"
                className="h-20 w-20 rounded-lg border border-gray-300 object-contain bg-white shadow-sm"
              />
              {deleting && (
                <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 text-gray-600 animate-spin" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1">Current Logo</p>
              <p className="text-xs text-gray-500 mb-3">
                This logo will appear on your invoices and business documents.
              </p>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={handleReplaceLogo}
                  disabled={isProcessing}
                  className="text-xs"
                >
                  <Upload className="mr-1 h-3 w-3" />
                  Replace
                </Button>
                
                {onLogoDelete && (
                  <Button
                    type="button"
                    variant="outline"
                    size="small"
                    onClick={handleDeleteLogo}
                    disabled={isProcessing}
                    className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                  >
                    {deleting ? (
                      <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1 h-3 w-3" />
                    )}
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload Area - Show when no logo or when uploading */}
        {(!currentLogo || loading) && (
          <div
            className={cn(
              'relative rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors',
              dragOver && 'border-primary-500 bg-primary-50',
              !dragOver && 'hover:border-gray-400',
              isProcessing && 'pointer-events-none opacity-50'
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif"
              onChange={handleFileInputChange}
              className="sr-only"
              disabled={isProcessing}
            />

            <div className="space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                {loading ? (
                  <RefreshCw className="h-6 w-6 text-primary-600 animate-spin" />
                ) : (
                  <Upload className="h-6 w-6 text-gray-400" />
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">
                  {loading ? 'Uploading logo...' : currentLogo ? 'Upload new logo' : 'Upload your company logo'}
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, or GIF up to 5MB
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={handleClick}
                  disabled={isProcessing}
                >
                  <Image className="mr-2 h-4 w-4" />
                  Choose File
                </Button>
                
                <p className="text-xs text-gray-400">
                  or drag and drop your image here
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          </div>
        )}

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            <strong>Tips:</strong> For best results, use a square image with a transparent background. 
            Your logo will be automatically resized and optimized for use on invoices.
          </p>
        </div>
      </div>
    </div>
  )
}