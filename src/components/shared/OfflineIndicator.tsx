/**
 * Offline Indicator Component
 * Shows network status, offline/online transitions, and queued operations
 * Enhanced with retry mechanisms and queue status
 */

import React, { useState, useEffect } from 'react'
import { WifiOff, Wifi, Clock, RefreshCw, CheckCircle } from 'lucide-react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useOfflineQueue } from '../../services/offline/offlineQueue.service'
import { cn } from '../../utils/classNames'

export interface OfflineIndicatorProps {
  className?: string
  showWhenOnline?: boolean
  position?: 'top' | 'bottom'
  showQueueInfo?: boolean
}

/**
 * Enhanced Offline Indicator Component
 * Requirements: 8.4 - offline status indication, 8.6 - retry mechanisms
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className,
  showWhenOnline = false,
  position = 'top',
}) => {
  const { isOnline, isOffline, wasOffline } = useOnlineStatus()
  const { getQueueCount, getStatus, processQueue } = useOfflineQueue()
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastProcessResult, setLastProcessResult] = useState<{ processed: number; failed: number } | null>(null)

  const queueCount = getQueueCount()
  const { isProcessing: serviceProcessing } = getStatus()

  // Auto-process queue when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && queueCount > 0) {
      handleProcessQueue()
    }
  }, [isOnline, wasOffline, queueCount])

  const handleProcessQueue = async () => {
    if (isProcessing || serviceProcessing) return
    
    setIsProcessing(true)
    try {
      const result = await processQueue()
      setLastProcessResult(result)
      
      // Clear result after 5 seconds
      setTimeout(() => {
        setLastProcessResult(null)
      }, 5000)
    } catch (error) {
      console.error('Failed to process queue:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Don't show anything if online and showWhenOnline is false (unless we were recently offline or have queued items)
  if (isOnline && !showWhenOnline && !wasOffline && queueCount === 0) {
    return null
  }

  const getStatusConfig = () => {
    if (isOffline) {
      return {
        icon: WifiOff,
        message: 'You are offline',
        description: queueCount > 0 
          ? `${queueCount} operation${queueCount === 1 ? '' : 's'} queued`
          : 'Some features may not be available',
        className: 'bg-danger-600 text-white',
        iconClassName: 'text-white',
        showRetry: false,
      }
    }

    if (wasOffline || queueCount > 0) {
      if (isProcessing || serviceProcessing) {
        return {
          icon: RefreshCw,
          message: 'Processing queued operations',
          description: `${queueCount} operation${queueCount === 1 ? '' : 's'} remaining`,
          className: 'bg-secondary-600 text-white',
          iconClassName: 'text-white animate-spin',
          showRetry: false,
        }
      }

      if (lastProcessResult) {
        return {
          icon: CheckCircle,
          message: 'Queue processed',
          description: `${lastProcessResult.processed} completed, ${lastProcessResult.failed} failed`,
          className: lastProcessResult.failed > 0 ? 'bg-warning-600 text-white' : 'bg-success-600 text-white',
          iconClassName: 'text-white',
          showRetry: lastProcessResult.failed > 0,
        }
      }

      if (queueCount > 0) {
        return {
          icon: Clock,
          message: 'Operations queued',
          description: `${queueCount} operation${queueCount === 1 ? '' : 's'} waiting to sync`,
          className: 'bg-warning-600 text-white',
          iconClassName: 'text-white',
          showRetry: true,
        }
      }

      return {
        icon: Wifi,
        message: 'Back online',
        description: 'Connection restored',
        className: 'bg-success-600 text-white',
        iconClassName: 'text-white',
        showRetry: false,
      }
    }

    return {
      icon: Wifi,
      message: 'Online',
      description: 'Connected',
      className: 'bg-success-600 text-white',
      iconClassName: 'text-white',
      showRetry: false,
    }
  }

  const config = getStatusConfig()
  const { icon: Icon } = config

  return (
    <div
      className={cn(
        'fixed left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 max-w-sm',
        position === 'top' ? 'top-4' : 'bottom-4',
        config.className,
        isOffline ? 'animate-slide-down' : 'animate-slide-up',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between space-x-3">
        <div className="flex items-center space-x-2 flex-1">
          <Icon className={cn('h-4 w-4', config.iconClassName)} />
          <div className="text-sm">
            <div className="font-medium">{config.message}</div>
            <div className="text-xs opacity-90">{config.description}</div>
          </div>
        </div>
        
        {config.showRetry && isOnline && (
          <button
            onClick={handleProcessQueue}
            disabled={isProcessing || serviceProcessing}
            className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors disabled:opacity-50"
            title="Retry queued operations"
          >
            <RefreshCw className={cn('h-3 w-3', (isProcessing || serviceProcessing) && 'animate-spin')} />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Compact Offline Indicator for headers/toolbars with queue information
 */
export interface CompactOfflineIndicatorProps {
  className?: string
  showQueueCount?: boolean
}

