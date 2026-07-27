import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { TermsService } from './terms.service';
import { CreateTermDto } from './dto/create-term.dto';

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
}
