import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly svc: TransactionsService) {}

  @Get()
  list(@Query('status') status = 'unmatched') {
    return this.svc.list(status);
  }

  @Get(':id/candidates')
  candidates(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.candidates(id);
  }

  @Post(':id/assign')
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() body: { invoiceId?: string }) {
    if (!body?.invoiceId) throw new BadRequestException('invoiceId is required');
    return this.svc.assign(id, body.invoiceId);
  }
}