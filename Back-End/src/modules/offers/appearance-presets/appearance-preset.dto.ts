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

export class CreateAppearancePresetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsEnum(['colors', 'full'])
  kind: 'colors' | 'full';

  @IsObject()
  colors: Record<string, string>;

  @ValidateIf((o: CreateAppearancePresetDto) => o.kind === 'full')
  @IsNumber()
  borderRadiusPx?: number;

  @ValidateIf((o: CreateAppearancePresetDto) => o.kind === 'full')
  @IsEnum(['start', 'center', 'end'])
  titleAlign?: 'start' | 'center' | 'end';

  @ValidateIf((o: CreateAppearancePresetDto) => o.kind === 'full')
  @IsBoolean()
  showBorder?: boolean;

  @ValidateIf((o: CreateAppearancePresetDto) => o.kind === 'full')
  @IsEnum(['none', 'sm', 'md', 'lg'])
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}

export class UpdateAppearancePresetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @IsOptional()
  name?: string;
}
