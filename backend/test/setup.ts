import { config } from 'dotenv';
import { join } from 'path';

// Load test environment variables
config({ path: join(__dirname, '..', '.env.test') });

// Global test setup
beforeAll(() => {
  // Any global setup for tests
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Any global cleanup for tests
});

// Increase timeout for property-based tests
jest.setTimeout(30000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
