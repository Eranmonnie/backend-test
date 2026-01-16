import { AuthService } from '../auth.service';
import prisma from '../../utils/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ConflictError, UnauthorizedError } from '../../utils/errors';

// Mock dependencies
jest.mock('../../utils/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    tokenBlacklist: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        pin: '1234',
      };

      const hashedPassword = 'hashed_password';
      const hashedPin = 'hashed_pin';
      const mockUser = {
        id: 'user-123',
        email: registerData.email,
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        password: hashedPassword,
        pin: hashedPin,
        createdAt: new Date(),
        updatedAt: new Date(),
        wallet: {
          id: 'wallet-123',
          userId: 'user-123',
          balance: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock)
        .mockResolvedValueOnce(hashedPassword)
        .mockResolvedValueOnce(hashedPin);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock).mockReturnValue('mock-access-token');

      const result = await authService.register(registerData);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerData.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 10);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerData.pin, 10);
      expect(result.user).toHaveProperty('id', 'user-123');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw ConflictError if user already exists', async () => {
      const registerData = {
        email: 'existing@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        pin: '1234',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: registerData.email,
      });

      await expect(authService.register(registerData)).rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    it('should login user successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-123',
        email: loginData.email,
        firstName: 'John',
        lastName: 'Doe',
        password: 'hashed_password',
        pin: 'hashed_pin',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mock-access-token');

      const result = await authService.login(loginData);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginData.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toHaveProperty('id', 'user-123');
    });

    it('should throw UnauthorizedError if user not found', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedError if password is incorrect', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: 'user-123',
        email: loginData.email,
        password: 'hashed_password',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new access token with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockTokenRecord = {
        id: 'token-123',
        token: refreshToken,
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        revoked: false,
        createdAt: new Date(),
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockTokenRecord);
      (jwt.sign as jest.Mock).mockReturnValue('new-access-token');

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: refreshToken },
        include: { user: true },
      });
    });

    it('should throw UnauthorizedError if refresh token is invalid', async () => {
      const refreshToken = 'invalid-refresh-token';

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.refreshAccessToken(refreshToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw UnauthorizedError if refresh token is expired', async () => {
      const refreshToken = 'expired-refresh-token';
      const mockTokenRecord = {
        id: 'token-123',
        token: refreshToken,
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 1000), // Expired
        revoked: false,
        createdAt: new Date(),
      };

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockTokenRecord);
      (prisma.refreshToken.delete as jest.Mock).mockResolvedValue(mockTokenRecord);

      await expect(authService.refreshAccessToken(refreshToken)).rejects.toThrow('Refresh token expired');
      expect(prisma.refreshToken.delete).toHaveBeenCalled();
    });

    it('should throw UnauthorizedError if refresh token is revoked', async () => {
      const refreshToken = 'revoked-refresh-token';
      const mockTokenRecord = {
        id: 'token-123',
        token: refreshToken,
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: true,
        createdAt: new Date(),
      };

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockTokenRecord);

      await expect(authService.refreshAccessToken(refreshToken)).rejects.toThrow('Refresh token has been revoked');
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke refresh token successfully and blacklist access token', async () => {
      const refreshToken = 'valid-refresh-token';
      const accessToken = 'valid-access-token';
      const mockTokenRecord = {
        id: 'token-123',
        token: refreshToken,
        userId: 'user-123',
        expiresAt: new Date(),
        revoked: false,
        createdAt: new Date(),
      };

      const mockDecodedToken = {
        userId: 'user-123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      };

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockTokenRecord);
      (prisma.refreshToken.update as jest.Mock).mockResolvedValue({
        ...mockTokenRecord,
        revoked: true,
      });
      (jwt.decode as jest.Mock).mockReturnValue(mockDecodedToken);
      (prisma.tokenBlacklist.create as jest.Mock).mockResolvedValue({
        id: 'blacklist-123',
        token: accessToken,
        userId: 'user-123',
        expiresAt: new Date(mockDecodedToken.exp * 1000),
        createdAt: new Date(),
      });

      const result = await authService.revokeRefreshToken(refreshToken, accessToken);

      expect(result).toHaveProperty('message', 'Logged out successfully');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: mockTokenRecord.id },
        data: { revoked: true },
      });
      expect(prisma.tokenBlacklist.create).toHaveBeenCalledWith({
        data: {
          token: accessToken,
          userId: 'user-123',
          expiresAt: new Date(mockDecodedToken.exp * 1000),
        },
      });
    });

    it('should throw UnauthorizedError if token not found', async () => {
      const refreshToken = 'invalid-token';
      const accessToken = 'some-access-token';

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.revokeRefreshToken(refreshToken, accessToken)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('revokeAllRefreshTokens', () => {
    it('should revoke all refresh tokens for a user and blacklist access token', async () => {
      const userId = 'user-123';
      const accessToken = 'valid-access-token';

      const mockDecodedToken = {
        userId: 'user-123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 86400,
      };

      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
      (jwt.decode as jest.Mock).mockReturnValue(mockDecodedToken);
      (prisma.tokenBlacklist.create as jest.Mock).mockResolvedValue({
        id: 'blacklist-123',
        token: accessToken,
        userId,
        expiresAt: new Date(mockDecodedToken.exp * 1000),
        createdAt: new Date(),
      });

      const result = await authService.revokeAllRefreshTokens(userId, accessToken);

      expect(result).toHaveProperty('message', 'Logged out from all devices');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId, revoked: false },
        data: { revoked: true },
      });
      expect(prisma.tokenBlacklist.create).toHaveBeenCalledWith({
        data: {
          token: accessToken,
          userId,
          expiresAt: new Date(mockDecodedToken.exp * 1000),
        },
      });
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired blacklisted tokens', async () => {
      (prisma.tokenBlacklist.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      await authService.cleanupExpiredTokens();

      expect(prisma.tokenBlacklist.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });
});
