import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StkService } from './stk.service';
import { InvoicesService } from '../../invoices/invoices.service';
import { BusinessAccountsService } from '../../business-accounts/business-accounts.service';
import { DarajaClientService } from '../daraja/daraja-client.service';
import { ReconciliationService } from '../reconciliation/reconciliation.service';
import { StkRequest } from '../../../database/entities/stk-request.entity';
import { MpesaTransaction } from '../../../database/entities/mpesa-transaction.entity';

describe('StkService', () => {
  let service: StkService;
  const mockStkRepo = { findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn(), update: jest.fn() };
  const mockTxRepo = { findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn() };
  const mockInvoicesService = { findOne: jest.fn() };
  const mockBusinessAccounts = { findByShortcode: jest.fn() };
  const mockDarajaClient = { initiateStkPush: jest.fn() };
  const mockReconciliation = { manuallyAssign: jest.fn() };
  const mockConfig = { get: jest.fn((key: string) => `mock-${key}`) };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StkService,
        { provide: getRepositoryToken(StkRequest), useValue: mockStkRepo },
        { provide: getRepositoryToken(MpesaTransaction), useValue: mockTxRepo },
        { provide: InvoicesService, useValue: mockInvoicesService },
        { provide: BusinessAccountsService, useValue: mockBusinessAccounts },
        { provide: DarajaClientService, useValue: mockDarajaClient },
        { provide: ReconciliationService, useValue: mockReconciliation },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get<StkService>(StkService);
  });

  describe('initiate', () => {
    it('blocks a second STK push while one is already pending for the invoice', async () => {
      mockInvoicesService.findOne.mockResolvedValue({ id: 'inv-1', balance: '5000.00' });
      mockStkRepo.findOne.mockResolvedValue({ id: 'existing-pending' });

      await expect(service.initiate('inv-1', '254712345678')).rejects.toThrow(ConflictException);
      expect(mockDarajaClient.initiateStkPush).not.toHaveBeenCalled();
    });

    it('initiates STK push and stores the checkout request id when no pending request exists', async () => {
      mockInvoicesService.findOne.mockResolvedValue({ id: 'inv-1', balance: '5000.00' });
      mockStkRepo.findOne.mockResolvedValue(null);
      mockBusinessAccounts.findByShortcode.mockResolvedValue({ id: 'acc-1', accountType: 'paybill' });
      mockDarajaClient.initiateStkPush.mockResolvedValue({
        checkoutRequestId: 'ws_CO_123',
        merchantRequestId: 'mr_123',
      });
      mockStkRepo.save.mockResolvedValue({ id: 'stk-1', checkoutRequestId: 'ws_CO_123' });

      const result = await service.initiate('inv-1', '254712345678');

      expect(result.checkoutRequestId).toBe('ws_CO_123');
      expect(mockStkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ invoiceId: 'inv-1', status: 'pending' }),
      );
    });
  });

  describe('handleCallback', () => {
    const successPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'mr_123',
          CheckoutRequestID: 'ws_CO_123',
          ResultCode: 0,
          ResultDesc: 'Success',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 5000 },
              { Name: 'MpesaReceiptNumber', Value: 'ABC123XYZ' },
              { Name: 'PhoneNumber', Value: 254712345678 },
              { Name: 'TransactionDate', Value: '20260701103000' },
            ],
          },
        },
      },
    };

    it('is idempotent — ignores a callback for an already-resolved request', async () => {
      mockStkRepo.findOne.mockResolvedValue({ id: 'stk-1', status: 'success' });

      await service.handleCallback(successPayload);

      expect(mockStkRepo.update).not.toHaveBeenCalled();
      expect(mockTxRepo.save).not.toHaveBeenCalled();
    });

    it('is idempotent — ignores unknown CheckoutRequestID', async () => {
      mockStkRepo.findOne.mockResolvedValue(null);
      await service.handleCallback(successPayload);
      expect(mockTxRepo.save).not.toHaveBeenCalled();
    });

    it('marks the request failed on a non-zero ResultCode and stops there', async () => {
      mockStkRepo.findOne.mockResolvedValue({ id: 'stk-1', status: 'pending' });

      await service.handleCallback({
        Body: {
          stkCallback: {
            MerchantRequestID: 'mr_123',
            CheckoutRequestID: 'ws_CO_123',
            ResultCode: 1032,
            ResultDesc: 'Request cancelled by user',
          },
        },
      });

      expect(mockStkRepo.update).toHaveBeenCalledWith(
        'stk-1',
        expect.objectContaining({ status: 'timeout' }),
      );
      expect(mockTxRepo.save).not.toHaveBeenCalled();
    });

    it('on success, records the transaction as already matched and hands straight to reconciliation', async () => {
      mockStkRepo.findOne.mockResolvedValue({ id: 'stk-1', status: 'pending', invoiceId: 'inv-1' });
      mockTxRepo.findOne.mockResolvedValue(null); // no duplicate receipt
      mockBusinessAccounts.findByShortcode.mockResolvedValue({ id: 'acc-1', accountType: 'paybill' });
      mockTxRepo.save.mockResolvedValue({ id: 'tx-1' });

      await service.handleCallback(successPayload);

      expect(mockTxRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'stk',
          matchedInvoiceId: 'inv-1',
          status: 'matched',
          transId: 'ABC123XYZ',
        }),
      );
      expect(mockReconciliation.manuallyAssign).toHaveBeenCalledWith(
        'tx-1',
        'inv-1',
        'system:stk_callback',
      );
    });

    it('is idempotent on duplicate MpesaReceiptNumber (Daraja callback retry)', async () => {
      mockStkRepo.findOne.mockResolvedValue({ id: 'stk-1', status: 'pending', invoiceId: 'inv-1' });
      mockTxRepo.findOne.mockResolvedValue({ id: 'already-inserted' });

      await service.handleCallback(successPayload);

      expect(mockTxRepo.save).not.toHaveBeenCalled();
      expect(mockReconciliation.manuallyAssign).not.toHaveBeenCalled();
    });
  });
});
