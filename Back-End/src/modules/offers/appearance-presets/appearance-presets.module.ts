import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../../database/drizzle.module';
import { AppearancePresetsController } from './appearance-presets.controller';
import { AppearancePresetsService } from './appearance-presets.service';

@Module({
  imports: [DrizzleModule],
  controllers: [AppearancePresetsController],
  providers: [AppearancePresetsService],
})
export class AppearancePresetsModule {}
