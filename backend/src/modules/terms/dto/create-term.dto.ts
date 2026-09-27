// -> backend/src/modules/terms/dto/create-term.dto.ts (full replacement)
// `name` removed: it's now always derived server-side from termNumber+year in
// TermsService, so a mismatch like "Term 2 2026" on a termNumber=1 row (the
// bug you just fixed by hand in the DB) can no longer happen.
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateTermDto {
  @IsInt() @Min(2000) @Max(2100)
  year!: number;

  @IsIn([1, 2, 3])
  termNumber!: number;

  @IsBoolean() @IsOptional()
  isActive?: boolean;
}