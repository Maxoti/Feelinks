import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { Student } from '../../database/entities/student.entity';

describe('StudentsService', () => {
  let service: StudentsService;
  const mockRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: getRepositoryToken(Student), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
  });

  describe('create', () => {
    it('rejects a duplicate admission number', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({
          admissionNo: 'ADM001',
          fullName: 'Jane Doe',
          parentPhone: '254712345678',
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('creates a student when admission number is unique', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue({ admissionNo: 'ADM002' });
      mockRepo.save.mockResolvedValue({ id: 'new-id', admissionNo: 'ADM002' });

      const result = await service.create({
        admissionNo: 'ADM002',
        fullName: 'John Doe',
        parentPhone: '254712345678',
      });

      expect(result.id).toBe('new-id');
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when student does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });
});
