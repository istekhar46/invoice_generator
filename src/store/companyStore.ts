/**
 * Company Profile Store
 * Zustand store for managing company profile state with local storage persistence
 */

import { create } from 'zustand'
import type { CompanyProfile } from '../types/entities'
import type { CompanyProfileFormData } from '../types/forms'
import { LocalStorageRepository, LocalStorageError } from '../services/localStorage.service'

/**
 * Company profile store state interface
 */
interface CompanyStore {
  // State
  profile: CompanyProfile | null
  loading: boolean
  error: string | null

  // Actions
  createProfile: (data: CompanyProfileFormData, userId: string) => Promise<void>
  updateProfile: (data: Partial<CompanyProfileFormData>) => Promise<void>
  loadProfile: (userId: string) => Promise<void>
  uploadLogo: (file: File) => Promise<string>
  clearError: () => void
  setLoading: (loading: boolean) => void
}

// Local storage repository for company profiles
const companyRepository = new LocalStorageRepository<CompanyProfile>('company_profiles')

/**
 * Utility function to convert File to base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert file to base64'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
  })
}

/**
 * Generate unique ID for company profile
 */
const generateId = (): string => {
  return `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Company profile Zustand store
 */
export const useCompanyStore = create<CompanyStore>((set, get) => ({
  // Initial state
  profile: null,
  loading: false,
  error: null,

  // Actions
  createProfile: async (data: CompanyProfileFormData, userId: string) => {
    set({ loading: true, error: null })
    
    try {
      if (!userId) {
        throw new Error('User ID is required to create a company profile')
      }
      
      const now = new Date()
      const newProfile: CompanyProfile = {
        id: generateId(),
        userId,
        businessName: data.businessName,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        phone: data.phone,
        email: data.email,
        taxNumber: data.taxNumber,
        defaultLaborRate: data.defaultLaborRate,
        defaultTaxRate: data.defaultTaxRate,
        logoUrl: undefined, // Logo will be set separately via uploadLogo
        createdAt: now,
        updatedAt: now,
      }

      companyRepository.create(newProfile)
      set({ profile: newProfile, loading: false })
    } catch (error) {
      const errorMessage = error instanceof LocalStorageError 
        ? error.message 
        : 'Failed to create company profile'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  updateProfile: async (data: Partial<CompanyProfileFormData>) => {
    const { profile } = get()
    if (!profile) {
      const error = 'No company profile to update'
      set({ error })
      throw new Error(error)
    }

    set({ loading: true, error: null })

    try {
      const updatedProfile = companyRepository.update(profile.id, {
        ...data,
        updatedAt: new Date(),
      })

      if (!updatedProfile) {
        throw new Error('Failed to update company profile')
      }

      set({ profile: updatedProfile, loading: false })
    } catch (error) {
      const errorMessage = error instanceof LocalStorageError 
        ? error.message 
        : 'Failed to update company profile'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  loadProfile: async (userId: string) => {
    set({ loading: true, error: null })

    try {
      const profiles = companyRepository.getAll()
      const userProfile = profiles.find(p => p.userId === userId)
      
      set({ profile: userProfile || null, loading: false })
    } catch (error) {
      const errorMessage = error instanceof LocalStorageError 
        ? error.message 
        : 'Failed to load company profile'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  uploadLogo: async (file: File): Promise<string> => {
    const { profile } = get()
    if (!profile) {
      const error = 'No company profile to update logo for'
      set({ error })
      throw new Error(error)
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      const error = 'File must be an image'
      set({ error })
      throw new Error(error)
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      const error = 'File size must be less than 5MB'
      set({ error })
      throw new Error(error)
    }

    set({ loading: true, error: null })

    try {
      const base64Logo = await fileToBase64(file)
      
      const updatedProfile = companyRepository.update(profile.id, {
        logoUrl: base64Logo,
        updatedAt: new Date(),
      })

      if (!updatedProfile) {
        throw new Error('Failed to update company profile with logo')
      }

      set({ profile: updatedProfile, loading: false })
      return base64Logo
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to upload logo'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  clearError: () => {
    set({ error: null })
  },

  setLoading: (loading: boolean) => {
    set({ loading })
  },
}))