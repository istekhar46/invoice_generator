/**
 * Offline Queue Service
 * Handles queuing operations when offline and retrying when back online
 * Enhanced integration with TanStack Query for better offline support
 * Requirements: 8.4 - offline status indication and queue operations when possible, 8.6 - retry mechanisms
 */

import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useQueryClient } from '@tanstack/react-query'

export interface QueuedOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: 'customer' | 'invoice' | 'company'
  data: any
  timestamp: number
  retryCount: number
  maxRetries: number
  queryKey?: string[] // For cache invalidation after successful retry
  optimisticUpdate?: any // For rollback on failure
}

export interface OfflineQueueConfig {
  maxQueueSize: number
  maxRetries: number
  retryDelay: number
  storageKey: string
  enableAutoProcess: boolean
}

class OfflineQueueService {
  private config: OfflineQueueConfig = {
    maxQueueSize: 100,
    maxRetries: 3,
    retryDelay: 5000,
    storageKey: 'offline_operations_queue',
    enableAutoProcess: true,
  }

  private queue: QueuedOperation[] = []
  private isProcessing = false
  private listeners: Array<(queue: QueuedOperation[]) => void> = []
  private processingTimer: number | null = null

  constructor() {
    this.loadQueue()
    this.setupOnlineListener()
  }

  /**
   * Load queued operations from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey)
      if (stored) {
        this.queue = JSON.parse(stored)
        // Clean up old operations (older than 24 hours)
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
        this.queue = this.queue.filter(op => op.timestamp > oneDayAgo)
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error)
      this.queue = []
    }
  }

  /**
   * Save queued operations to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.queue))
      this.notifyListeners()
    } catch (error) {
      console.error('Failed to save offline queue:', error)
    }
  }

  /**
   * Setup listener for online status changes with enhanced retry logic
   */
  private setupOnlineListener(): void {
    if (typeof window !== 'undefined') {
      const handleOnline = () => {
        if (this.config.enableAutoProcess) {
          // Delay processing to allow network to stabilize
          setTimeout(() => {
            this.processQueue()
          }, 2000)
        }
      }

      const handleOffline = () => {
        // Clear any pending processing timer
        if (this.processingTimer) {
          clearTimeout(this.processingTimer)
          this.processingTimer = null
        }
      }

      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
    }
  }

