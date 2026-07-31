import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Invoice } from '../../database/entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private readonly invoicesRepo: Repository<Invoice>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateInvoiceDto): Promise<Invoice> {
    const existing = await this.invoicesRepo.findOne({
      where: { studentId: dto.studentId, termId: dto.termId },
    });
    if (existing) {
      throw new ConflictException('An invoice already exists for this student and term');
    }
    return this.invoicesRepo.save(this.invoicesRepo.create(dto as Partial<Invoice>));
  }

  findAll(): Promise<Invoice[]> {
    return this.invoicesRepo.find({ relations: ['student', 'term'] });
  }

  async findOne(id: string): Promise<Invoice> {
    const invoice = await this.invoicesRepo.findOne({ where: { id }, relations: ['student', 'term'] });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  findByStudent(studentId: string): Promise<Invoice[]> {
    return this.invoicesRepo.find({ where: { studentId }, relations: ['term'] });
  }

  /**
   * Applies a confirmed M-Pesa payment to an invoice's ledger.
   *
   * Must run inside the SAME transaction as the mpesa_transactions status
   * update (caller is expected to pass its own EntityManager when composing
   * this into a larger unit of work — e.g. from the reconciliation service).
   *
   * SELECT ... FOR UPDATE locks the invoice row for the duration of the
   * transaction, so two concurrent payments for the same invoice (a C2B
   * confirmation landing at the same moment as an STK callback, say)
   * serialize instead of racing on amount_paid.
   */
  async applyPayment(
  manager: EntityManager,
  invoiceId: string,
  amount: string,
): Promise<Invoice> {
  const invoice = await manager
    .createQueryBuilder(Invoice, 'invoice')
    .setLock('pessimistic_write')
    .where('invoice.id = :invoiceId', { invoiceId })
    .getOne();

  if (!invoice) {
    throw new NotFoundException(`Invoice ${invoiceId} not found`);
  }

  const newAmountPaid = Number(invoice.amountPaid) + Number(amount);
  const newBalance = Number(invoice.amountDue) - newAmountPaid;
  const newStatus = newBalance <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : 'unpaid';

  await manager.update(
    Invoice,
    { id: invoiceId },
    {
      amountPaid: newAmountPaid.toFixed(2),
      balance: newBalance.toFixed(2),
      status: newStatus,
    },
  );

  const updated = await manager.findOne(Invoice, { where: { id: invoiceId } });
  if (!updated) throw new NotFoundException(`Invoice ${invoiceId} not found after update`);
  return updated;
}
}
