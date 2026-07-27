import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from './student.entity';
import { Term } from './term.entity';

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'overpaid';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student!: Student;

  @Column({ name: 'term_id' })
  termId!: string;

  @ManyToOne(() => Term)
  @JoinColumn({ name: 'term_id' })
  term!: Term;

  @Column({ name: 'amount_due', type: 'numeric', precision: 12, scale: 2 })
  amountDue!: string;

  @Column({ name: 'amount_paid', type: 'numeric', precision: 12, scale: 2, default: 0 })
  amountPaid!: string;

  // Generated column in Postgres (amount_due - amount_paid) — read-only here.
  @Column({ type: 'numeric', precision: 12, scale: 2, insert: false, update: false })
  balance!: string;

  @Column({ default: 'unpaid' })
  status!: InvoiceStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
