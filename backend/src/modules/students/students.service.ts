import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../../database/entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student) private readonly studentsRepo: Repository<Student>,
  ) {}

  async create(dto: CreateStudentDto): Promise<Student> {
    const existing = await this.studentsRepo.findOne({ where: { admissionNo: dto.admissionNo } });
    if (existing) {
      throw new ConflictException(`Admission number ${dto.admissionNo} is already registered`);
    }
    const student = this.studentsRepo.create(dto as Partial<Student>);
    return this.studentsRepo.save(student);
  }

  findAll(): Promise<Student[]> {
    return this.studentsRepo.find({ order: { fullName: 'ASC' } });
  }

  async findOne(id: string): Promise<Student> {
    const student = await this.studentsRepo.findOne({ where: { id } });
    if (!student) throw new NotFoundException(`Student ${id} not found`);
    return student;
  }

  findByAdmissionNo(admissionNo: string): Promise<Student | null> {
    return this.studentsRepo.findOne({ where: { admissionNo } });
  }

  findByPhone(parentPhone: string): Promise<Student[]> {
    return this.studentsRepo.find({ where: { parentPhone } });
  }
}
