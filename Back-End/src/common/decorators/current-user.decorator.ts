import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../guards/salla-auth.guard';
import { EmbedContext } from '../../modules/auth/types/embed-context.interface';

/**
 * Parameter decorator that extracts the authenticated embed context
 * (or a specific field from it) from the request.
 *
 * @example
 * // Full context
 * @Get()
 * list(@CurrentUser() user: EmbedContext) { ... }
 *
 * // Single field — @CurrentUser('merchantId') returns a number
 * @Get()
 * list(@CurrentUser('merchantId') merchantId: number) { ... }
 */
export function requireMerchantId(user: EmbedContext): number {
  if (user.merchantId == null) {
    throw new UnauthorizedException('Missing merchant context');
  }
  return user.merchantId;
}

export const CurrentUser = createParamDecorator(
  (data: keyof EmbedContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!data) return user;
    const value = user?.[data];
    if (data === 'merchantId' && value == null) {
      throw new UnauthorizedException('Missing merchant context');
    }
    return value;
  },
);
