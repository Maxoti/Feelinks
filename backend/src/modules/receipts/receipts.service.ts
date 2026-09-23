import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrlBase: string;

  constructor(
    @InjectRepository(Receipt) private readonly receiptsRepo: Repository<Receipt>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID')!;
    this.bucket = this.config.get<string>('R2_BUCKET_NAME')!;
    // R2's Public Development URL — the bucket must have this enabled (Settings ->
    // Public Development URL -> Enable) for uploaded objects to resolve at this base.
    this.publicUrlBase = this.config.get<string>('R2_PUBLIC_URL_BASE')!.replace(/\/$/, '');

    this.s3 = new S3Client({
      region: 'auto', // required by the SDK type, ignored by R2
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.get<string>('R2_ACCESS_KEY_ID')!,
        secretAccessKey: this.config.get<string>('R2_SECRET_ACCESS_KEY')!,
      },
    });
  }

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
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf',
      }),
    );
    // Permanent public link via the bucket's Public Development URL.
    // If you later attach a custom domain in R2 settings, just change
    // R2_PUBLIC_URL_BASE — no code change needed, and old links keep working
    // since the underlying object key/bucket stays the same.
    return `${this.publicUrlBase}/${key}`;
  }
}