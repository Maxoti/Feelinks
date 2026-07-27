import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { C2BService } from './c2b.service';
import { BusinessAccountsService } from '../../business-accounts/business-accounts.service';
import { ReconciliationService } from '../reconciliation/reconciliation.service';
import { PaymentsGateway } from '../../realtime/payments.gateway';
import { MpesaTransaction } from '../../../database/entities/mpesa-transaction.entity';

describe('C2BService', () => {
  let service: C2BService;
  const mockTxRepo = { findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn() };
  const mockBusinessAccounts = { findByShortcode: jest.fn() };
  const mockReconciliation = { processTransaction: jest.fn() };
  const mockPaymentsGateway = { emitPaymentReceived: jest.fn() };

  const basePayload = {
    TransactionType: 'Pay Bill',
    TransID: 'RJ12ABC3XY',
    TransTime: '20260701103000',
    TransAmount: '5000.00',
    BusinessShortCode: '4676355',
    BillRefNumber: ' adm001 ',
    MSISDN: '254712345678',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        C2BService,
        { provide: getRepositoryToken(MpesaTransaction), useValue: mockTxRepo },
        { provide: BusinessAccountsService, useValue: mockBusinessAccounts },
        { provide: ReconciliationService, useValue: mockReconciliation },
        { provide: PaymentsGateway, useValue: mockPaymentsGateway },
      ],
    }).compile();
    service = module.get<C2BService>(C2BService);
  });

  it('is idempotent on duplicate TransID (Safaricom retry)', async () => {
    mockBusinessAccounts.findByShortcode.mockResolvedValue({ id: 'acc-1', accountType: 'paybill' });
    mockTxRepo.findOne.mockResolvedValue({ id: 'existing-tx' });

    const result = await service.handleConfirmation(basePayload);

    expect(result.alreadyExisted).toBe(true);
    expect(mockTxRepo.save).not.toHaveBeenCalled();
    expect(mockReconciliation.processTransaction).not.toHaveBeenCalled();
    expect(mockPaymentsGateway.emitPaymentReceived).not.toHaveBeenCalled();
  });

  it('strips bill_ref_number for Till accounts even if Safaricom sends one', async () => {
    mockBusinessAccounts.findByShortcode.mockResolvedValue({ id: 'acc-2', accountType: 'till' });
    mockTxRepo.findOne.mockResolvedValue(null);
    mockTxRepo.save.mockResolvedValue({
      id: 'new-tx',
      transAmount: '5000.00',
      msisdn: '254712345678',
      transTime: new Date('2026-07-01T10:30:00Z'),
    });

    await service.handleConfirmation({ ...basePayload, BusinessShortCode: '4800959' });

    expect(mockTxRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ accountType: 'till', billRefNumber: null }),
    );
    expect(mockPaymentsGateway.emitPaymentReceived).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: 'new-tx', channel: 'c2b', status: 'unmatched' }),
    );
  });

  it('keeps bill_ref_number for Paybill and triggers reconciliation', async () => {
    mockBusinessAccounts.findByShortcode.mockResolvedValue({ id: 'acc-1', accountType: 'paybill' });
    mockTxRepo.findOne.mockResolvedValue(null);
    mockTxRepo.save.mockResolvedValue({
      id: 'new-tx',
      transAmount: '5000.00',
      msisdn: '254712345678',
      transTime: new Date('2026-07-01T10:30:00Z'),
    });

    await service.handleConfirmation(basePayload);

    expect(mockTxRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ billRefNumber: 'adm001', accountType: 'paybill' }),
    );
    expect(mockReconciliation.processTransaction).toHaveBeenCalledWith('new-tx');
    expect(mockPaymentsGateway.emitPaymentReceived).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: 'new-tx', channel: 'c2b', status: 'unmatched' }),
    );
  });

  it('rejects a confirmation on an unregistered shortcode', async () => {
    mockBusinessAccounts.findByShortcode.mockRejectedValue(new Error('not found'));
    await expect(service.handleConfirmation(basePayload)).rejects.toThrow();
    expect(mockTxRepo.save).not.toHaveBeenCalled();
    expect(mockPaymentsGateway.emitPaymentReceived).not.toHaveBeenCalled();
  });
});