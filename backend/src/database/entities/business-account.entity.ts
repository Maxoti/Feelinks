import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type AccountType = 'paybill' | 'till';

@Entity('business_accounts')
export class BusinessAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  label!: string;

  @Column({ unique: true })
  shortcode!: string;

  @Column({ name: 'account_type' })
  accountType!: AccountType;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
