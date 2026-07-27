import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MpesaTransaction } from '../../database/entities/mpesa-transaction.entity';
import { StkRequest } from '../../database/entities/stk-request.entity';

import { BusinessAccountsModule } from '../business-accounts/business-accounts.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentEventsModule } from '../payment-events/payment-events.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';

import { DarajaClientService } from './daraja/daraja-client.service';
import { ReconciliationService } from './reconciliation/reconciliation.service';
import { C2BController } from './c2b/c2b.controller';
import { C2BService } from './c2b/c2b.service';
import { StkController } from './stk/stk.controller';
import { StkService } from './stk/stk.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MpesaTransaction, StkRequest]),
    BusinessAccountsModule,
    InvoicesModule,
    PaymentEventsModule,
    ReceiptsModule,
    NotificationsModule,
    RealtimeModule,
  ],
  controllers: [C2BController, StkController],
  providers: [DarajaClientService, ReconciliationService, C2BService, StkService],
  exports: [ReconciliationService],
})
export class MpesaModule {}