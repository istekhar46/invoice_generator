/**
 * Type-safe local storage service with JSON serialization and date handling
 * 
 * Note: This service is primarily used for authentication token storage.
 * Business data (customers, invoices, company profiles) is now handled by the backend API
 * and cached using TanStack Query.
 */

/**
 * Error thrown when local storage is unavailable or operations fail
 */
export class LocalStorageError extends Error {
  public readonly cause?: Error

  constructor(message: string, cause?: Error) {
    super(message)
    this.name = 'LocalStorageError'
    this.cause = cause
  }
}

/**
 * Date serialization utilities for proper JSON handling
 */
export class DateSerializer {
  /**
   * Converts Date objects to ISO strings recursively in an object
   */
  static serialize<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj
    }

    if (obj instanceof Date) {
      return obj.toISOString() as unknown as T
    }

    if (Array.isArray(obj)) {
      return obj.map(item => DateSerializer.serialize(item)) as unknown as T
    }

    if (typeof obj === 'object') {
      const serialized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        serialized[key] = DateSerializer.serialize(value)
      }
      return serialized
    }

    return obj
  }

  /**
   * Converts ISO strings back to Date objects recursively in an object
   */
  static deserialize<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj
    }

    if (typeof obj === 'string' && DateSerializer.isISODateString(obj)) {
      return new Date(obj) as unknown as T
    }

    if (Array.isArray(obj)) {
      return obj.map(item => DateSerializer.deserialize(item)) as unknown as T
    }

    if (typeof obj === 'object') {
      const deserialized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        deserialized[key] = DateSerializer.deserialize(value)
      }
      return deserialized
    }

    return obj
  }

  /**
   * Checks if a string is a valid ISO date string
   */
  private static isISODateString(value: string): boolean {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/
    return isoDateRegex.test(value) && !isNaN(Date.parse(value))
  }
}

/**
 * Type-safe local storage service
 * Primarily used for authentication token storage and simple key-value operations
 */
export class LocalStorageService {
  /**
   * Checks if local storage is available
   */
  private static isAvailable(): boolean {
    try {
      const test = '__localStorage_test__'
      localStorage.setItem(test, 'test')
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  /**
   * Throws an error if local storage is unavailable
   */
  private static ensureAvailable(): void {
    if (!LocalStorageService.isAvailable()) {
      throw new LocalStorageError(
        'Local storage is unavailable. Please enable local storage in your browser settings.'
      )
    }
  }

  /**
   * Retrieves and deserializes data from local storage
   */
  static get<T>(key: string): T | null {
    try {
      LocalStorageService.ensureAvailable()
      
      const item = localStorage.getItem(key)
      if (item === null) {
        return null
      }

      const parsed = JSON.parse(item)
      return DateSerializer.deserialize<T>(parsed)
    } catch (error) {
      if (error instanceof LocalStorageError) {
        throw error
      }
      throw new LocalStorageError(
        `Failed to retrieve data for key "${key}"`,
        error as Error
      )
    }
  }

  /**
   * Serializes and stores data in local storage
   */
  static set<T>(key: string, value: T): void {
    try {
      LocalStorageService.ensureAvailable()
      
      const serialized = DateSerializer.serialize(value)
      const jsonString = JSON.stringify(serialized)
      localStorage.setItem(key, jsonString)
    } catch (error) {
      if (error instanceof LocalStorageError) {
        throw error
      }
      throw new LocalStorageError(
        `Failed to store data for key "${key}"`,
        error as Error
      )
    }
  }

  /**
   * Removes an item from local storage
   */
  static remove(key: string): void {
    try {
      LocalStorageService.ensureAvailable()
      localStorage.removeItem(key)
    } catch (error) {
      if (error instanceof LocalStorageError) {
        throw error
      }
      throw new LocalStorageError(
        `Failed to remove data for key "${key}"`,
        error as Error
      )
    }
  }

  /**
   * Clears all data from local storage
   */
  static clear(): void {
    try {
      LocalStorageService.ensureAvailable()
      localStorage.clear()
    } catch (error) {
      if (error instanceof LocalStorageError) {
        throw error
      }
      throw new LocalStorageError(
        'Failed to clear local storage',
        error as Error
      )
    }
  }

  /**
   * Checks if a key exists in local storage
   */
  static exists(key: string): boolean {
    try {
      LocalStorageService.ensureAvailable()
      return localStorage.getItem(key) !== null
    } catch (error) {
      if (error instanceof LocalStorageError) {
        throw error
      }
      throw new LocalStorageError(
        `Failed to check existence of key "${key}"`,
        error as Error
      )
    }
  }

  /**
   * Gets all keys from local storage
   */
  static getKeys(): string[] {
    try {
      LocalStorageService.ensureAvailable()
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key !== null) {
          keys.push(key)
        }
      }
      return keys
    } catch (error) {
      if (error instanceof LocalStorageError) {
        throw error
      }
      throw new LocalStorageError(
        'Failed to retrieve local storage keys',
        error as Error
      )
    }
  }

