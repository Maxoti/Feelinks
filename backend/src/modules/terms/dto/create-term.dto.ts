import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateTermDto {
  @IsInt() @Min(2000) @Max(2100)
  year: number;

  @IsIn([1, 2, 3])
  termNumber: number;

  @IsString() @IsNotEmpty()
  name: string;

  @IsBoolean() @IsOptional()
  isActive?: boolean;
}
