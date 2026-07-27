import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { BusinessAccountsService } from './business-accounts.service';
import { BusinessAccount } from '../../database/entities/business-account.entity';

describe('BusinessAccountsService', () => {
  let service: BusinessAccountsService;
  const mockRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), find: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessAccountsService,
        { provide: getRepositoryToken(BusinessAccount), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<BusinessAccountsService>(BusinessAccountsService);
  });

  it('rejects an unregistered shortcode instead of guessing', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.findByShortcode('4676355')).rejects.toThrow(NotFoundException);
  });

  it('resolves a registered active shortcode', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'acc-1', shortcode: '4463675', accountType: 'till' });
    const result = await service.findByShortcode('4463675');
    expect(result.accountType).toBe('till');
  });
});
