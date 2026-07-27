import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type StkStatus = 'pending' | 'success' | 'failed' | 'timeout';

@Entity('stk_requests')
export class StkRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'invoice_id' })
  invoiceId!: string;

  @Column({ name: 'business_account_id' })
  businessAccountId!: string;

  @Column({ name: 'checkout_request_id', unique: true })
  checkoutRequestId!: string;

  @Column({ name: 'merchant_request_id', nullable: true })
  merchantRequestId!: string;

  @Column()
  phone!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ default: 'pending' })
  status!: StkStatus;

  @Column({ name: 'result_code', nullable: true })
  resultCode!: number;

  @Column({ name: 'result_desc', nullable: true })
  resultDesc!: string;

  @Column({ name: 'mpesa_receipt_number', nullable: true })
  mpesaReceiptNumber!: string;

  @CreateDateColumn({ name: 'initiated_at' })
  initiatedAt!: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date;
}
