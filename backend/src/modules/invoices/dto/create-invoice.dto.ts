import { IsNotEmpty, IsNumberString, IsUUID } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  termId: string;

  @IsNumberString() @IsNotEmpty()
  amountDue: string;
}
