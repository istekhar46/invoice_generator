/**
 * Authentication Store
 * Zustand store for managing user authentication state with local storage persistence
 */

import { create } from 'zustand'
import type { User } from '../types/entities'
import type { LoginFormData, SignupFormData } from '../types/forms'
import { LocalStorageService, LocalStorageError } from '../services/localStorage.service'

/**
 * Authentication store state interface
 */
interface AuthStore {
  // State
  user: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean

  // Actions
  login: (data: LoginFormData) => Promise<void>
  signup: (data: SignupFormData) => Promise<void>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
  clearError: () => void
  setLoading: (loading: boolean) => void
}

/**
 * Generate unique ID for user
 */
const generateId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Simple password hashing (for demo purposes - in production use proper hashing)
 */
const hashPassword = (password: string): string => {
  // This is a very basic hash for demo purposes
  // In production, use bcrypt or similar
  return btoa(password + 'salt')
}

/**
 * Verify password against hash
 */
const verifyPassword = (password: string, hash: string): boolean => {
  return hashPassword(password) === hash
}

/**
 * Authentication Zustand store
 */
export const useAuthStore = create<AuthStore>((set) => ({
  // Initial state
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,

  // Actions
  login: async (data: LoginFormData) => {
    set({ loading: true, error: null })
    
    try {
      // Get stored users
      const users = LocalStorageService.get<User[]>('users') || []
      
      // Find user by email
      const user = users.find(u => u.email === data.email)
      
      if (!user) {
        throw new Error('Invalid email or password')
      }
      
      // Verify password
      if (!verifyPassword(data.password, user.passwordHash || '')) {
        throw new Error('Invalid email or password')
      }
      
      // Store user session
      LocalStorageService.set('user', user)
      
      set({ 
        user, 
        isAuthenticated: true, 
        loading: false 
      })
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Login failed'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  signup: async (data: SignupFormData) => {
    set({ loading: true, error: null })
    
    try {
      // Get existing users
      const users = LocalStorageService.get<User[]>('users') || []
      
      // Check if user already exists
      const existingUser = users.find(u => u.email === data.email)
      if (existingUser) {
        throw new Error('User with this email already exists')
      }
      
      // Create new user
      const now = new Date()
      const newUser: User = {
        id: generateId(),
        email: data.email,
        displayName: data.displayName,
        passwordHash: hashPassword(data.password),
        photoURL: undefined,
        createdAt: now,
        updatedAt: now,
      }
      
      // Store user in users array
      users.push(newUser)
      LocalStorageService.set('users', users)
      
      // Store user session
      LocalStorageService.set('user', newUser)
      
      set({ 
        user: newUser, 
        isAuthenticated: true, 
        loading: false 
      })
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Signup failed'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  logout: async () => {
    set({ loading: true, error: null })
    
    try {
      // Remove user session
      LocalStorageService.remove('user')
      
      set({ 
        user: null, 
        isAuthenticated: false, 
        loading: false 
      })
    } catch (error) {
      const errorMessage = error instanceof LocalStorageError 
        ? error.message 
        : 'Logout failed'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  loadUser: async () => {
    set({ loading: true, error: null })
    
    try {
      // Check for existing user session
      const user = LocalStorageService.get<User>('user')
      
      if (user) {
        set({ 
          user, 
          isAuthenticated: true, 
          loading: false 
        })
      } else {
        set({ 
          user: null, 
          isAuthenticated: false, 
          loading: false 
        })
      }
    } catch (error) {
      const errorMessage = error instanceof LocalStorageError 
        ? error.message 
        : 'Failed to load user session'
      set({ error: errorMessage, loading: false })
      // Don't throw here - just clear the session
      set({ 
        user: null, 
        isAuthenticated: false, 
        loading: false 
      })
    }
  },

  clearError: () => {
    set({ error: null })
  },

  setLoading: (loading: boolean) => {
    set({ loading })
  },
}))