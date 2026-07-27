import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateBusinessAccountDto {
  @IsString() @IsNotEmpty()
  label: string;

  @IsString() @IsNotEmpty()
  shortcode: string;

  @IsIn(['paybill', 'till'])
  accountType: 'paybill' | 'till';
}
