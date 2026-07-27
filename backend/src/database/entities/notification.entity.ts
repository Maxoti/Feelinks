import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type NotificationChannel = 'sms' | 'email';
export type NotificationStatus = 'pending' | 'sent' | 'failed';

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'invoice_id', type: 'uuid', nullable: true })
  invoiceId!: string | null;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId!: string | null;

  @Column()
  channel!: NotificationChannel;

  @Column()
  recipient!: string;

  @Column()
  message!: string;

  @Column({ default: 'pending' })
  status!: NotificationStatus;

  @Column({ name: 'retry_count', default: 0 })
  retryCount!: number;

  @Column({ name: 'provider_ref', nullable: true })
  providerRef!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date;
}