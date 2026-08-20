import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/roles.decorator';
import { EmbedContext } from '../../modules/auth/types/embed-context.interface';
import { AuthenticatedRequest } from './salla-auth.guard';

/**
 * Must be applied after SallaAuthGuard (which populates request.user).
 * Denies access with 403 if the authenticated context's role is not in
 * the @Roles() metadata declared on the handler or controller.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride(Roles, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator → route is accessible to any authenticated caller
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const callerRole = (user as EmbedContext & { role?: string }).role;

    if (!callerRole || !requiredRoles.includes(callerRole as never)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
