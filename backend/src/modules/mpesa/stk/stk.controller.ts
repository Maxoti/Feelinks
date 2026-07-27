import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { StkService, StkCallbackPayload } from './stk.service';
import { InitiateStkDto } from './stk.dto';

@Controller('mpesa/stk')
export class StkController {
  constructor(private readonly stkService: StkService) {}

  @Post('initiate')
  initiate(@Body() dto: InitiateStkDto) {
    return this.stkService.initiate(dto.invoiceId, dto.phone);
  }

  @Post('callback')
  @HttpCode(200)
  async callback(@Body() payload: StkCallbackPayload) {
    await this.stkService.handleCallback(payload);
    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }
}