  /**
   * Add operation to queue with enhanced metadata
   */
  public enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): string {
    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove oldest operation
      this.queue.shift()
    }

    const queuedOperation: QueuedOperation = {
      ...operation,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
    }

    this.queue.push(queuedOperation)
    this.saveQueue()

    console.log('Operation queued for offline processing:', queuedOperation)
    return queuedOperation.id
  }

  /**
   * Remove operation from queue
   */
  public dequeue(id: string): boolean {
    const index = this.queue.findIndex(op => op.id === id)
    if (index !== -1) {
      this.queue.splice(index, 1)
      this.saveQueue()
      return true
    }
    return false
  }

  /**
   * Get all queued operations
   */
  public getQueue(): QueuedOperation[] {
    return [...this.queue]
  }

  /**
   * Get queued operations by entity type
   */
  public getQueueByEntity(entity: 'customer' | 'invoice' | 'company'): QueuedOperation[] {
    return this.queue.filter(op => op.entity === entity)
  }

  /**
   * Get queued operations count
   */
  public getQueueCount(): number {
    return this.queue.length
  }

  /**
   * Get queued operations count by entity
   */
  public getQueueCountByEntity(entity: 'customer' | 'invoice' | 'company'): number {
    return this.queue.filter(op => op.entity === entity).length
  }

  /**
   * Clear all queued operations
   */
  public clearQueue(): void {
    this.queue = []
    this.saveQueue()
  }

  /**
   * Clear queued operations by entity
   */
  public clearQueueByEntity(entity: 'customer' | 'invoice' | 'company'): void {
    this.queue = this.queue.filter(op => op.entity !== entity)
    this.saveQueue()
  }

  /**
   * Process all queued operations with enhanced error handling and retry logic
   */
  public async processQueue(): Promise<{ processed: number; failed: number; errors: string[] }> {
    if (this.isProcessing || this.queue.length === 0) {
      return { processed: 0, failed: 0, errors: [] }
    }

    // Check if online
    if (!navigator.onLine) {
      console.log('Cannot process queue while offline')
      return { processed: 0, failed: 0, errors: ['Device is offline'] }
    }

    this.isProcessing = true
    let processed = 0
    let failed = 0
    const errors: string[] = []

    try {
      const operations = [...this.queue]
      console.log(`Processing ${operations.length} queued operations`)
      
      for (const operation of operations) {
        try {
          await this.processOperation(operation)
          this.dequeue(operation.id)
          processed++
          console.log('Successfully processed queued operation:', operation.id)
        } catch (error) {
          console.error('Failed to process queued operation:', operation.id, error)
          
          // Increment retry count
          operation.retryCount++
          
          // Remove if max retries reached
          if (operation.retryCount >= operation.maxRetries) {
            console.warn('Max retries reached for operation:', operation.id)
            this.dequeue(operation.id)
            failed++
            errors.push(`Operation ${operation.id} failed after ${operation.maxRetries} retries`)
          } else {
            // Schedule retry with exponential backoff
            const retryDelay = this.config.retryDelay * Math.pow(2, operation.retryCount - 1)
            console.log(`Scheduling retry for operation ${operation.id} in ${retryDelay}ms`)
            
            if (this.processingTimer) {
              clearTimeout(this.processingTimer)
            }
            
            this.processingTimer = setTimeout(() => {
              this.processQueue()
            }, retryDelay) as unknown as number
          }
        }
        
        // Add delay between operations to prevent overwhelming the server
        if (operations.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    } finally {
      this.isProcessing = false
    }

    console.log(`Queue processing complete: ${processed} processed, ${failed} failed`)
    return { processed, failed, errors }
  }

  /**
   * Process a single operation with enhanced error handling
   */
  private async processOperation(operation: QueuedOperation): Promise<void> {
    console.log('Processing queued operation:', operation)
    
    // Simulate API call based on operation type and entity
    // In a real implementation, this would call the appropriate API service
    switch (operation.entity) {
      case 'customer':
        return this.processCustomerOperation(operation)
      case 'invoice':
        return this.processInvoiceOperation(operation)
      case 'company':
        return this.processCompanyOperation(operation)
      default:
        throw new Error(`Unknown entity type: ${operation.entity}`)
    }
  }

  /**
   * Process customer operations
   */
  private async processCustomerOperation(operation: QueuedOperation): Promise<void> {
    // This would integrate with the actual customer API service
    // For now, we'll simulate the operation
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Simulate potential failure for testing
    if (Math.random() < 0.1) { // 10% failure rate for testing
      throw new Error('Simulated API failure')
    }
    
    console.log('Customer operation processed:', operation.type, operation.data)
  }

  /**
   * Process invoice operations
   */
  private async processInvoiceOperation(operation: QueuedOperation): Promise<void> {
    // This would integrate with the actual invoice API service
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Simulate potential failure for testing
    if (Math.random() < 0.1) { // 10% failure rate for testing
      throw new Error('Simulated API failure')
    }
    
    console.log('Invoice operation processed:', operation.type, operation.data)
  }

  /**
   * Process company operations
   */
  private async processCompanyOperation(operation: QueuedOperation): Promise<void> {
    // This would integrate with the actual company API service
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Simulate potential failure for testing
    if (Math.random() < 0.1) { // 10% failure rate for testing
      throw new Error('Simulated API failure')
    }
    
    console.log('Company operation processed:', operation.type, operation.data)
  }

  /**
   * Add listener for queue changes
   */
  public addListener(listener: (queue: QueuedOperation[]) => void): () => void {
    this.listeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index !== -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Notify all listeners of queue changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener([...this.queue])
      } catch (error) {
        console.error('Error in queue listener:', error)
      }
    })
  }

  /**
   * Generate unique ID for operations
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<OfflineQueueConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  public getConfig(): OfflineQueueConfig {
    return { ...this.config }
  }

  /**
   * Get processing status
   */
  public getStatus(): { isProcessing: boolean; queueCount: number; lastProcessed?: number } {
    return {
      isProcessing: this.isProcessing,
      queueCount: this.queue.length,
      lastProcessed: this.queue.length > 0 ? Math.max(...this.queue.map(op => op.timestamp)) : undefined,
    }
  }
}

// Export singleton instance
export const offlineQueueService = new OfflineQueueService()

/**
 * Enhanced React hook for using offline queue with TanStack Query integration
 */
export function useOfflineQueue() {
  const { isOnline } = useOnlineStatus()
  const queryClient = useQueryClient()
  
  const enqueueWithInvalidation = (
    operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>,
    queryKeys?: string[][]
  ) => {
    const id = offlineQueueService.enqueue({
      ...operation,
      queryKey: queryKeys?.[0], // Store first query key for invalidation
    })
    
    // If we're back online, try to process immediately
    if (isOnline) {
      setTimeout(() => {
        offlineQueueService.processQueue().then((result) => {
          if (result.processed > 0 && queryKeys) {
            // Invalidate related queries after successful processing
            queryKeys.forEach(queryKey => {
              queryClient.invalidateQueries({ queryKey })
            })
          }
        })
      }, 1000)
    }
    
    return id
  }

  const processQueueWithInvalidation = async () => {
    const result = await offlineQueueService.processQueue()
    
    if (result.processed > 0) {
      // Invalidate all queries to refresh data after processing
      queryClient.invalidateQueries()
    }
    
    return result
  }
  
  return {
    enqueue: enqueueWithInvalidation,
    dequeue: offlineQueueService.dequeue.bind(offlineQueueService),
    getQueue: offlineQueueService.getQueue.bind(offlineQueueService),
    getQueueByEntity: offlineQueueService.getQueueByEntity.bind(offlineQueueService),
    getQueueCount: offlineQueueService.getQueueCount.bind(offlineQueueService),
    getQueueCountByEntity: offlineQueueService.getQueueCountByEntity.bind(offlineQueueService),
    clearQueue: offlineQueueService.clearQueue.bind(offlineQueueService),
    clearQueueByEntity: offlineQueueService.clearQueueByEntity.bind(offlineQueueService),
    processQueue: processQueueWithInvalidation,
    getStatus: offlineQueueService.getStatus.bind(offlineQueueService),
    isOnline,
    canQueue: !isOnline, // Can queue when offline
  }
}