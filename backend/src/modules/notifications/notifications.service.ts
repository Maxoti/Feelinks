import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from '../../database/entities/notification.entity';
import { MobiwaveProvider } from './mobiwave.provider';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity) private readonly repo: Repository<NotificationEntity>,
    private readonly mobiwave: MobiwaveProvider,
  ) {}

  async sendReceiptSms(params: {
    invoiceId: string;
    transactionId: string;
    phone: string;
    studentName: string;
    amount: string;
    balance: string;
    receiptUrl: string;
    mpesaReceiptNumber: string;
  }): Promise<NotificationEntity> {
    const message =
      `KES ${params.amount} received for ${params.studentName}. ` +
      `New balance: KES ${params.balance}. Receipt: ${params.receiptUrl} ` +
      `Ref: ${params.mpesaReceiptNumber}`;

    const notification = this.repo.create({
      invoiceId: params.invoiceId,
      transactionId: params.transactionId,
      channel: 'sms',
      recipient: params.phone,
      message,
      status: 'pending',
    });
    const saved = await this.repo.save(notification);

    const result = await this.mobiwave.send(params.phone, message);

    if (result.success) {
      await this.repo.update(saved.id, {
        status: 'sent',
        providerRef: result.messageId ?? '',
        sentAt: new Date(),
      });
    } else {
      this.logger.error(`SMS delivery failed for notification ${saved.id}: ${result.error}`);
      await this.repo.increment({ id: saved.id }, 'retryCount', 1);
      await this.repo.update(saved.id, { status: 'failed' });
    }

    return this.repo.findOneOrFail({ where: { id: saved.id } });
  }
}
