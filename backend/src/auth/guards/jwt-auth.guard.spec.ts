import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as fc from 'fast-check';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('Property 7: Authentication guard protection', () => {
    /**
     * Feature: invoice-backend-api, Property 7: Authentication guard protection
     * Validates: Requirements 3.7
     */
    it('should allow access to public endpoints regardless of authentication', () => {
      fc.assert(
        fc.property(
          fc.record({
            isPublic: fc.constant(true),
            hasUser: fc.boolean(),
            userInfo: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
              displayName: fc.string({ minLength: 1, maxLength: 100 }),
            }),
          }),
          (testData) => {
            // Mock reflector to return public status
            (reflector.getAllAndOverride as jest.Mock).mockReturnValue(testData.isPublic);

            // Create mock execution context
            const mockContext = {
              getHandler: jest.fn(),
              getClass: jest.fn(),
              switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue({
                  user: testData.hasUser ? testData.userInfo : undefined,
                }),
              }),
            } as unknown as ExecutionContext;

            // Test canActivate for public endpoints
            const result = guard.canActivate(mockContext);

            // Public endpoints should always return true
            expect(result).toBe(true);

            // Verify reflector was called correctly
            expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
              mockContext.getHandler(),
              mockContext.getClass(),
            ]);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should protect private endpoints and require authentication', () => {
      fc.assert(
        fc.property(
          fc.record({
            isPublic: fc.constant(false),
            hasValidUser: fc.boolean(),
            userInfo: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
              displayName: fc.string({ minLength: 1, maxLength: 100 }),
            }),
          }),
          (testData) => {
            // Mock reflector to return non-public status
            (reflector.getAllAndOverride as jest.Mock).mockReturnValue(testData.isPublic);

            // Create mock execution context
            const mockContext = {
              getHandler: jest.fn(),
              getClass: jest.fn(),
              switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue({
                  user: testData.hasValidUser ? testData.userInfo : undefined,
                }),
              }),
            } as unknown as ExecutionContext;

            // Mock the parent canActivate method
            const originalCanActivate = Object.getPrototypeOf(
              Object.getPrototypeOf(guard),
            ).canActivate;
            const mockParentCanActivate = jest.fn().mockReturnValue(testData.hasValidUser);
            Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = mockParentCanActivate;

            try {
              // Test canActivate for protected endpoints
              const result = guard.canActivate(mockContext);

              // Should delegate to parent guard for protected endpoints
              expect(mockParentCanActivate).toHaveBeenCalledWith(mockContext);
              expect(result).toBe(testData.hasValidUser);

              // Verify reflector was called correctly
              expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
                mockContext.getHandler(),
                mockContext.getClass(),
              ]);
            } finally {
              // Restore original method
              Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = originalCanActivate;
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle authentication errors consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            hasError: fc.boolean(),
            hasUser: fc.boolean(),
            errorMessage: fc.string({ minLength: 1, maxLength: 100 }),
            userInfo: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
              displayName: fc.string({ minLength: 1, maxLength: 100 }),
            }),
          }),
          (testData) => {
            const error = testData.hasError ? new Error(testData.errorMessage) : null;
            const user = testData.hasUser ? testData.userInfo : null;

            if (testData.hasError || !testData.hasUser) {
              // Should throw UnauthorizedException for errors or missing user
              expect(() => {
                guard.handleRequest(error, user, null);
              }).toThrow(UnauthorizedException);

              if (testData.hasError) {
                expect(() => {
                  guard.handleRequest(error, user, null);
                }).toThrow(testData.errorMessage);
              } else {
                expect(() => {
                  guard.handleRequest(error, user, null);
                }).toThrow('Authentication required');
              }
            } else {
              // Should return user for successful authentication
              const result = guard.handleRequest(error, user, null);
              expect(result).toEqual(testData.userInfo);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
