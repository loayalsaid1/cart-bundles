import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { AuthService, TOKEN_EXPIRED_ERROR } from '../../modules/auth/auth.service';
import { EmbedContext } from '../../modules/auth/types/embed-context.interface';
import { IS_PUBLIC_KEY } from '../decorators/is-public.decorator';

/** Extend express Request so TypeScript knows about the attached embed context */
export interface AuthenticatedRequest extends Request {
  user: EmbedContext;
}

@Injectable()
export class SallaAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();

    const token =
      this.extractBearerToken(request) ?? this.extractEmbedTokenCookie(request);

    if (!token) {
      throw new UnauthorizedException('Missing embed access token');
    }

    // Verify the local JWT and attach merchant/user context to the request
    const result = this.authService.verifyEmbedToken(token);
    if (!result.success) {
      if (result.error == TOKEN_EXPIRED_ERROR) {
        const response = context.switchToHttp().getResponse<Response>();
        response.clearCookie('embedToken');
      }
      throw new UnauthorizedException(result.error);
    }

    (request as AuthenticatedRequest).user = result.data;
    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) return null;
    return authHeader.split(" ")[1];
  }

  private extractEmbedTokenCookie(request: Request): string | null {
    const embedToken = request.cookies['embedToken'];
    if (!embedToken) return null;
    return embedToken;
  }
}