export const CompactOfflineIndicator: React.FC<CompactOfflineIndicatorProps> = ({
  className,
  showQueueCount = true,
}) => {
  const { isOnline, isOffline } = useOnlineStatus()
  const { getQueueCount } = useOfflineQueue()
  const queueCount = getQueueCount()

  if (isOnline && queueCount === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center space-x-2 px-3 py-1 rounded-full text-sm',
        isOffline 
          ? 'bg-danger-100 text-danger-800' 
          : 'bg-warning-100 text-warning-800',
        className
      )}
      role="status"
      aria-label={isOffline ? 'Offline status' : 'Queued operations'}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="font-medium">Offline</span>
        </>
      ) : (
        <>
          <Clock className="h-4 w-4" />
          <span className="font-medium">
            {showQueueCount && queueCount > 0 ? `${queueCount} queued` : 'Syncing'}
          </span>
        </>
      )}
    </div>
  )
}

/**
 * Network Status Badge for detailed network information with queue status
 */
export interface NetworkStatusBadgeProps {
  className?: string
  showDetails?: boolean
  showQueueInfo?: boolean
}

export const NetworkStatusBadge: React.FC<NetworkStatusBadgeProps> = ({
  className,
  showQueueInfo = true,
}) => {
  const { isOffline } = useOnlineStatus()
  const { getQueueCount } = useOfflineQueue()
  const queueCount = getQueueCount()

  const getStatusColor = () => {
    if (isOffline) return 'bg-danger-100 text-danger-800 border-danger-200'
    if (queueCount > 0) return 'bg-warning-100 text-warning-800 border-warning-200'
    return 'bg-success-100 text-success-800 border-success-200'
  }

  const getStatusIcon = () => {
    if (isOffline) return WifiOff
    if (queueCount > 0) return Clock
    return Wifi
  }

  const getStatusText = () => {
    if (isOffline) return 'Offline'
    if (queueCount > 0) return showQueueInfo ? `${queueCount} queued` : 'Syncing'
    return 'Online'
  }

  const StatusIcon = getStatusIcon()

  return (
    <div
      className={cn(
        'inline-flex items-center space-x-2 px-2 py-1 border rounded-full text-xs font-medium',
        getStatusColor(),
        className
      )}
      role="status"
      aria-label={`Network status: ${getStatusText()}`}
    >
      <StatusIcon className="h-3 w-3" />
      <span>{getStatusText()}</span>
    </div>
  )
}

/**
 * Offline Banner for full-width notifications with enhanced queue information
 */
export interface OfflineBannerProps {
  className?: string
  onDismiss?: () => void
  showRetryButton?: boolean
  onRetry?: () => void
  showQueueInfo?: boolean
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  className,
  onDismiss,
  showRetryButton = true,
  onRetry,
  showQueueInfo = true,
}) => {
  const { isOffline } = useOnlineStatus()
  const { getQueueCount, processQueue } = useOfflineQueue()
  const [isProcessing, setIsProcessing] = useState(false)
  const queueCount = getQueueCount()

  const handleRetry = async () => {
    if (onRetry) {
      onRetry()
    } else {
      setIsProcessing(true)
      try {
        await processQueue()
      } catch (error) {
        console.error('Failed to process queue:', error)
      } finally {
        setIsProcessing(false)
      }
    }
  }

  if (!isOffline && queueCount === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'border-l-4 p-4',
        isOffline 
          ? 'bg-danger-50 border-danger-400' 
          : 'bg-warning-50 border-warning-400',
        className
      )}
      role="alert"
    >
      <div className="flex items-start">
        <div className="shrink-0">
          {isOffline ? (
            <WifiOff className="h-5 w-5 text-danger-400" />
          ) : (
            <Clock className="h-5 w-5 text-warning-400" />
          )}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={cn(
            'text-sm font-medium',
            isOffline ? 'text-danger-800' : 'text-warning-800'
          )}>
            {isOffline ? 'You are currently offline' : 'Operations pending sync'}
          </h3>
          <p className={cn(
            'mt-1 text-sm',
            isOffline ? 'text-danger-700' : 'text-warning-700'
          )}>
            {isOffline 
              ? showQueueInfo && queueCount > 0
                ? `Some features may not be available. ${queueCount} operation${queueCount === 1 ? '' : 's'} will be synced when you reconnect.`
                : 'Some features may not be available. Your changes will be saved when you reconnect.'
              : `${queueCount} operation${queueCount === 1 ? '' : 's'} waiting to sync with the server.`
            }
          </p>
        </div>
        <div className="ml-4 flex space-x-2">
          {showRetryButton && !isOffline && queueCount > 0 && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={isProcessing}
              className={cn(
                'text-sm font-medium underline transition-colors',
                isOffline 
                  ? 'text-danger-800 hover:text-danger-900' 
                  : 'text-warning-800 hover:text-warning-900',
                isProcessing && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isProcessing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className={cn(
                'transition-colors',
                isOffline 
                  ? 'text-danger-400 hover:text-danger-500' 
                  : 'text-warning-400 hover:text-warning-500'
              )}
              aria-label="Dismiss"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}