// -> backend/src/modules/terms/terms.controller.ts (full replacement)
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TermsService } from './terms.service';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';

@Controller('terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Post()
  create(@Body() dto: CreateTermDto) {
    return this.termsService.create(dto);
  }

  @Get()
  findAll() {
    return this.termsService.findAll();
  }

  @Get('active')
  findActive() {
    return this.termsService.findActive();
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.termsService.setActive(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTermDto) {
    return this.termsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.termsService.remove(id);
  }
}