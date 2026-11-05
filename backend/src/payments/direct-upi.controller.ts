import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DirectUpiDetailsDto } from './direct-upi.dto';
import { DirectUpiService } from './direct-upi.service';

@ApiTags('Direct UPI')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('payments/upi')
export class DirectUpiController {
  constructor(private readonly upi: DirectUpiService) {}

  @Get('preferences')
  preferences(@CurrentUser('id') userId: string) {
    return this.upi.preferences(userId);
  }

  @Put('preferences')
  savePreferences(@CurrentUser('id') userId: string, @Body() data: DirectUpiDetailsDto) {
    return this.upi.savePreferences(userId, data);
  }

  @Delete('preferences')
  removePreferences(@CurrentUser('id') userId: string) {
    return this.upi.removePreferences(userId);
  }

  @Put('invoices/:id')
  enable(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() data: DirectUpiDetailsDto,
  ) {
    return this.upi.enable(userId, id, data);
  }

  @Delete('invoices/:id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.upi.remove(userId, id);
  }
}
