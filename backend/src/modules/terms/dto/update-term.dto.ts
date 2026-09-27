// -> backend/src/modules/terms/dto/update-term.dto.ts (new file)
// Same fields as CreateTermDto, all optional (PATCH semantics). No `name` here either.
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateTermDto {
  @IsInt() @Min(2000) @Max(2100) @IsOptional()
  year?: number;

  @IsIn([1, 2, 3]) @IsOptional()
  termNumber?: number;

  @IsBoolean() @IsOptional()
  isActive?: boolean;
}