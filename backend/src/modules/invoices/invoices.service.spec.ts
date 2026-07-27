import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { Invoice } from '../../database/entities/invoice.entity';

describe('InvoicesService', () => {
  let service: InvoicesService;
  const mockRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), find: jest.fn() };
  const mockDataSource = {};

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getRepositoryToken(Invoice), useValue: mockRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();
    service = module.get<InvoicesService>(InvoicesService);
  });

  describe('create', () => {
    it('rejects a duplicate student+term invoice', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'existing' });
      await expect(
        service.create({ studentId: 's1', termId: 't1', amountDue: '15000.00' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('applyPayment', () => {
    it('locks the invoice row, adds the amount, and returns the updated invoice', async () => {
      const lockedInvoice = { id: 'inv-1', amountPaid: '5000.00' };
      const getOne = jest.fn().mockResolvedValue(lockedInvoice);
      const setLock = jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ getOne }) });
      const createQueryBuilder = jest.fn().mockReturnValue({ setLock });

      const update = jest.fn().mockResolvedValue(undefined);
      const findOne = jest.fn().mockResolvedValue({ id: 'inv-1', amountPaid: '10000.00' });

      const manager = { createQueryBuilder, update, findOne } as unknown as EntityManager;

      const result = await service.applyPayment(manager, 'inv-1', '5000.00');

      expect(setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(update).toHaveBeenCalledWith(Invoice, { id: 'inv-1' }, { amountPaid: '10000.00' });
      expect(result.amountPaid).toBe('10000.00');
    });

    it('throws if the invoice does not exist under lock', async () => {
      const getOne = jest.fn().mockResolvedValue(null);
      const setLock = jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ getOne }) });
      const createQueryBuilder = jest.fn().mockReturnValue({ setLock });
      const manager = { createQueryBuilder } as unknown as EntityManager;

      await expect(service.applyPayment(manager, 'missing', '1000.00')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
