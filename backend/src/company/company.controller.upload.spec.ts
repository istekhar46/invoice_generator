import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import * as request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

// Exercise the real Nest FileInterceptor/ParseFilePipe with the patched Multer.
// Only auth and external storage are replaced; multipart parsing remains real.
describe('Company logo multipart integration', () => {
  let app: INestApplication<Server>;
  let server: Server;
  const uploadLogo = jest.fn<
    ReturnType<CompanyService['uploadLogo']>,
    Parameters<CompanyService['uploadLogo']>
  >();
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB', 'base64');

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [{ provide: CompanyService, useValue: { uploadLogo } }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          context.switchToHttp().getRequest<{ user: { id: string; email: string } }>().user = {
            id: 'upload-owner',
            email: 'upload-owner@invoiceo.test',
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    server = app.getHttpServer();
  });

  beforeEach(() => {
    uploadLogo.mockResolvedValue('https://example.com/logo.png');
  });

  afterAll(async () => app.close());

  it('passes the uploaded file and authenticated owner to storage', async () => {
    const response = await request(server)
      .post('/api/v1/company/profile/logo')
      .attach('logo', image, { filename: 'logo.png', contentType: 'image/png' })
      .expect(201);
    expect(response.body).toEqual({ logoUrl: 'https://example.com/logo.png' });
    expect(uploadLogo).toHaveBeenCalledWith(
      'upload-owner',
      expect.objectContaining({
        fieldname: 'logo',
        originalname: 'logo.png',
        mimetype: 'image/png',
        buffer: image,
      }),
    );
  });

  it('rejects a file over the existing 5 MiB limit before storage', async () => {
    await request(server)
      .post('/api/v1/company/profile/logo')
      .attach('logo', Buffer.alloc(5 * 1024 * 1024 + 1), 'large.png')
      .expect(400);
    expect(uploadLogo).not.toHaveBeenCalled();
  });

  it('rejects an unexpected file field before storage', async () => {
    await request(server)
      .post('/api/v1/company/profile/logo')
      .attach('attachment', image, 'logo.png')
      .expect(400);
    expect(uploadLogo).not.toHaveBeenCalled();
  });

  it('rejects a missing file before storage', async () => {
    await request(server).post('/api/v1/company/profile/logo').expect(400);
    expect(uploadLogo).not.toHaveBeenCalled();
  });

  it('rejects an incomplete multipart body without breaking subsequent uploads', async () => {
    await request(server)
      .post('/api/v1/company/profile/logo')
      .set('Content-Type', 'multipart/form-data; boundary=incomplete')
      .send('--incomplete\r\nContent-Disposition: form-data; name="logo"; filename="logo.png"\r\n')
      .expect(400);
    expect(uploadLogo).not.toHaveBeenCalled();
    await request(server)
      .post('/api/v1/company/profile/logo')
      .attach('logo', image, { filename: 'logo.png', contentType: 'image/png' })
      .expect(201);
  });
});
