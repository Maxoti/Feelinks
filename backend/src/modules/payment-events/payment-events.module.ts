import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEvent } from '../../database/entities/payment-event.entity';
import { PaymentEventsService } from './payment-events.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEvent])],
  providers: [PaymentEventsService],
  exports: [PaymentEventsService],
})
export class PaymentEventsModule {}
