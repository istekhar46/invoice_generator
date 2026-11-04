import { BadRequestException } from '@nestjs/common';

export function validateInvoiceLogo(dataUrl?: string) {
  if (!dataUrl) return;
  const [prefix, encoded] = dataUrl.split(',');
  const image = Buffer.from(encoded || '', 'base64');
  const png =
    prefix === 'data:image/png;base64' &&
    image.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  const jpeg = prefix === 'data:image/jpeg;base64' && image[0] === 0xff && image[1] === 0xd8;
  if ((!png && !jpeg) || image.length > 256 * 1024)
    throw new BadRequestException('Use a PNG or JPEG logo smaller than 256 KB.');
}
