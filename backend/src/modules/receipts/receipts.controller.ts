import { Controller, Get, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receipt } from '../../database/entities/receipt.entity';
import { NotFoundException } from '@nestjs/common';

@Controller('receipts')
export class ReceiptsController {
  constructor(
    @InjectRepository(Receipt) private readonly receiptsRepo: Repository<Receipt>,
  ) {}

  @Get('by-invoice/:invoiceId')
  async byInvoice(@Param('invoiceId') invoiceId: string) {
    const receipts = await this.receiptsRepo.find({ where: { invoiceId }, order: { issuedAt: 'DESC' } });
    if (!receipts.length) throw new NotFoundException('No receipts found for this invoice');
    return receipts;
  }
}
