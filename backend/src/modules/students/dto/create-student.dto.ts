import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateStudentDto {
  @IsString() @IsNotEmpty()
  admissionNo: string;

  @IsString() @IsNotEmpty()
  fullName: string;

  @IsString() @IsOptional()
  grade?: string;

  @IsString() @IsOptional()
  parentName?: string;

  @Matches(/^254[17]\d{8}$/, { message: 'parentPhone must be in 2547XXXXXXXX / 2541XXXXXXXX format' })
  parentPhone: string;

  @IsIn(['active', 'inactive', 'graduated', 'transferred'])
  @IsOptional()
  status?: string;
}
