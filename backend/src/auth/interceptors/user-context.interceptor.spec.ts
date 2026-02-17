import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { UserContextInterceptor } from './user-context.interceptor';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('UserContextInterceptor', () => {
  let interceptor: UserContextInterceptor;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockCallHandler: CallHandler = {
    handle: jest.fn(() => of('test')),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserContextInterceptor,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    interceptor = module.get<UserContextInterceptor>(UserContextInterceptor);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (user: any = null, isPublic = false): ExecutionContext => {
    mockReflector.getAllAndOverride.mockReturnValue(isPublic);

    const mockRequest = { user };
    const mockHandler = jest.fn();
    const mockClass = jest.fn();

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => mockHandler,
      getClass: () => mockClass,
    } as any;
  };

  describe('intercept', () => {
    it('should allow public endpoints without user context', (done) => {
      const context = createMockExecutionContext(null, true);

      const result = interceptor.intercept(context, mockCallHandler);

      expect(result).toBeDefined();
      result.subscribe(() => {
        expect(mockCallHandler.handle).toHaveBeenCalled();
        expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
          expect.any(Function),
          expect.any(Function),
        ]);
        done();
      });
    });

    it('should set user context for authenticated requests', (done) => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
      };

      const context = createMockExecutionContext(mockUser, false);
      const mockRequest = context.switchToHttp().getRequest();

      const result = interceptor.intercept(context, mockCallHandler);

      expect(result).toBeDefined();
      result.subscribe(() => {
        expect(mockCallHandler.handle).toHaveBeenCalled();
        expect(mockRequest.userId).toBe('user123');
        expect(mockRequest.userEmail).toBe('test@example.com');
        done();
      });
    });

    it('should throw UnauthorizedException when user is missing for protected endpoint', () => {
      const context = createMockExecutionContext(null, false);

      expect(() => {
        interceptor.intercept(context, mockCallHandler);
      }).toThrow(UnauthorizedException);

      expect(mockCallHandler.handle).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user.id is missing for protected endpoint', () => {
      const mockUser = {
        email: 'test@example.com',
        displayName: 'Test User',
        // id is missing
      };

      const context = createMockExecutionContext(mockUser, false);

      expect(() => {
        interceptor.intercept(context, mockCallHandler);
      }).toThrow(UnauthorizedException);

      expect(mockCallHandler.handle).not.toHaveBeenCalled();
    });

    it('should handle user with empty id for protected endpoint', () => {
      const mockUser = {
        id: '',
        email: 'test@example.com',
        displayName: 'Test User',
      };

      const context = createMockExecutionContext(mockUser, false);

      expect(() => {
        interceptor.intercept(context, mockCallHandler);
      }).toThrow(UnauthorizedException);

      expect(mockCallHandler.handle).not.toHaveBeenCalled();
    });
  });
});
