import { DonationService } from '../donation.service';
import prisma from '../../utils/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { emailService } from '../email.service';

// Mock dependencies
jest.mock('../../utils/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    donation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
jest.mock('../email.service');

describe('DonationService', () => {
  let donationService: DonationService;

  beforeEach(() => {
    donationService = new DonationService();
    jest.clearAllMocks();
  });

  describe('makeDonation', () => {
    const mockDonor = {
      id: 'donor-123',
      email: 'donor@example.com',
      firstName: 'John',
      lastName: 'Donor',
      wallet: {
        id: 'wallet-donor',
        balance: 10000,
      },
    };

    const mockBeneficiary = {
      id: 'beneficiary-123',
      email: 'beneficiary@example.com',
      firstName: 'Jane',
      lastName: 'Recipient',
      wallet: {
        id: 'wallet-beneficiary',
        balance: 5000,
      },
    };

    const donationData = {
      beneficiaryId: 'beneficiary-123',
      amount: 1000,
      pin: '1234',
    };

    it('should create a donation successfully', async () => {
      const mockDonation = {
        id: 'donation-123',
        donorId: mockDonor.id,
        beneficiaryId: mockBeneficiary.id,
        amount: donationData.amount,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockDonor) // donor
        .mockResolvedValueOnce(mockBeneficiary); // beneficiary

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          wallet: {
            update: jest.fn().mockResolvedValue({}),
          },
          donation: {
            create: jest.fn().mockResolvedValue(mockDonation),
          },
          transaction: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      (prisma.donation.count as jest.Mock).mockResolvedValue(1);

      const result = await donationService.makeDonation(mockDonor.id, donationData);

      expect(result).toEqual(mockDonation);
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundError if donor not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        donationService.makeDonation('invalid-donor', donationData)
      ).rejects.toThrow('Donor not found');
    });

    it('should throw ValidationError if insufficient funds', async () => {
      const poorDonor = {
        ...mockDonor,
        wallet: { ...mockDonor.wallet, balance: 100 },
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(poorDonor);

      await expect(
        donationService.makeDonation(poorDonor.id, donationData)
      ).rejects.toThrow('Insufficient funds');
    });

    it('should throw NotFoundError if beneficiary not found', async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockDonor)
        .mockResolvedValueOnce(null);

      await expect(
        donationService.makeDonation(mockDonor.id, donationData)
      ).rejects.toThrow('Beneficiary not found');
    });

    it('should throw ValidationError if trying to donate to self', async () => {
      const selfDonationData = {
        beneficiaryId: mockDonor.id,
        amount: 1000,
        pin: '1234',
      };

      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockDonor)
        .mockResolvedValueOnce(mockDonor);

      await expect(
        donationService.makeDonation(mockDonor.id, selfDonationData)
      ).rejects.toThrow('Cannot donate to yourself');
    });

    it('should send thank you email at milestone (2nd donation)', async () => {
      const mockDonation = {
        id: 'donation-123',
        donorId: mockDonor.id,
        beneficiaryId: mockBeneficiary.id,
        amount: donationData.amount,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockDonor)
        .mockResolvedValueOnce(mockBeneficiary);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          wallet: { update: jest.fn() },
          donation: { create: jest.fn().mockResolvedValue(mockDonation) },
          transaction: { create: jest.fn() },
        };
        return callback(tx);
      });

      (prisma.donation.count as jest.Mock).mockResolvedValue(2); // 2nd donation
      (emailService.sendThankYouEmail as jest.Mock).mockResolvedValue(undefined);

      await donationService.makeDonation(mockDonor.id, donationData);

      expect(emailService.sendThankYouEmail).toHaveBeenCalledWith(
        mockDonor.email,
        mockBeneficiary.firstName,
        mockDonor.firstName,
        2
      );
    });

    it('should not send email for non-milestone donations', async () => {
      const mockDonation = {
        id: 'donation-123',
        donorId: mockDonor.id,
        beneficiaryId: mockBeneficiary.id,
        amount: donationData.amount,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockDonor)
        .mockResolvedValueOnce(mockBeneficiary);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          wallet: { update: jest.fn() },
          donation: { create: jest.fn().mockResolvedValue(mockDonation) },
          transaction: { create: jest.fn() },
        };
        return callback(tx);
      });

      (prisma.donation.count as jest.Mock).mockResolvedValue(3); // 3rd donation (not a milestone)

      await donationService.makeDonation(mockDonor.id, donationData);

      expect(emailService.sendThankYouEmail).not.toHaveBeenCalled();
    });
  });

  describe('getDonations', () => {
    it('should return paginated donations for donor', async () => {
      const userId = 'user-123';
      const mockDonations = [
        {
          id: 'donation-1',
          donorId: userId,
          beneficiaryId: 'beneficiary-1',
          amount: 1000,
          createdAt: new Date(),
          donor: { email: 'donor@example.com', firstName: 'John', lastName: 'Doe' },
        },
      ];

      (prisma.donation.findMany as jest.Mock).mockResolvedValue(mockDonations);
      (prisma.donation.count as jest.Mock).mockResolvedValue(15);

      const result = await donationService.getDonations(userId, true, 1, 10);

      expect(result.data).toEqual(mockDonations);
      expect(result.meta).toEqual({
        total: 15,
        page: 1,
        limit: 10,
        pages: 2,
      });
    });

    it('should filter by date range', async () => {
      const userId = 'user-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      (prisma.donation.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.donation.count as jest.Mock).mockResolvedValue(0);

      await donationService.getDonations(userId, false, 1, 10, startDate, endDate);

      expect(prisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });
  });

  describe('getDonation', () => {
    it('should return donation for authorized donor', async () => {
      const mockDonation = {
        id: 'donation-123',
        donorId: 'donor-123',
        beneficiaryId: 'beneficiary-123',
        amount: 1000,
        donor: { email: 'donor@example.com', id: 'donor-123', firstName: 'John', lastName: 'Doe' },
        beneficiary: { email: 'beneficiary@example.com', id: 'beneficiary-123', firstName: 'Jane', lastName: 'Smith' },
        transactions: [
          { id: 'tx-1', type: 'DEBIT', amount: 1000 },
          { id: 'tx-2', type: 'CREDIT', amount: 1000 },
        ],
      };

      (prisma.donation.findUnique as jest.Mock).mockResolvedValue(mockDonation);

      const result = await donationService.getDonation('donation-123', 'donor-123');

      expect(result.userRole).toBe('donor');
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].type).toBe('DEBIT');
    });

    it('should return donation for authorized beneficiary', async () => {
      const mockDonation = {
        id: 'donation-123',
        donorId: 'donor-123',
        beneficiaryId: 'beneficiary-123',
        amount: 1000,
        donor: { email: 'donor@example.com', id: 'donor-123', firstName: 'John', lastName: 'Doe' },
        beneficiary: { email: 'beneficiary@example.com', id: 'beneficiary-123', firstName: 'Jane', lastName: 'Smith' },
        transactions: [
          { id: 'tx-1', type: 'DEBIT', amount: 1000 },
          { id: 'tx-2', type: 'CREDIT', amount: 1000 },
        ],
      };

      (prisma.donation.findUnique as jest.Mock).mockResolvedValue(mockDonation);

      const result = await donationService.getDonation('donation-123', 'beneficiary-123');

      expect(result.userRole).toBe('beneficiary');
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].type).toBe('CREDIT');
    });

    it('should throw ValidationError for unauthorized user', async () => {
      const mockDonation = {
        id: 'donation-123',
        donorId: 'donor-123',
        beneficiaryId: 'beneficiary-123',
        amount: 1000,
        donor: { email: 'donor@example.com', id: 'donor-123', firstName: 'John', lastName: 'Doe' },
        beneficiary: { email: 'beneficiary@example.com', id: 'beneficiary-123', firstName: 'Jane', lastName: 'Smith' },
        transactions: [],
      };

      (prisma.donation.findUnique as jest.Mock).mockResolvedValue(mockDonation);

      await expect(
        donationService.getDonation('donation-123', 'unauthorized-user')
      ).rejects.toThrow('Access denied');
    });

    it('should throw NotFoundError if donation not found', async () => {
      (prisma.donation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        donationService.getDonation('invalid-id', 'user-123')
      ).rejects.toThrow('Donation not found');
    });
  });

  describe('getDonationCount', () => {
    it('should return donation count for donor', async () => {
      (prisma.donation.count as jest.Mock).mockResolvedValue(10);

      const result = await donationService.getDonationCount('user-123', true);

      expect(result).toBe(10);
      expect(prisma.donation.count).toHaveBeenCalledWith({
        where: { donorId: 'user-123' },
      });
    });

    it('should return donation count for beneficiary', async () => {
      (prisma.donation.count as jest.Mock).mockResolvedValue(5);

      const result = await donationService.getDonationCount('user-123', false);

      expect(result).toBe(5);
      expect(prisma.donation.count).toHaveBeenCalledWith({
        where: { beneficiaryId: 'user-123' },
      });
    });
  });
});