  /**
   * Gets the size of local storage in bytes (approximate)
   */
  static getSize(): number {
    try {
      LocalStorageService.ensureAvailable()
      let total = 0
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          total += localStorage[key].length + key.length
        }
      }
      return total
    } catch (error) {
      if (error instanceof LocalStorageError) {
        throw error
      }
      throw new LocalStorageError(
        'Failed to calculate local storage size',
        error as Error
      )
    }
  }
}

/**
 * @deprecated Generic repository class for entity CRUD operations
 * 
 * This class is deprecated as business data is now handled by the backend API
 * and cached using TanStack Query. Use the appropriate API hooks instead:
 * - useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer
 * - useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice  
 * - useCompanyProfile, useCreateCompanyProfile, useUpdateCompanyProfile
 */
export class LocalStorageRepository<T extends { id: string }> {
  private readonly storageKey: string

  constructor(storageKey: string) {
    this.storageKey = storageKey
    console.warn(`LocalStorageRepository is deprecated. Use TanStack Query hooks for ${storageKey} instead.`)
  }

  /**
   * @deprecated Use appropriate TanStack Query hooks instead
   */
  getAll(): T[] {
    try {
      const items = LocalStorageService.get<T[]>(this.storageKey)
      return items || []
    } catch (error) {
      throw new LocalStorageError(
        `Failed to retrieve all items from ${this.storageKey}`,
        error as Error
      )
    }
  }

  /**
   * @deprecated Use appropriate TanStack Query hooks instead
   */
  getById(id: string): T | null {
    try {
      const items = this.getAll()
      return items.find(item => item.id === id) || null
    } catch (error) {
      throw new LocalStorageError(
        `Failed to retrieve item with id "${id}" from ${this.storageKey}`,
        error as Error
      )
    }
  }

  /**
   * @deprecated Use appropriate TanStack Query hooks instead
   */
  create(entity: T): void {
    try {
      const items = this.getAll()
      items.push(entity)
      LocalStorageService.set(this.storageKey, items)
    } catch (error) {
      throw new LocalStorageError(
        `Failed to create item in ${this.storageKey}`,
        error as Error
      )
    }
  }

  /**
   * @deprecated Use appropriate TanStack Query hooks instead
   */
  update(id: string, updates: Partial<T>): T | null {
    try {
      const items = this.getAll()
      const index = items.findIndex(item => item.id === id)
      
      if (index === -1) {
        return null
      }

      items[index] = { ...items[index], ...updates }
      LocalStorageService.set(this.storageKey, items)
      return items[index]
    } catch (error) {
      throw new LocalStorageError(
        `Failed to update item with id "${id}" in ${this.storageKey}`,
        error as Error
      )
    }
  }

  /**
   * @deprecated Use appropriate TanStack Query hooks instead
   */
  delete(id: string): boolean {
    try {
      const items = this.getAll()
      const initialLength = items.length
      const filteredItems = items.filter(item => item.id !== id)
      
      if (filteredItems.length === initialLength) {
        return false // Item not found
      }

      LocalStorageService.set(this.storageKey, filteredItems)
      return true
    } catch (error) {
      throw new LocalStorageError(
        `Failed to delete item with id "${id}" from ${this.storageKey}`,
        error as Error
      )
    }
  }

  /**
   * @deprecated Use appropriate TanStack Query hooks instead
   */
  deleteAll(): void {
    try {
      LocalStorageService.set(this.storageKey, [])
    } catch (error) {
      throw new LocalStorageError(
        `Failed to delete all items from ${this.storageKey}`,
        error as Error
      )
    }
  }

  /**
   * @deprecated Use appropriate TanStack Query hooks instead
   */
  count(): number {
    try {
      return this.getAll().length
    } catch (error) {
      throw new LocalStorageError(
        `Failed to count items in ${this.storageKey}`,
        error as Error
      )
    }
  }
}