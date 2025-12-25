import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companyApi } from '../services/api'
import { getCacheInvalidationService } from '../services'
import { queryKeys } from '../lib'
import { useToast } from './useToast'
import type { 
  CreateCompanyProfileDto, 
  UpdateCompanyProfileDto, 
  CompanyProfileResponseDto,
  UploadLogoResponse
} from '../services/api'

// Query key factory for company profile (legacy - use queryKeys from lib instead)
export const companyKeys = {
  all: queryKeys.company,
  profile: queryKeys.companyProfile,
}

/**
 * Hook for fetching company profile
 * Fetches the current user's company profile data
 * Requirements: 6.1 - fetch profile data via GET /company/profile
 */
export function useCompanyProfile() {
  return useQuery({
    queryKey: queryKeys.companyProfile(),
    queryFn: () => companyApi.getProfile(),
    staleTime: 10 * 60 * 1000, // Company profile is fresh for 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.status === 401 || error?.status === 403) {
        return false
      }
      return failureCount < 2
    },
    select: (data: CompanyProfileResponseDto) => ({
      ...data,
      // Transform dates from strings to Date objects
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    }),
  })
}

/**
 * Hook for creating a company profile
 * Handles company profile creation and cache management
 * Requirements: 6.2 - create profile via POST /company/profile
 */
export function useCreateCompanyProfile() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (data: CreateCompanyProfileDto) => companyApi.createProfile(data),
    onSuccess: (newProfile) => {
      // Use centralized cache invalidation service
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.company.updateProfile({
        ...newProfile,
        createdAt: new Date(newProfile.createdAt),
        updatedAt: new Date(newProfile.updatedAt),
      })
      
      success('Company profile created', `${newProfile.businessName} profile has been created successfully`)
    },
    onError: (err) => {
      console.error('Failed to create company profile:', err)
      error('Failed to create company profile', 'Please check your input and try again')
    },
  })
}

/**
 * Hook for updating company profile
 * Implements optimistic updates with rollback on error
 * Requirements: 6.3 - update profile via PUT /company/profile
 */
export function useUpdateCompanyProfile() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (data: UpdateCompanyProfileDto) => companyApi.updateProfile(data),
    onMutate: async (data) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.companyProfile() })

      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData(queryKeys.companyProfile())

      // Optimistically update the profile
      if (previousProfile) {
        const cacheService = getCacheInvalidationService(queryClient)
        cacheService.company.updateProfile({
          ...previousProfile,
          ...data,
          updatedAt: new Date(),
        })
      }

      return { previousProfile }
    },
    onError: (err, _, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKeys.companyProfile(), context.previousProfile)
      }
      console.error('Failed to update company profile:', err)
      error('Failed to update company profile', 'Please check your input and try again')
    },
    onSuccess: (updatedProfile) => {
      success('Company profile updated', `${updatedProfile.businessName} profile has been updated successfully`)
    },
    onSettled: () => {
      // Always refetch after error or success
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.company.invalidateProfile()
    },
  })
}

/**
 * Hook for deleting company profile
 * Handles profile deletion and cache cleanup
 * Requirements: 6.4 - delete profile via DELETE /company/profile
 */
export function useDeleteCompanyProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => companyApi.deleteProfile(),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.companyProfile() })

      // Snapshot the previous profile
      const previousProfile = queryClient.getQueryData(queryKeys.companyProfile())

      // Optimistically remove the profile from cache
      queryClient.setQueryData(queryKeys.companyProfile(), null)

      return { previousProfile }
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKeys.companyProfile(), context.previousProfile)
      }
      console.error('Failed to delete company profile:', error)
    },
    onSuccess: () => {
      // Use centralized cache invalidation service
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.company.removeProfile()
    },
  })
}

/**
 * Hook for uploading company logo with progress tracking
 * Handles file upload with multipart form data and progress updates
 * Requirements: 6.4 - logo upload via POST /company/profile/logo, 6.5 - progress tracking, 6.6 - logo display
 */
export function useUploadLogo() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (file: File) => companyApi.uploadLogo(file),
    onMutate: async () => {
      // Cancel any outgoing refetches for the profile
      await queryClient.cancelQueries({ queryKey: queryKeys.companyProfile() })

      // Snapshot the previous profile
      const previousProfile = queryClient.getQueryData(queryKeys.companyProfile())

      return { previousProfile }
    },
    onSuccess: (uploadResponse: UploadLogoResponse) => {
      // Use centralized cache invalidation service
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.company.updateLogo(uploadResponse.logoUrl)
      
      success('Logo uploaded', 'Company logo has been updated successfully')
    },
    onError: (err, _, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKeys.companyProfile(), context.previousProfile)
      }
      console.error('Failed to upload company logo:', err)
      error('Failed to upload logo', 'Please check the file format and size, then try again')
    },
  })
}

/**
 * Hook to check if company profile exists
 * Provides reactive company profile status
 * Requirements: 7.4 - cache invalidation for company profile operations
 */
export function useCompanyProfileStatus() {
  const { data: profile, isLoading, error } = useCompanyProfile()
  const hasProfile = !!profile && !error

  return {
    hasProfile,
    isLoading,
    profile,
    error,
  }
}