import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { typeOrmConfig } from './config/typeorm.config';

import { StudentsModule } from './modules/students/students.module';
import { TermsModule } from './modules/terms/terms.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { BusinessAccountsModule } from './modules/business-accounts/business-accounts.module';
import { MpesaModule } from './modules/mpesa/mpesa.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentEventsModule } from './modules/payment-events/payment-events.module';
import { RealtimeModule } from './modules/realtime/realtime.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(typeOrmConfig),
    BullModule.forRoot({
      connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
    }),
    ScheduleModule.forRoot(),
    StudentsModule,
    TermsModule,
    InvoicesModule,
    BusinessAccountsModule,
    MpesaModule,
    ReceiptsModule,
    NotificationsModule,
    PaymentEventsModule,
  ],
})
export class AppModule {}
