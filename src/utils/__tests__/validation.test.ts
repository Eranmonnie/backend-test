import { z } from 'zod';
import {
  registerSchema,
  loginSchema,
  donationSchema,
  addBeneficiarySchema,
  updateNicknameSchema,
  paginationQuerySchema,
  getDonationsQuerySchema,
  getDonationCountQuerySchema,
} from '../validation';

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        pin: '1234',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        pin: '1234',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: '12345',
        pin: '1234',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid PIN format', () => {
      const invalidData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        pin: 'abcd',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject PIN not exactly 4 digits', () => {
      const invalidData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        pin: '12345',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('donationSchema', () => {
    it('should validate correct donation data', () => {
      const validData = {
        beneficiaryId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 5000,
        pin: '1234',
      };

      const result = donationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject amount below minimum (₦100)', () => {
      const invalidData = {
        beneficiaryId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 50,
        pin: '1234',
      };

      const result = donationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Minimum donation amount is ₦100');
      }
    });

    it('should reject amount above maximum (₦1,000,000)', () => {
      const invalidData = {
        beneficiaryId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 2000000,
        pin: '1234',
      };

      const result = donationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Maximum donation amount');
      }
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        beneficiaryId: 'not-a-uuid',
        amount: 5000,
        pin: '1234',
      };

      const result = donationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('addBeneficiarySchema', () => {
    it('should validate correct beneficiary data', () => {
      const validData = {
        beneficiaryId: '123e4567-e89b-12d3-a456-426614174000',
        nickname: 'Best Friend',
      };

      const result = addBeneficiarySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow missing nickname', () => {
      const validData = {
        beneficiaryId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = addBeneficiarySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject nickname longer than 50 characters', () => {
      const invalidData = {
        beneficiaryId: '123e4567-e89b-12d3-a456-426614174000',
        nickname: 'a'.repeat(51),
      };

      const result = addBeneficiarySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('paginationQuerySchema', () => {
    it('should validate correct pagination data', () => {
      const validData = {
        page: '1',
        limit: '10',
      };

      const result = paginationQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should use default values', () => {
      const result = paginationQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should reject page less than 1', () => {
      const invalidData = {
        page: '0',
        limit: '10',
      };

      const result = paginationQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const invalidData = {
        page: '1',
        limit: '150',
      };

      const result = paginationQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('getDonationsQuerySchema', () => {
    it('should validate complete query data', () => {
      const validData = {
        page: '2',
        limit: '20',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        donor: 'true',
      };

      const result = getDonationsQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should use defaults for missing fields', () => {
      const result = getDonationsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
        expect(result.data.donor).toBe('false');
      }
    });

    it('should reject invalid date format', () => {
      const invalidData = {
        startDate: '2024-01-01',
        donor: 'true',
      };

      const result = getDonationsQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid donor value', () => {
      const invalidData = {
        donor: 'yes',
      };

      const result = getDonationsQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('getDonationCountQuerySchema', () => {
    it('should validate donor query parameter', () => {
      const validData = {
        donor: 'true',
      };

      const result = getDonationCountQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.donor).toBe('true');
      }
    });

    it('should use default value', () => {
      const result = getDonationCountQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.donor).toBe('false');
      }
    });
  });
});
