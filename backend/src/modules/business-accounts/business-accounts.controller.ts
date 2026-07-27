import { Body, Controller, Get, Post } from '@nestjs/common';
import { BusinessAccountsService } from './business-accounts.service';
import { CreateBusinessAccountDto } from './dto/create-business-account.dto';

@Controller('business-accounts')
export class BusinessAccountsController {
  constructor(private readonly service: BusinessAccountsService) {}

  @Post()
  create(@Body() dto: CreateBusinessAccountDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
