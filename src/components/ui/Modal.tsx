import React from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { X } from 'lucide-react'
import { cn } from '../../utils/classNames'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'small' | 'medium' | 'large'
  children: React.ReactNode
  className?: string
}

const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  size = 'medium',
  children,
  className,
}) => {
  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel
          className={cn(
            'w-full rounded-lg bg-white p-6 shadow-xl',
            sizeClasses[size],
            className
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {title && (
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  {title}
                </DialogTitle>
              )}
              {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              )}
            </div>
            <button
              type="button"
              className="ml-4 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className={cn('mt-4', title || description ? 'mt-4' : 'mt-0')}>
            {children}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export interface ModalHeaderProps {
  children: React.ReactNode
  className?: string
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ children, className }) => {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  )
}

export interface ModalBodyProps {
  children: React.ReactNode
  className?: string
}

const ModalBody: React.FC<ModalBodyProps> = ({ children, className }) => {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  )
}

export interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

const ModalFooter: React.FC<ModalFooterProps> = ({ children, className }) => {
  return (
    <div className={cn('flex justify-end space-x-2 pt-4', className)}>
      {children}
    </div>
  )
}

export { Modal, ModalHeader, ModalBody, ModalFooter }