import { SetMetadata } from '@nestjs/common';

export const SANITIZE_KEY = 'sanitize';
export const Sanitize = () => SetMetadata(SANITIZE_KEY, true);
