import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { MobiwaveProvider } from './mobiwave.provider';
import { NotificationEntity } from '../../database/entities/notification.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const mockRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
    findOneOrFail: jest.fn(),
  };
  const mockMobiwave = { send: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(NotificationEntity), useValue: mockRepo },
        { provide: MobiwaveProvider, useValue: mockMobiwave },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
  });

  const baseParams = {
    invoiceId: 'inv-1',
    transactionId: 'tx-1',
    phone: '254712345678',
    studentName: 'Jane Doe',
    amount: '5000.00',
    balance: '10000.00',
    receiptUrl: 'https://receipts.example.com/r/1',
    mpesaReceiptNumber: 'ABC123XYZ',
  };

  it('marks the notification sent when Mobiwave succeeds', async () => {
    mockRepo.save.mockResolvedValue({ id: 'n1' });
    mockMobiwave.send.mockResolvedValue({ providerRef: 'MOBIWAVE-REF-1' });
    mockRepo.findOneOrFail.mockResolvedValue({ id: 'n1', status: 'sent' });

    const result = await service.sendReceiptSms(baseParams);

    expect(mockRepo.update).toHaveBeenCalledWith(
      'n1',
      expect.objectContaining({ status: 'sent', providerRef: 'MOBIWAVE-REF-1' }),
    );
    expect(result.status).toBe('sent');
  });

  it('marks the notification failed and increments retry_count on provider error', async () => {
    mockRepo.save.mockResolvedValue({ id: 'n2' });
    mockMobiwave.send.mockRejectedValue(new Error('Mobiwave timeout'));
    mockRepo.findOneOrFail.mockResolvedValue({ id: 'n2', status: 'failed' });

    await service.sendReceiptSms(baseParams);

    expect(mockRepo.increment).toHaveBeenCalledWith({ id: 'n2' }, 'retryCount', 1);
    expect(mockRepo.update).toHaveBeenCalledWith('n2', { status: 'failed' });
  });
});
