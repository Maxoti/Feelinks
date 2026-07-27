import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ReceiptsService, ReceiptContext } from './receipts.service';
import { Receipt } from '../../database/entities/receipt.entity';

describe('ReceiptsService', () => {
  let service: ReceiptsService;
  const mockReceiptsRepo = { findOne: jest.fn() };
  let mockManager: any;
  let mockDataSource: any;

  const ctx: ReceiptContext = {
    transactionId: 'tx-1',
    invoiceId: 'inv-1',
    studentName: 'Jane Doe',
    admissionNo: 'ADM001',
    termName: 'Term 1 2026',
    amountPaid: '5000.00',
    balance: '10000.00',
    mpesaReceiptNumber: 'ABC123XYZ',
    paidAt: new Date('2026-07-01T10:00:00Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockManager = {
      query: jest.fn().mockResolvedValue([{ next_receipt_number: 42 }]),
      create: jest.fn((_entity, data) => data),
      save: jest.fn((data) => ({ id: 'receipt-1', ...data })),
    };
    mockDataSource = { transaction: jest.fn((cb) => cb(mockManager)) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptsService,
        { provide: getRepositoryToken(Receipt), useValue: mockReceiptsRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ReceiptsService>(ReceiptsService);
  });

  it('returns the existing receipt instead of generating a duplicate', async () => {
    mockReceiptsRepo.findOne.mockResolvedValue({ id: 'existing-receipt', receiptNo: '10' });

    const result = await service.generateForTransaction(ctx);

    expect(result.id).toBe('existing-receipt');
    expect(mockDataSource.transaction).not.toHaveBeenCalled();
  });

  it('pulls the next receipt number from the locked DB counter when generating', async () => {
    mockReceiptsRepo.findOne.mockResolvedValue(null);

    const result = await service.generateForTransaction(ctx);

    expect(mockManager.query).toHaveBeenCalledWith(
      'SELECT next_receipt_number() as next_receipt_number',
    );
    expect(result.receiptNo).toBe('42');
    expect(result.transactionId).toBe('tx-1');
    expect(result.pdfUrl).toContain('receipts/42.pdf');
  });
});
