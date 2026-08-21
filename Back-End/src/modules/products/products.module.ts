import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { MerchantsModule } from '../merchants/merchants.module';
import {
  ProductsController,
} from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [DrizzleModule, MerchantsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
