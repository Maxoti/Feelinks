import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type MpesaChannel = 'c2b' | 'stk';
export type MpesaAccountType = 'paybill' | 'till';
export type MpesaTxStatus = 'unmatched' | 'matched' | 'reconciled' | 'rejected';

@Entity('mpesa_transactions')
export class MpesaTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  channel!: MpesaChannel;

  @Column({ name: 'business_account_id' })
  businessAccountId!: string;

  @Column({ name: 'account_type' })
  accountType!: MpesaAccountType;

  @Column({ name: 'trans_id', unique: true })
  transId!: string;

  @Column()
  msisdn!: string;

  @Column({ name: 'trans_amount', type: 'numeric', precision: 12, scale: 2 })
  transAmount!: string;

   @Column({ name: 'bill_ref_number', type: 'text', nullable: true })
  billRefNumber!: string | null;

  @Column({ name: 'trans_time', type: 'timestamptz' })
  transTime!: Date;

  @Column({ name: 'stk_request_id', type: 'uuid', nullable: true })
  stkRequestId!: string | null;

 @Column({ name: 'matched_invoice_id', type: 'uuid', nullable: true })
  matchedInvoiceId!: string | null;

  @Column({ default: 'unmatched' })
  status!: MpesaTxStatus;

  @Column({ name: 'match_confidence', type: 'numeric', precision: 4, scale: 3, nullable: true })
  matchConfidence!: string | null;

  @Column({ name: 'raw_payload', type: 'jsonb' })
  rawPayload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'reconciled_at', type: 'timestamptz', nullable: true })
  reconciledAt!: Date | null;
}
