import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../guards/salla-auth.guard';
import { EmbedContext } from '../../modules/auth/types/embed-context.interface';

/**
 * Parameter decorator that extracts the authenticated embed context
 * (merchant_id / user_id) from the request.
 *
 * @example
 * @Get()
 * getProducts(@CurrentUser() context: EmbedContext) {
 *   return this.productsService.list(context.merchantId);
 * }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): EmbedContext => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
