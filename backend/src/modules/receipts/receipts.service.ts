import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { Receipt } from '../../database/entities/receipt.entity';
import { Invoice } from '../../database/entities/invoice.entity';
import { MpesaTransaction } from '../../database/entities/mpesa-transaction.entity';
import { Student } from '../../database/entities/student.entity';

export interface ReceiptContext {
  transactionId: string;
  invoiceId: string;
  studentName: string;
  admissionNo: string;
  termName: string;
  amountPaid: string;
  balance: string;
  mpesaReceiptNumber: string;
  paidAt: Date;
}

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    @InjectRepository(Receipt) private readonly receiptsRepo: Repository<Receipt>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Generates a receipt for a reconciled transaction, or returns the
   * existing one if it was already generated.
   *
   * Idempotency is enforced two ways:
   *  1. The DB unique constraint on receipts.transaction_id (hard backstop)
   *  2. An explicit check here first, so a retried job doesn't even attempt
   *     a duplicate insert (avoids a noisy 23505 in logs on the happy path)
   */
  async generateForTransaction(ctx: ReceiptContext): Promise<Receipt> {
    const existing = await this.receiptsRepo.findOne({
      where: { transactionId: ctx.transactionId },
    });
    if (existing) {
      this.logger.log(`Receipt already exists for transaction ${ctx.transactionId}, skipping`);
      return existing;
    }

    return this.dataSource.transaction(async (manager) => {
      const [{ next_receipt_number: receiptNo }] = await manager.query(
        'SELECT next_receipt_number() as next_receipt_number',
      );

      const pdfUrl = await this.renderAndStorePdf(receiptNo, ctx);

      const receipt = manager.create(Receipt, {
        receiptNo: String(receiptNo),
        transactionId: ctx.transactionId,
        invoiceId: ctx.invoiceId,
        pdfUrl,
      });

      return manager.save(receipt);
    });
  }

  private async renderAndStorePdf(receiptNo: number, ctx: ReceiptContext): Promise<string> {
    const buffer = await this.buildPdfBuffer(receiptNo, ctx);
    // Upload target is Cloudflare R2 in this project's pattern (see RevisionHub).
    // Swap this for the actual R2 client; kept abstracted here so the receipt
    // logic and tests don't depend on network/storage credentials.
    return this.uploadToStorage(`receipts/${receiptNo}.pdf`, buffer);
  }

  private buildPdfBuffer(receiptNo: number, ctx: ReceiptContext): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A5', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text('Payment receipt', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);
      doc.text(`Receipt No: ${receiptNo}`);
      doc.text(`Date: ${ctx.paidAt.toISOString()}`);
      doc.text(`Student: ${ctx.studentName} (${ctx.admissionNo})`);
      doc.text(`Term: ${ctx.termName}`);
      doc.text(`Amount paid: KES ${ctx.amountPaid}`);
      doc.text(`Balance: KES ${ctx.balance}`);
      doc.text(`M-Pesa Ref: ${ctx.mpesaReceiptNumber}`);
      doc.end();
    });
  }

  private async uploadToStorage(key: string, buffer: Buffer): Promise<string> {
    // Placeholder — wire to Cloudflare R2 client. Returning a deterministic
    // URL shape so callers/tests aren't coupled to the storage implementation.
    void buffer;
    return `https://receipts.example.com/${key}`;
  }
}
