import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { C2BService, C2BConfirmationPayload } from './c2b.service';

@Controller('mpesa/c2b')
export class C2BController {
  constructor(private readonly c2bService: C2BService) {}

  // Daraja calls this before the transaction completes. Always accept
  // unless you have a specific reason to reject (e.g. blocklisted MSISDN) —
  // rejecting here cancels the payment on the customer's phone.
  @Post('validation')
  @HttpCode(200)
  validate() {
    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }

  @Post('confirmation')
  @HttpCode(200)
  async confirm(@Body() payload: C2BConfirmationPayload) {
    await this.c2bService.handleConfirmation(payload);
    // Always return 200 to Safaricom, regardless of internal matching outcome —
    // matching failures are an internal concern, not a callback failure.
    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }
}
