import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { AdminSuggestionsController } from './admin-suggestions.controller';
import { SuggestionsController } from './suggestions.controller';
import { SuggestionsService } from './suggestions.service';

@Module({
  imports: [DrizzleModule, ActivityLogModule],
  controllers: [SuggestionsController, AdminSuggestionsController],
  providers: [SuggestionsService],
})
export class SuggestionsModule {}
