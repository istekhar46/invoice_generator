import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';
@Module({
  imports: [DatabaseModule],
  controllers: [QuoteController],
  providers: [QuoteService],
  exports: [QuoteService],
})
// Nest registers modules through decorated classes.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class QuoteModule {}
