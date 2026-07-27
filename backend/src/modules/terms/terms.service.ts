import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Term } from '../../database/entities/term.entity';
import { CreateTermDto } from './dto/create-term.dto';

@Injectable()
export class TermsService {
  constructor(
    @InjectRepository(Term) private readonly termsRepo: Repository<Term>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTermDto): Promise<Term> {
    const existing = await this.termsRepo.findOne({
      where: { year: dto.year, termNumber: dto.termNumber },
    });
    if (existing) {
      throw new ConflictException(
        `Term ${dto.termNumber} of ${dto.year} already exists`,
      );
    }

    // If this term is being created as active, deactivate any other active
    // term first — same rule as setActive(), enforced here too since a term
    // can be created pre-activated in one step.
    if (dto.isActive) {
      return this.dataSource.transaction(async (manager) => {
        await manager.update(Term, { isActive: true }, { isActive: false });
        const term = manager.create(Term, dto as Partial<Term>);
        return manager.save(term);
      });
    }

    return this.termsRepo.save(this.termsRepo.create(dto as Partial<Term>));
  }

  findAll(): Promise<Term[]> {
    return this.termsRepo.find({ order: { year: 'DESC', termNumber: 'DESC' } });
  }

  async findActive(): Promise<Term> {
    const term = await this.termsRepo.findOne({ where: { isActive: true } });
    if (!term) throw new NotFoundException('No active term is configured');
    return term;
  }

  // Only one term can be active at a time (enforced by a partial unique index
  // in schema.sql too — this transaction is the app-level mirror of that rule).
  async setActive(termId: string): Promise<Term> {
    return this.dataSource.transaction(async (manager) => {
      await manager.update(Term, { isActive: true }, { isActive: false });
      await manager.update(Term, { id: termId }, { isActive: true });
      const updated = await manager.findOne(Term, { where: { id: termId } });
      if (!updated) throw new NotFoundException(`Term ${termId} not found`);
      return updated;
    });
  }
}
