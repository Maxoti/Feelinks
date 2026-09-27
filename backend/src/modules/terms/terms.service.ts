// -> backend/src/modules/terms/terms.service.ts (full replacement)
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Term } from '../../database/entities/term.entity';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';

function termName(termNumber: number, year: number): string {
  return `Term ${termNumber} ${year}`;
}

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

    const name = termName(dto.termNumber, dto.year);

    // If this term is being created as active, deactivate any other active
    // term first — same rule as setActive(), enforced here too since a term
    // can be created pre-activated in one step.
    if (dto.isActive) {
      return this.dataSource.transaction(async (manager) => {
        await manager.update(Term, { isActive: true }, { isActive: false });
        const term = manager.create(Term, { ...dto, name });
        return manager.save(term);
      });
    }

    return this.termsRepo.save(this.termsRepo.create({ ...dto, name }));
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

  async update(id: string, dto: UpdateTermDto): Promise<Term> {
    const term = await this.termsRepo.findOne({ where: { id } });
    if (!term) throw new NotFoundException(`Term ${id} not found`);

    const nextYear = dto.year ?? term.year;
    const nextTermNumber = dto.termNumber ?? term.termNumber;

    if (nextYear !== term.year || nextTermNumber !== term.termNumber) {
      const clash = await this.termsRepo.findOne({
        where: { year: nextYear, termNumber: nextTermNumber },
      });
      if (clash && clash.id !== id) {
        throw new ConflictException(`Term ${nextTermNumber} of ${nextYear} already exists`);
      }
    }

    const name = termName(nextTermNumber, nextYear);

    if (dto.isActive) {
      return this.dataSource.transaction(async (manager) => {
        await manager.update(Term, { isActive: true }, { isActive: false });
        await manager.update(Term, { id }, {
          year: nextYear,
          termNumber: nextTermNumber,
          name,
          isActive: true,
        });
        return manager.findOneOrFail(Term, { where: { id } });
      });
    }

    Object.assign(term, { year: nextYear, termNumber: nextTermNumber, name });
    if (dto.isActive === false) term.isActive = false;
    return this.termsRepo.save(term);
  }

  // Delete is only safe when nothing references this term — invoices.term_id
  // has ON DELETE RESTRICT in schema.sql, so Postgres would reject the delete
  // anyway, but checking here first gives a clear, actionable error instead of
  // a raw foreign-key-violation exception surfacing to the frontend.
  async remove(id: string): Promise<void> {
    const term = await this.termsRepo.findOne({ where: { id } });
    if (!term) throw new NotFoundException(`Term ${id} not found`);

    const [{ count }] = await this.dataSource.query(
      'SELECT COUNT(*)::int AS count FROM invoices WHERE term_id = $1',
      [id],
    );
    if (count > 0) {
      throw new ConflictException(
        `Can't delete this term \u2014 ${count} invoice${count === 1 ? '' : 's'} still reference it.`,
      );
    }

    await this.termsRepo.remove(term);
  }
}