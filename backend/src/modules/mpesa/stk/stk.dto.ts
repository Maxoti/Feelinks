import { IsNotEmpty, IsUUID, Matches } from 'class-validator';

export class InitiateStkDto {
  @IsUUID()
  invoiceId!: string;

  @Matches(/^254[17]\d{8}$/, { message: 'phone must be 2547XXXXXXXX / 2541XXXXXXXX' })
  @IsNotEmpty()
  phone!: string;
}
