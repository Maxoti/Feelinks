import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('receipts')
export class Receipt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'receipt_no', type: 'bigint', unique: true })
  receiptNo!: string;

  @Column({ name: 'transaction_id', unique: true })
  transactionId!: string;

  @Column({ name: 'invoice_id' })
  invoiceId!: string;

  @Column({ name: 'pdf_url', nullable: true })
  pdfUrl!: string;

  @CreateDateColumn({ name: 'issued_at' })
  issuedAt!: Date;
}
