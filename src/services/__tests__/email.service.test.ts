import { EmailService } from '../email.service';

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService();
  });

  describe('getThankYouMessage', () => {
    it('should return correct message for 2nd donation', () => {
      const message = (emailService as any).getThankYouMessage(2, 'John');
      expect(message).toContain('2nd');
      expect(message).toContain('John');
    });

    it('should return correct message for 5th donation', () => {
      const message = (emailService as any).getThankYouMessage(5, 'Alice');
      expect(message).toContain('5 donations');
      expect(message).toContain('Alice');
    });

    it('should return correct message for 10th donation', () => {
      const message = (emailService as any).getThankYouMessage(10, 'Bob');
      expect(message).toContain('10 donations');
      expect(message).toContain('Bob');
    });

    it('should return correct message for 25th donation', () => {
      const message = (emailService as any).getThankYouMessage(25, 'John');
      expect(message).toContain('25 donations');
      expect(message).toContain('John');
    });

    it('should return correct message for 50th donation', () => {
      const message = (emailService as any).getThankYouMessage(50, 'Jane');
      expect(message).toContain('50 donations');
      expect(message).toContain('Jane');
    });

    it('should return correct message for 100th donation', () => {
      const message = (emailService as any).getThankYouMessage(100, 'Alice');
      expect(message).toContain('100 donations');
      expect(message).toContain('Alice');
    });

    it('should return message for non-milestone donations', () => {
      const message = (emailService as any).getThankYouMessage(7, 'John');
      expect(message).toContain('7 donations');
      expect(message).toContain('John');
    });
  });
});

