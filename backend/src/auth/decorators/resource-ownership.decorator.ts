import { SetMetadata } from '@nestjs/common';

export const RESOURCE_OWNERSHIP_KEY = 'resourceOwnership';

export interface ResourceOwnershipConfig {
  entity: 'customer' | 'invoice' | 'companyProfile';
  param: string; // The parameter name that contains the resource ID
  userField?: string; // The field name that contains the user ID (defaults to 'userId')
}

export const ResourceOwnership = (config: ResourceOwnershipConfig) =>
  SetMetadata(RESOURCE_OWNERSHIP_KEY, config);
