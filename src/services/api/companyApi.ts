import { apiClient } from './apiClient'

// Company API DTOs based on backend structure
export interface CreateCompanyProfileDto {
  businessName: string
  address: string
  city: string
  state: string
  zipCode: string
  phone: string
  email: string
  taxNumber: string
  defaultLaborRate: number
  defaultTaxRate: number
}

export interface UpdateCompanyProfileDto {
  businessName?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  phone?: string
  email?: string
  taxNumber?: string
  defaultLaborRate?: number
  defaultTaxRate?: number
}

export interface CompanyProfileResponseDto {
  id: string
  userId: string
  businessName: string
  address: string
  city: string
  state: string
  zipCode: string
  phone: string
  email: string
  taxNumber: string
  defaultLaborRate: number
  defaultTaxRate: number
  logoUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface UploadLogoResponse {
  logoUrl: string
}

/**
 * Company Profile API service class
 * Handles all company profile-related API operations including CRUD operations
 * and logo upload functionality with multipart form data
 */
export class CompanyApi {
  private readonly basePath = '/company'

  /**
   * Get company profile for the current user
   * Requirements: 6.1 - fetch profile data via GET /company/profile
   */
  async getProfile(): Promise<CompanyProfileResponseDto | null> {
    return apiClient.get<CompanyProfileResponseDto | null>(`${this.basePath}/profile`)
  }

  /**
   * Create a new company profile
   * Requirements: 6.2 - create profile via POST /company/profile
   */
  async createProfile(data: CreateCompanyProfileDto): Promise<CompanyProfileResponseDto> {
    return apiClient.post<CompanyProfileResponseDto>(`${this.basePath}/profile`, data)
  }

  /**
   * Update an existing company profile
   * Requirements: 6.3 - update profile via PUT /company/profile
   */
  async updateProfile(data: UpdateCompanyProfileDto): Promise<CompanyProfileResponseDto> {
    return apiClient.put<CompanyProfileResponseDto>(`${this.basePath}/profile`, data)
  }

  /**
   * Delete company profile
   * Requirements: 6.4 - delete profile via DELETE /company/profile
   */
  async deleteProfile(): Promise<void> {
    return apiClient.delete<void>(`${this.basePath}/profile`)
  }

  /**
   * Upload company logo with multipart form data
   * Requirements: 6.4 - logo upload via POST /company/profile/logo with multipart form data
   */
  async uploadLogo(file: File): Promise<UploadLogoResponse> {
    const formData = new FormData()
    formData.append('logo', file)

    return apiClient.post<UploadLogoResponse>(`${this.basePath}/profile/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  }

  /**
   * Delete company logo
   * Requirements: 6.4 - logo deletion via DELETE /company/profile/logo
   */
  async deleteLogo(): Promise<void> {
    return apiClient.delete<void>(`${this.basePath}/profile/logo`)
  }
}

// Export singleton instance
export const companyApi = new CompanyApi()