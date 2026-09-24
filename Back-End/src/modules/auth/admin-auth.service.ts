import { Injectable, UnauthorizedException } from '@nestjs/common';
import { verifyPassword } from '../../common/utils/password';
import { UsersService } from './users.service';

@Injectable()
export class AdminAuthService {
  constructor(private readonly usersService: UsersService) {}

  async login(email: string, password: string): Promise<{ userId: number }> {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.role !== 'admin') {
      throw new UnauthorizedException('Invalid admin credentials');
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid admin credentials');
    }
    return { userId: user.id };
  }
}
