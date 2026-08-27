import { createParamDecorator, ExecutionContext } from '@nestjs/common';
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
export const CurrentUser = createParamDecorator(
  (data: keyof EmbedContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
