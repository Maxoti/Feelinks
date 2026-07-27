import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ReconciliationService } from './reconciliation.service';
import { InvoicesService } from '../../invoices/invoices.service';
import { PaymentEventsService } from '../../payment-events/payment-events.service';
import { ReceiptsService } from '../../receipts/receipts.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PaymentsGateway } from '../../realtime/payments.gateway';
import { MpesaTransaction } from '../../../database/entities/mpesa-transaction.entity';
import { Student } from '../../../database/entities/student.entity';
import { Invoice } from '../../../database/entities/invoice.entity';

describe('ReconciliationService', () => {
  let service: ReconciliationService;

  let manager: any;
  let dataSource: any;
  let invoicesService: any;
  let paymentEvents: any;
  let receiptsService: any;
  let notificationsService: any;
  let paymentsGateway: any;

  const baseTx = (overrides: Partial<MpesaTransaction> = {}): MpesaTransaction =>
    ({
      id: 'tx-1',
      channel: 'c2b',
      accountType: 'paybill',
      transId: 'QWERTY123',
      msisdn: '254712345678',
      transAmount: '5000.00',
      billRefNumber: 'ADM001',
      transTime: new Date(),
      status: 'unmatched',
      rawPayload: {},
      ...overrides,
    } as MpesaTransaction);

  beforeEach(async () => {
    jest.clearAllMocks();

    manager = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };
    dataSource = { transaction: jest.fn((cb) => cb(manager)) };
    invoicesService = { applyPayment: jest.fn() };
    paymentEvents = { log: jest.fn() };
    receiptsService = { generateForTransaction: jest.fn() };
    notificationsService = { sendReceiptSms: jest.fn() };
    paymentsGateway = { emitPaymentReceived: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: DataSource, useValue: dataSource },
        { provide: InvoicesService, useValue: invoicesService },
        { provide: PaymentEventsService, useValue: paymentEvents },
        { provide: ReceiptsService, useValue: receiptsService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: PaymentsGateway, useValue: paymentsGateway },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
  });

  function mockLockedTxLookup(tx: MpesaTransaction | null) {
    const getOne = jest.fn().mockResolvedValue(tx);
    const where = jest.fn().mockReturnValue({ getOne });
    const setLock = jest.fn().mockReturnValue({ where });
    manager.createQueryBuilder.mockReturnValueOnce({ setLock });
  }

  describe('processTransaction — idempotency', () => {
    it('is a no-op if the transaction is already reconciled', async () => {
      mockLockedTxLookup(baseTx({ status: 'reconciled' }));

      await service.processTransaction('tx-1');

      expect(invoicesService.applyPayment).not.toHaveBeenCalled();
      expect(paymentsGateway.emitPaymentReceived).not.toHaveBeenCalled();
    });

    it('is a no-op if the transaction no longer exists', async () => {
      mockLockedTxLookup(null);
      await service.processTransaction('tx-1');
      expect(invoicesService.applyPayment).not.toHaveBeenCalled();
      expect(paymentsGateway.emitPaymentReceived).not.toHaveBeenCalled();
    });
  });

  describe('exact admission number match (Paybill)', () => {
    it('reconciles when bill_ref_number matches a student with an open invoice', async () => {
      mockLockedTxLookup(baseTx());

      manager.findOne.mockImplementation((entity: any, opts: any) => {
        if (entity === Student) return Promise.resolve({ id: 'student-1', admissionNo: 'ADM001', fullName: 'Jane', parentPhone: '254712345678' });
        if (entity === Invoice) return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const getOne = jest.fn().mockResolvedValue({ id: 'invoice-1' });
      manager.createQueryBuilder.mockReturnValueOnce({
        where: jest.fn().mockReturnValue({
          andWhere: jest.fn().mockReturnValue({ orderBy: jest.fn().mockReturnValue({ getOne }) }),
        }),
      });

      invoicesService.applyPayment.mockResolvedValue({ id: 'invoice-1', studentId: 'student-1', balance: '10000.00' });
      receiptsService.generateForTransaction.mockResolvedValue({ pdfUrl: 'https://x/1.pdf' });

      await service.processTransaction('tx-1');

      expect(invoicesService.applyPayment).toHaveBeenCalledWith(manager, 'invoice-1', '5000.00');
      expect(manager.update).toHaveBeenCalledWith(
        MpesaTransaction,
        { id: 'tx-1' },
        expect.objectContaining({ status: 'reconciled', matchedInvoiceId: 'invoice-1' }),
      );
      expect(notificationsService.sendReceiptSms).toHaveBeenCalled();
      expect(paymentsGateway.emitPaymentReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: 'tx-1',
          invoiceId: 'invoice-1',
          studentId: 'student-1',
          status: 'reconciled',
        }),
      );
    });
  });

  describe('Till transactions — no bill_ref_number to rely on', () => {
    it('falls through to phone matching when account_type is till', async () => {
      const tillTx = baseTx({ accountType: 'till', billRefNumber: null });
      mockLockedTxLookup(tillTx);

      manager.find.mockResolvedValue([{ id: 'student-2', parentPhone: '254712345678', fullName: 'Sam', admissionNo: 'ADM009' }]);

      const getOne = jest.fn().mockResolvedValue({ id: 'invoice-9' });
      manager.createQueryBuilder.mockReturnValueOnce({
        where: jest.fn().mockReturnValue({
          andWhere: jest.fn().mockReturnValue({ orderBy: jest.fn().mockReturnValue({ getOne }) }),
        }),
      });

      manager.findOne.mockResolvedValue(null);
      invoicesService.applyPayment.mockResolvedValue({ id: 'invoice-9', studentId: 'student-2', balance: '2000.00' });
      receiptsService.generateForTransaction.mockResolvedValue({ pdfUrl: 'https://x/9.pdf' });

      await service.processTransaction('tx-1');

      expect(manager.find).toHaveBeenCalledWith(Student, { where: { parentPhone: '254712345678' } });
      expect(invoicesService.applyPayment).toHaveBeenCalledWith(manager, 'invoice-9', tillTx.transAmount);
      expect(paymentsGateway.emitPaymentReceived).toHaveBeenCalledWith(
        expect.objectContaining({ transactionId: 'tx-1', invoiceId: 'invoice-9', channel: 'c2b', status: 'reconciled' }),
      );
    });
  });

  describe('low confidence — stays unmatched', () => {
    it('does not reconcile when no student matches at all', async () => {
      const tillTx = baseTx({ accountType: 'till', billRefNumber: null });
      mockLockedTxLookup(tillTx);
      manager.find.mockResolvedValue([]);

      await service.processTransaction('tx-1');

      expect(invoicesService.applyPayment).not.toHaveBeenCalled();
      expect(manager.update).toHaveBeenCalledWith(
        MpesaTransaction,
        { id: 'tx-1' },
        expect.objectContaining({ status: 'unmatched' }),
      );
      expect(paymentEvents.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'no_match_found' }),
        manager,
      );
      expect(paymentsGateway.emitPaymentReceived).toHaveBeenCalledWith(
        expect.objectContaining({ transactionId: 'tx-1', invoiceId: null, status: 'unmatched' }),
      );
    });
  });
});