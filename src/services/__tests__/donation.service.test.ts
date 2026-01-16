import { DonationService } from '../donation.service';
import prisma from '../../utils/prisma';
import { donationQueue } from '../../queues/donation.queue';
import { NotFoundError, ValidationError } from '../../utils/errors';

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
jest.mock('../../queues/donation.queue', () => ({
  DONATION_QUEUE_NAME: 'donation-queue',
  donationQueue: {
    add: jest.fn(),
  },
}));
jest.mock('../../queues/notification.queue', () => ({
  NOTIFICATION_QUEUE_NAME: 'notification-queue',
  notificationQueue: {
    add: jest.fn(),
  },
}));

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

    const donationData = {
      beneficiaryId: 'beneficiary-123',
      amount: 1000,
      pin: '1234',
    };

    it('should enqueue donation job when validation passes', async () => {
      const queueResponse = { id: 'job-123' };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockDonor);
      (donationQueue.add as jest.Mock).mockResolvedValue(queueResponse);

      const result = await donationService.makeDonation(mockDonor.id, donationData);

      expect(donationQueue.add).toHaveBeenCalledWith('process-donation', {
        donorId: mockDonor.id,
        dto: donationData,
      });
      expect(result).toEqual({
        message: 'Donation processing started',
        jobId: queueResponse.id,
        status: 'queued',
      });
    });

    it('should throw NotFoundError if donor not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        donationService.makeDonation('invalid-donor', donationData)
      ).rejects.toThrow('Donor not found');
      expect(donationQueue.add).not.toHaveBeenCalled();
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
      expect(donationQueue.add).not.toHaveBeenCalled();
    });

    it('should throw ValidationError if trying to donate to self', async () => {
      const selfDonationData = {
        beneficiaryId: mockDonor.id,
        amount: 1000,
        pin: '1234',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockDonor);

      await expect(
        donationService.makeDonation(mockDonor.id, selfDonationData)
      ).rejects.toThrow('Cannot donate to yourself');
      expect(donationQueue.add).not.toHaveBeenCalled();
    });

    it('should enforce minimum donation amount', async () => {
      const invalidDonation = { ...donationData, amount: 20 };

      await expect(
        donationService.makeDonation(mockDonor.id, invalidDonation)
      ).rejects.toThrow('Donation amount must be greater than fifty naira');
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(donationQueue.add).not.toHaveBeenCalled();
    });

    it('should enforce maximum donation amount', async () => {
      const invalidDonation = { ...donationData, amount: 60000 };

      await expect(
        donationService.makeDonation(mockDonor.id, invalidDonation)
      ).rejects.toThrow('Donation amount cannot not exceed ₦50,000');
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(donationQueue.add).not.toHaveBeenCalled();
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
