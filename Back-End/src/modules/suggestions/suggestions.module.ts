import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { LoggingModule } from '../logging/logging.module';
import { AdminSuggestionsController } from './admin-suggestions.controller';
import { SuggestionsController } from './suggestions.controller';
import { SuggestionsService } from './suggestions.service';

@Module({
  imports: [DrizzleModule, LoggingModule],
  controllers: [SuggestionsController, AdminSuggestionsController],
  providers: [SuggestionsService],
})
export class SuggestionsModule {}
