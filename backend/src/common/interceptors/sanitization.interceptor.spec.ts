import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { SanitizationInterceptor } from './sanitization.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('SanitizationInterceptor', () => {
  let interceptor: SanitizationInterceptor;
  let reflector: Reflector;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SanitizationInterceptor,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<SanitizationInterceptor>(SanitizationInterceptor);
    reflector = module.get<Reflector>(Reflector);

    mockRequest = {
      body: {},
      query: {},
      params: {},
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of('test')),
    };
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('when sanitization is enabled', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    });

    it('should sanitize script tags from request body', () => {
      mockRequest.body = {
        name: 'Test <script>alert("xss")</script> Name',
        description: 'Safe description',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.name).toBe('Test Name');
      expect(mockRequest.body.description).toBe('Safe description');
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should sanitize iframe tags from request body', () => {
      mockRequest.body = {
        content: 'Test <iframe src="malicious.com"></iframe> content',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.content).toBe('Test content');
    });

    it('should sanitize javascript protocols', () => {
      mockRequest.body = {
        url: 'javascript:alert("xss")',
        link: 'vbscript:malicious()',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.url).toBe('alert("xss")');
      expect(mockRequest.body.link).toBe('malicious()');
    });

    it('should sanitize event handlers', () => {
      mockRequest.body = {
        html: '<div onclick="malicious()">Click me</div>',
        content: '<img onload="steal()" src="image.jpg">',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.html).toBe('<div >Click me</div>');
      expect(mockRequest.body.content).toBe('<img src="image.jpg">');
    });

    it('should sanitize nested objects', () => {
      mockRequest.body = {
        user: {
          name: 'Test <script>alert("xss")</script> User',
          profile: {
            bio: 'Bio with <iframe></iframe> content',
          },
        },
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.user.name).toBe('Test User');
      expect(mockRequest.body.user.profile.bio).toBe('Bio with content');
    });

    it('should sanitize arrays', () => {
      mockRequest.body = {
        items: [
          'Safe item',
          'Item with <script>alert("xss")</script>',
          { name: 'Object with <iframe></iframe>' },
        ],
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.items[0]).toBe('Safe item');
      expect(mockRequest.body.items[1]).toBe('Item with');
      expect(mockRequest.body.items[2].name).toBe('Object with');
    });

    it('should sanitize query parameters', () => {
      mockRequest.query = {
        search: 'test <script>alert("xss")</script>',
        filter: 'safe filter',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.query.search).toBe('test');
      expect(mockRequest.query.filter).toBe('safe filter');
    });

    it('should sanitize route parameters', () => {
      mockRequest.params = {
        id: 'safe-id',
        name: 'name<script>alert("xss")</script>',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.params.id).toBe('safe-id');
      expect(mockRequest.params.name).toBe('name');
    });

    it('should handle non-string values correctly', () => {
      mockRequest.body = {
        number: 123,
        boolean: true,
        nullValue: null,
        undefinedValue: undefined,
        date: new Date(),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.number).toBe(123);
      expect(mockRequest.body.boolean).toBe(true);
      expect(mockRequest.body.nullValue).toBe(null);
      expect(mockRequest.body.undefinedValue).toBe(undefined);
      expect(mockRequest.body.date).toBeInstanceOf(Date);
    });
  });

  describe('when sanitization is disabled', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    });

    it('should not sanitize input when sanitization is disabled', () => {
      const originalBody = {
        name: 'Test <script>alert("xss")</script> Name',
      };
      mockRequest.body = { ...originalBody };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body).toEqual(originalBody);
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('when sanitization metadata is not set', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    });

    it('should not sanitize input when metadata is undefined', () => {
      const originalBody = {
        name: 'Test <script>alert("xss")</script> Name',
      };
      mockRequest.body = { ...originalBody };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body).toEqual(originalBody);
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });
});
