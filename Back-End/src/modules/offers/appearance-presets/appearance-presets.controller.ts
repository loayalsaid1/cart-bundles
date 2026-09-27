import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Post,
  Patch,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators';
import { paramIntId } from '../../../common/decorators';
import { AppearancePresetsService } from './appearance-presets.service';
import {
  CreateAppearancePresetDto,
  UpdateAppearancePresetDto,
} from './appearance-preset.dto';

@Controller('appearance-presets')
export class AppearancePresetsController {
  constructor(private readonly presets: AppearancePresetsService) {}

  @Get()
  list(@CurrentUser('merchantId') merchantId: number) {
    return this.presets.list(merchantId);
  }

  @Post()
  create(
    @CurrentUser('merchantId') merchantId: number,
    @Body() dto: CreateAppearancePresetDto,
  ) {
    return this.presets.create(merchantId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser('merchantId') merchantId: number,
    @paramIntId() id: number,
    @Body() dto: UpdateAppearancePresetDto,
  ) {
    const result = await this.presets.update(merchantId, id, dto);
    if (!result.success) {
      if (result.reason !== 'not_found') {
        throw new InternalServerErrorException(result.error);
      }
      throw new NotFoundException(`Preset ${id} not found`);
    }
    return result.data;
  }

  @Delete(':id')
  async remove(
    @CurrentUser('merchantId') merchantId: number,
    @paramIntId() id: number,
  ) {
    const result = await this.presets.delete(merchantId, id);
    if (!result.success) {
      if (result.reason !== 'not_found') {
        throw new InternalServerErrorException(result.error);
      }
      throw new NotFoundException(`Preset ${id} not found`);
    }
    return { ok: true };
  }
}
