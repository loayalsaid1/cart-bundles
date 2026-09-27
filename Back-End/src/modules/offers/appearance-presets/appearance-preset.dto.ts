import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  appearancePresetKindEnum,
  appearanceShadowEnum,
  titleAlignEnum,
} from '../../../database/schema';
import type {
  AppearancePresetKind,
  AppearanceShadow,
  TitleAlign,
} from '../types/offers.types';

export class CreateAppearancePresetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsEnum(appearancePresetKindEnum.enumValues)
  kind: AppearancePresetKind;

  @IsObject()
  colors: Record<string, string>;

  @ValidateIf((o: CreateAppearancePresetDto) => o.kind === 'full')
  @IsNumber()
  borderRadiusPx?: number;

  @ValidateIf((o: CreateAppearancePresetDto) => o.kind === 'full')
  @IsEnum(titleAlignEnum.enumValues)
  titleAlign?: TitleAlign;

  @ValidateIf((o: CreateAppearancePresetDto) => o.kind === 'full')
  @IsBoolean()
  showBorder?: boolean;

  @ValidateIf((o: CreateAppearancePresetDto) => o.kind === 'full')
  @IsEnum(appearanceShadowEnum.enumValues)
  shadow?: AppearanceShadow;
}

export class UpdateAppearancePresetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @IsOptional()
  name?: string;
}
