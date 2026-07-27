import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { TermsService } from './terms.service';
import { Term } from '../../database/entities/term.entity';

describe('TermsService', () => {
  let service: TermsService;
  const mockRepo = { findOne: jest.fn(), find: jest.fn() };
  const mockManager = { update: jest.fn(), findOne: jest.fn() };
  const mockDataSource = { transaction: jest.fn((cb) => cb(mockManager)) };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TermsService,
        { provide: getRepositoryToken(Term), useValue: mockRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<TermsService>(TermsService);
  });

  it('deactivates all terms before activating the target term', async () => {
    mockManager.findOne.mockResolvedValue({ id: 'term-2', isActive: true });

    const result = await service.setActive('term-2');

    expect(mockManager.update).toHaveBeenNthCalledWith(
      1,
      Term,
      { isActive: true },
      { isActive: false },
    );
    expect(mockManager.update).toHaveBeenNthCalledWith(
      2,
      Term,
      { id: 'term-2' },
      { isActive: true },
    );
    expect(result.id).toBe('term-2');
  });

  it('throws if activated term does not exist', async () => {
    mockManager.findOne.mockResolvedValue(null);
    await expect(service.setActive('missing')).rejects.toThrow(NotFoundException);
  });

  it('findActive throws when no term is active', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.findActive()).rejects.toThrow(NotFoundException);
  });
});
