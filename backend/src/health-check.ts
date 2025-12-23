import * as http from 'http';

const options: http.RequestOptions = {
  hostname: 'localhost',
  port: process.env.PORT ?? 3001,
  path: '/health/ready',
  method: 'GET',
  timeout: 2000,
};

const req = http.request(options, (res: http.IncomingMessage) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
