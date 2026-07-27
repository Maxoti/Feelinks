import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type StudentStatus = 'active' | 'inactive' | 'graduated' | 'transferred';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_no', unique: true })
  admissionNo!: string;

  @Column({ name: 'full_name' })
  fullName!: string;

  @Column({ nullable: true })
  grade!: string;

  @Column({ name: 'parent_name', nullable: true })
  parentName!: string;

  @Column({ name: 'parent_phone' })
  parentPhone!: string;

  @Column({ default: 'active' })
  status!: StudentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
