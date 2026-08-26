import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { MerchantsService } from 'src/modules/merchants/merchants.service';

@Injectable()
export class MerchantExistsGuard implements CanActivate {
  // Now we inject the Service, NOT the Database!
  constructor(private readonly merchantsService: MerchantsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const merchantId = request.params.merchantId;

    if (!merchantId) return true;

    const merchant = await this.merchantsService.findByMerchantId(Number(merchantId));

    if (!merchant) {
      throw new NotFoundException(`Merchant not found`);
    }

    request.merchant = merchant;
    return true;
  }
}