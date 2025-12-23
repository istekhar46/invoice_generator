import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Security middleware
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        imgSrc: [`'self'`, 'data:', 'https:'],
      },
    },
  }));

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Configure secure cookies
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // Trust first proxy for secure cookies in production
  }

  // Set global prefix for all routes
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 3001;

  // Setup Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Electrician Invoice API')
    .setDescription('A comprehensive backend API for the Electrician Invoice Generation Web Application. This API provides secure endpoints for user authentication, company profile management, customer management, and invoice generation with line items.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addTag('Users', 'User profile management endpoints')
    .addTag('Company', 'Company profile management endpoints')
    .addTag('Customers', 'Customer management endpoints')
    .addTag('Invoices', 'Invoice and line item management endpoints')
    .addTag('Health', 'System health check endpoints')
    .addServer(`http://localhost:${port}`, 'Development server')
    .addServer(`https://api.example.com`, 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Electrician Invoice API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #3b82f6 }
    `,
  });
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${String(port)}`);
  logger.log(`📚 API Documentation: http://localhost:${String(port)}/api/v1/docs`);
}

void bootstrap();
