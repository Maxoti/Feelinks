import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
// >>> Use the module you found in Step 1: the one that EXPORTS ReconciliationService <
import { MpesaModule } from '../mpesa/mpesa.module';

@Module({
  imports: [MpesaModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
