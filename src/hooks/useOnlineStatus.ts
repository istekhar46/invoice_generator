/**
 * Online Status Hook
 * Provides reactive online/offline status detection
 */

import { useState, useEffect } from 'react'

export interface OnlineStatus {
  isOnline: boolean
  isOffline: boolean
  wasOffline: boolean
}

/**
 * Hook to detect online/offline status
 * Requirements: 8.4 - offline status indication
 */
export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(() => {
    // Check if we're in a browser environment
    if (typeof navigator !== 'undefined') {
      return navigator.onLine
    }
    return true // Default to online for SSR
  })
  
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setIsOnline(true)
      // Don't reset wasOffline immediately - let components handle the transition
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
    }

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Reset wasOffline after a delay when coming back online
  useEffect(() => {
    if (isOnline && wasOffline) {
      const timer = setTimeout(() => {
        setWasOffline(false)
      }, 3000) // Show "back online" state for 3 seconds

      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
  }
}

/**
 * Hook to get network status with additional metadata
 */
export function useNetworkStatus() {
  const { isOnline, isOffline, wasOffline } = useOnlineStatus()
  const [connectionType, setConnectionType] = useState<string>('unknown')
  const [effectiveType, setEffectiveType] = useState<string>('unknown')

  useEffect(() => {
    // Check if NetworkInformation API is available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      
      const updateConnectionInfo = () => {
        setConnectionType(connection.type || 'unknown')
        setEffectiveType(connection.effectiveType || 'unknown')
      }

      // Initial update
      updateConnectionInfo()

      // Listen for changes
      connection.addEventListener('change', updateConnectionInfo)

      return () => {
        connection.removeEventListener('change', updateConnectionInfo)
      }
    }
  }, [])

  return {
    isOnline,
    isOffline,
    wasOffline,
    connectionType,
    effectiveType,
    isSlowConnection: effectiveType === 'slow-2g' || effectiveType === '2g',
  }
}