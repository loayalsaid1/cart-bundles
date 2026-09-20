import { UnauthorizedException } from '@nestjs/common';
import { hashPassword } from '../../common/utils/password';
import { AdminAuthService } from './admin-auth.service';

describe('AdminAuthService', () => {
  const findByEmail = jest.fn();
  const usersService = { findByEmail };
  const service = new AdminAuthService(usersService as never);

  beforeEach(() => {
    findByEmail.mockReset();
  });

  it('rejects unknown email', async () => {
    findByEmail.mockResolvedValue(null);

    await expect(
      service.login('nobody@example.com', 'password1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.login('nobody@example.com', 'password1'),
    ).rejects.toThrow('Invalid admin credentials');
  });

  it('rejects the wrong password', async () => {
    findByEmail.mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      role: 'admin',
      passwordHash: await hashPassword('correct-horse'),
    });

    await expect(
      service.login('admin@example.com', 'wrong-password'),
    ).rejects.toThrow('Invalid admin credentials');
  });

  it('returns userId for a matching admin hash', async () => {
    findByEmail.mockResolvedValue({
      id: 42,
      email: 'admin@example.com',
      role: 'admin',
      passwordHash: await hashPassword('correct-horse'),
    });

    await expect(
      service.login('admin@example.com', 'correct-horse'),
    ).resolves.toEqual({ userId: 42 });
  });

  it('rejects a non-admin role', async () => {
    findByEmail.mockResolvedValue({
      id: 7,
      email: 'staff@example.com',
      role: 'merchant',
      passwordHash: await hashPassword('correct-horse'),
    });

    await expect(
      service.login('staff@example.com', 'correct-horse'),
    ).rejects.toThrow('Invalid admin credentials');
  });
});
