import { BeneficiaryService } from '../beneficiary.service';
import prisma from '../../utils/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';

// Mock Prisma
jest.mock('../../utils/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    beneficiary: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('BeneficiaryService', () => {
  let beneficiaryService: BeneficiaryService;

  beforeEach(() => {
    beneficiaryService = new BeneficiaryService();
    jest.clearAllMocks();
  });

  describe('addBeneficiary', () => {
    const userId = 'user-123';
    const beneficiaryData = {
      beneficiaryId: 'beneficiary-123',
      nickname: 'Best Friend',
    };

    it('should add a beneficiary successfully', async () => {
      const mockBeneficiary = {
        id: 'beneficiary-rel-123',
        userId,
        beneficiaryId: beneficiaryData.beneficiaryId,
        nickname: beneficiaryData.nickname,
        createdAt: new Date(),
        beneficiary: {
          id: 'beneficiary-123',
          email: 'beneficiary@example.com',
        },
      };

      const expectedResult = {
        id: 'beneficiary-rel-123',
        beneficiaryId: beneficiaryData.beneficiaryId,
        email: 'beneficiary@example.com',
        nickname: beneficiaryData.nickname,
        createdAt: mockBeneficiary.createdAt,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: beneficiaryData.beneficiaryId,
      });
      (prisma.beneficiary.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.beneficiary.create as jest.Mock).mockResolvedValue(mockBeneficiary);

      const result = await beneficiaryService.addBeneficiary(userId, beneficiaryData);

      expect(result).toEqual(expectedResult);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: beneficiaryData.beneficiaryId },
        select: { id: true, email: true },
      });
    });

    it('should throw NotFoundError if beneficiary user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        beneficiaryService.addBeneficiary(userId, beneficiaryData)
      ).rejects.toThrow('Beneficiary user not found');
    });

    it('should throw ValidationError if beneficiary already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: beneficiaryData.beneficiaryId,
      });
      (prisma.beneficiary.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-beneficiary',
        userId,
        beneficiaryId: beneficiaryData.beneficiaryId,
      });

      await expect(
        beneficiaryService.addBeneficiary(userId, beneficiaryData)
      ).rejects.toThrow('Beneficiary already saved');
    });

    it('should throw ValidationError if trying to add self as beneficiary', async () => {
      const selfData = {
        beneficiaryId: userId, // Same as userId
        nickname: 'Myself',
      };

      await expect(
        beneficiaryService.addBeneficiary(userId, selfData)
      ).rejects.toThrow('Cannot add yourself as a beneficiary');
    });

    it('should throw ConflictError if nickname is already used for another beneficiary', async () => {
      const beneficiaryDataWithDuplicateNickname = {
        beneficiaryId: 'beneficiary-456',
        nickname: 'Best Friend',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: beneficiaryDataWithDuplicateNickname.beneficiaryId,
      });
      // First findUnique call checks if relationship exists (should return null)
      // Second findUnique call checks if nickname exists (should return existing)
      (prisma.beneficiary.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // Relationship doesn't exist yet
        .mockResolvedValueOnce({ // But nickname is already used
          id: 'existing-beneficiary',
          userId,
          beneficiaryId: 'beneficiary-123',
          nickname: 'Best Friend',
        });

      await expect(
        beneficiaryService.addBeneficiary(userId, beneficiaryDataWithDuplicateNickname)
      ).rejects.toThrow('Nickname "Best Friend" is already used for another beneficiary');
    });
  });

  describe('getBeneficiaries', () => {
    const userId = 'user-123';

    it('should return paginated beneficiaries', async () => {
      const mockBeneficiaries = [
        {
          id: 'beneficiary-rel-1',
          userId,
          beneficiaryId: 'beneficiary-1',
          nickname: 'Friend 1',
          createdAt: new Date(),
          beneficiary: {
            id: 'beneficiary-1',
            email: 'friend1@example.com',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
        {
          id: 'beneficiary-rel-2',
          userId,
          beneficiaryId: 'beneficiary-2',
          nickname: 'Friend 2',
          createdAt: new Date(),
          beneficiary: {
            id: 'beneficiary-2',
            email: 'friend2@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
          },
        },
      ];

      const expectedData = [
        {
          id: 'beneficiary-rel-1',
          beneficiaryId: 'beneficiary-1',
          email: 'friend1@example.com',
          firstName: 'John',
          lastName: 'Doe',
          nickname: 'Friend 1',
          createdAt: mockBeneficiaries[0].createdAt,
        },
        {
          id: 'beneficiary-rel-2',
          beneficiaryId: 'beneficiary-2',
          email: 'friend2@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          nickname: 'Friend 2',
          createdAt: mockBeneficiaries[1].createdAt,
        },
      ];

      (prisma.beneficiary.findMany as jest.Mock).mockResolvedValue(mockBeneficiaries);
      (prisma.beneficiary.count as jest.Mock).mockResolvedValue(15);

      const result = await beneficiaryService.getBeneficiaries(userId, 1, 10);

      expect(result.data).toEqual(expectedData);
      expect(result.meta).toEqual({
        total: 15,
        page: 1,
        limit: 10,
        pages: 2,
      });
    });

    it('should handle empty beneficiary list', async () => {
      (prisma.beneficiary.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.beneficiary.count as jest.Mock).mockResolvedValue(0);

      const result = await beneficiaryService.getBeneficiaries(userId, 1, 10);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.pages).toBe(0);
    });

    it('should calculate correct pagination for page 2', async () => {
      (prisma.beneficiary.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.beneficiary.count as jest.Mock).mockResolvedValue(25);

      const result = await beneficiaryService.getBeneficiaries(userId, 2, 10);

      expect(result.meta.page).toBe(2);
      expect(result.meta.pages).toBe(3);
      expect(prisma.beneficiary.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page - 1) * limit
          take: 10,
        })
      );
    });

    it('should search beneficiaries by nickname', async () => {
      const mockBeneficiaries = [
        {
          id: 'beneficiary-rel-1',
          userId,
          beneficiaryId: 'beneficiary-1',
          nickname: 'Best Friend',
          createdAt: new Date(),
          beneficiary: {
            id: 'beneficiary-1',
            email: 'friend@example.com',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      ];

      (prisma.beneficiary.findMany as jest.Mock).mockResolvedValue(mockBeneficiaries);
      (prisma.beneficiary.count as jest.Mock).mockResolvedValue(1);

      const result = await beneficiaryService.getBeneficiaries(userId, 1, 10, 'Best');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].nickname).toBe('Best Friend');
      expect(prisma.beneficiary.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            OR: expect.any(Array),
          }),
        })
      );
    });

    it('should search beneficiaries by email', async () => {
      const mockBeneficiaries = [
        {
          id: 'beneficiary-rel-1',
          userId,
          beneficiaryId: 'beneficiary-1',
          nickname: 'Friend',
          createdAt: new Date(),
          beneficiary: {
            id: 'beneficiary-1',
            email: 'john@example.com',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      ];

      (prisma.beneficiary.findMany as jest.Mock).mockResolvedValue(mockBeneficiaries);
      (prisma.beneficiary.count as jest.Mock).mockResolvedValue(1);

      const result = await beneficiaryService.getBeneficiaries(userId, 1, 10, 'john@');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe('john@example.com');
    });
  });

  describe('removeBeneficiary', () => {
    const userId = 'user-123';
    const beneficiaryId = 'beneficiary-rel-123';

    it('should remove beneficiary successfully', async () => {
      const mockBeneficiary = {
        id: beneficiaryId,
        userId,
        beneficiaryId: 'beneficiary-user-123',
        nickname: 'Friend',
      };

      (prisma.beneficiary.findUnique as jest.Mock).mockResolvedValue(mockBeneficiary);
      (prisma.beneficiary.delete as jest.Mock).mockResolvedValue(mockBeneficiary);

      await beneficiaryService.removeBeneficiary(userId, beneficiaryId);

      expect(prisma.beneficiary.delete).toHaveBeenCalledWith({
        where: { id: beneficiaryId },
      });
    });

    it('should throw NotFoundError if beneficiary not found', async () => {
      (prisma.beneficiary.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        beneficiaryService.removeBeneficiary(userId, beneficiaryId)
      ).rejects.toThrow('Beneficiary not found');
    });
  });

  describe('updateNickname', () => {
    const userId = 'user-123';
    const beneficiaryId = 'beneficiary-rel-123';
    const newNickname = 'Updated Nickname';

    it('should update nickname successfully', async () => {
      const mockBeneficiary = {
        id: beneficiaryId,
        userId,
        beneficiaryId: 'beneficiary-user-123',
        nickname: 'Old Nickname',
      };

      const updatedBeneficiary = {
        ...mockBeneficiary,
        nickname: newNickname,
        beneficiary: {
          id: 'beneficiary-user-123',
          email: 'beneficiary@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      // First findUnique call checks if beneficiary relationship exists
      // Second findUnique call checks if new nickname is already used
      (prisma.beneficiary.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockBeneficiary)
        .mockResolvedValueOnce(null); // New nickname not used by another beneficiary
      (prisma.beneficiary.update as jest.Mock).mockResolvedValue(updatedBeneficiary);

      const result = await beneficiaryService.updateNickname(userId, beneficiaryId, newNickname);

      expect(result.nickname).toBe(newNickname);
      expect(result.email).toBe('beneficiary@example.com');
    });

    it('should throw NotFoundError if beneficiary not found', async () => {
      (prisma.beneficiary.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        beneficiaryService.updateNickname(userId, beneficiaryId, newNickname)
      ).rejects.toThrow('Beneficiary not found');
    });

    it('should throw ConflictError if new nickname is already used for another beneficiary', async () => {
      const mockBeneficiary = {
        id: beneficiaryId,
        userId,
        beneficiaryId: 'beneficiary-user-123',
        nickname: 'Old Nickname',
      };

      const existingBeneficiaryWithSameNickname = {
        id: 'different-beneficiary-id',
        userId,
        beneficiaryId: 'beneficiary-user-456',
        nickname: newNickname,
      };

      // First findUnique call checks if beneficiary relationship exists
      // Second findUnique call checks if new nickname is already used
      (prisma.beneficiary.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockBeneficiary)
        .mockResolvedValueOnce(existingBeneficiaryWithSameNickname);

      await expect(
        beneficiaryService.updateNickname(userId, beneficiaryId, newNickname)
      ).rejects.toThrow(`Nickname "${newNickname}" is already used for another beneficiary`);
    });
  });
});
