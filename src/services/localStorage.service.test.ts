/**
 * Unit tests for LocalStorageService and related utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  LocalStorageService,
  LocalStorageError,
  DateSerializer,
  LocalStorageRepository,
} from './localStorage.service'

// Mock localStorage for testing
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
}

// Replace the global localStorage with our mock
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('DateSerializer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('serialize', () => {
    it('should convert Date objects to ISO strings', () => {
      const date = new Date('2023-01-01T12:00:00.000Z')
      const result = DateSerializer.serialize(date)
      expect(result).toBe('2023-01-01T12:00:00.000Z')
    })

    it('should handle nested objects with dates', () => {
      const obj = {
        name: 'test',
        createdAt: new Date('2023-01-01T12:00:00.000Z'),
        nested: {
          updatedAt: new Date('2023-01-02T12:00:00.000Z'),
        },
      }
      const result = DateSerializer.serialize(obj)
      expect(result).toEqual({
        name: 'test',
        createdAt: '2023-01-01T12:00:00.000Z',
        nested: {
          updatedAt: '2023-01-02T12:00:00.000Z',
        },
      })
    })

    it('should handle arrays with dates', () => {
      const arr = [
        new Date('2023-01-01T12:00:00.000Z'),
        { date: new Date('2023-01-02T12:00:00.000Z') },
      ]
      const result = DateSerializer.serialize(arr)
      expect(result).toEqual([
        '2023-01-01T12:00:00.000Z',
        { date: '2023-01-02T12:00:00.000Z' },
      ])
    })

    it('should handle null and undefined values', () => {
      expect(DateSerializer.serialize(null)).toBe(null)
      expect(DateSerializer.serialize(undefined)).toBe(undefined)
    })
  })

  describe('deserialize', () => {
    it('should convert ISO strings back to Date objects', () => {
      const isoString = '2023-01-01T12:00:00.000Z'
      const result = DateSerializer.deserialize(isoString)
      expect(result).toBeInstanceOf(Date)
      // Type guard to ensure result is a Date
      const dateResult = result as unknown as Date
      expect(dateResult.toISOString()).toBe('2023-01-01T12:00:00.000Z')
    })

    it('should handle nested objects with ISO date strings', () => {
      const obj = {
        name: 'test',
        createdAt: '2023-01-01T12:00:00.000Z',
        nested: {
          updatedAt: '2023-01-02T12:00:00.000Z',
        },
      }
      const result = DateSerializer.deserialize(obj)
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.nested.updatedAt).toBeInstanceOf(Date)
    })

    it('should not convert non-ISO date strings', () => {
      const obj = {
        name: 'test',
        notADate: 'just a string',
        alsoNotADate: '2023-01-01', // Not full ISO format
      }
      const result = DateSerializer.deserialize(obj)
      expect(result.notADate).toBe('just a string')
      expect(result.alsoNotADate).toBe('2023-01-01')
    })
  })
})

describe('LocalStorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.length = 0
  })

  describe('get', () => {
    it('should retrieve and deserialize data from localStorage', () => {
      const testData = { name: 'test', createdAt: '2023-01-01T12:00:00.000Z' }
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testData))

      const result = LocalStorageService.get('test-key')
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key')
      expect(result).toEqual({
        name: 'test',
        createdAt: expect.any(Date),
      })
    })

    it('should return null when key does not exist', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const result = LocalStorageService.get('nonexistent-key')
      
      expect(result).toBe(null)
    })

    it('should throw LocalStorageError when localStorage is unavailable', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage unavailable')
      })

      expect(() => LocalStorageService.get('test-key')).toThrow(LocalStorageError)
    })
  })

  describe('set', () => {
    it('should serialize and store data in localStorage', () => {
      const testData = { name: 'test', createdAt: new Date('2023-01-01T12:00:00.000Z') }
      
      LocalStorageService.set('test-key', testData)
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ name: 'test', createdAt: '2023-01-01T12:00:00.000Z' })
      )
    })

    it('should throw LocalStorageError when storage fails', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      expect(() => LocalStorageService.set('test-key', { data: 'test' })).toThrow(
        LocalStorageError
      )
    })
  })

  describe('remove', () => {
    it('should remove item from localStorage', () => {
      LocalStorageService.remove('test-key')
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key')
    })
  })

  describe('clear', () => {
    it('should clear all localStorage data', () => {
      LocalStorageService.clear()
      
      expect(mockLocalStorage.clear).toHaveBeenCalled()
    })
  })

  describe('exists', () => {
    it('should return true when key exists', () => {
      mockLocalStorage.getItem.mockReturnValue('some-value')
      
      const result = LocalStorageService.exists('test-key')
      
      expect(result).toBe(true)
    })

    it('should return false when key does not exist', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      const result = LocalStorageService.exists('test-key')
      
      expect(result).toBe(false)
    })
  })

  describe('getKeys', () => {
    it('should return all localStorage keys', () => {
      mockLocalStorage.length = 2
      mockLocalStorage.key.mockReturnValueOnce('key1').mockReturnValueOnce('key2')
      
      const result = LocalStorageService.getKeys()
      
      expect(result).toEqual(['key1', 'key2'])
    })
  })
})

describe('LocalStorageRepository', () => {
  let repository: LocalStorageRepository<{ id: string; name: string }>

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new LocalStorageRepository('test-entities')
  })

  describe('getAll', () => {
    it('should return all entities', () => {
      const entities = [
        { id: '1', name: 'Entity 1' },
        { id: '2', name: 'Entity 2' },
      ]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(entities))

      const result = repository.getAll()
      
      expect(result).toEqual(entities)
    })

    it('should return empty array when no entities exist', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const result = repository.getAll()
      
      expect(result).toEqual([])
    })
  })

  describe('getById', () => {
    it('should return entity by ID', () => {
      const entities = [
        { id: '1', name: 'Entity 1' },
        { id: '2', name: 'Entity 2' },
      ]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(entities))

      const result = repository.getById('1')
      
      expect(result).toEqual({ id: '1', name: 'Entity 1' })
    })

    it('should return null when entity not found', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]))

      const result = repository.getById('nonexistent')
      
      expect(result).toBe(null)
    })
  })

  describe('create', () => {
    it('should add new entity to storage', () => {
      const existingEntities = [{ id: '1', name: 'Entity 1' }]
      const newEntity = { id: '2', name: 'Entity 2' }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingEntities))

      repository.create(newEntity)
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-entities',
        JSON.stringify([...existingEntities, newEntity])
      )
    })
  })

  describe('update', () => {
    it('should update existing entity', () => {
      const entities = [
        { id: '1', name: 'Entity 1' },
        { id: '2', name: 'Entity 2' },
      ]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(entities))

      const result = repository.update('1', { name: 'Updated Entity 1' })
      
      expect(result).toEqual({ id: '1', name: 'Updated Entity 1' })
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-entities',
        JSON.stringify([
          { id: '1', name: 'Updated Entity 1' },
          { id: '2', name: 'Entity 2' },
        ])
      )
    })

    it('should return null when entity not found', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]))

      const result = repository.update('nonexistent', { name: 'Updated' })
      
      expect(result).toBe(null)
    })
  })

  describe('delete', () => {
    it('should remove entity from storage', () => {
      const entities = [
        { id: '1', name: 'Entity 1' },
        { id: '2', name: 'Entity 2' },
      ]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(entities))

      const result = repository.delete('1')
      
      expect(result).toBe(true)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-entities',
        JSON.stringify([{ id: '2', name: 'Entity 2' }])
      )
    })

    it('should return false when entity not found', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]))

      const result = repository.delete('nonexistent')
      
      expect(result).toBe(false)
    })
  })

  describe('deleteAll', () => {
    it('should clear all entities', () => {
      repository.deleteAll()
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-entities', JSON.stringify([]))
    })
  })

  describe('count', () => {
    it('should return number of entities', () => {
      const entities = [
        { id: '1', name: 'Entity 1' },
        { id: '2', name: 'Entity 2' },
      ]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(entities))

      const result = repository.count()
      
      expect(result).toBe(2)
    })
  })
})