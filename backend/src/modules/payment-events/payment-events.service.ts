import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PaymentEvent } from '../../database/entities/payment-event.entity';

@Injectable()
export class PaymentEventsService {
  constructor(
    @InjectRepository(PaymentEvent) private readonly repo: Repository<PaymentEvent>,
  ) {}

  // Accepts an optional EntityManager so callers composing a larger DB
  // transaction (matching + ledger update + audit log) can write the audit
  // row atomically with everything else, instead of as an afterthought.
  async log(
    params: {
      transactionId?: string | null;
      invoiceId?: string | null;
      eventType: string;
      actor?: string;
      payload?: Record<string, unknown>;
    },
    manager?: EntityManager,
  ): Promise<PaymentEvent> {
    const repo = manager ? manager.getRepository(PaymentEvent) : this.repo;
    return repo.save(
      repo.create({
        transactionId: params.transactionId ?? null,
        invoiceId: params.invoiceId ?? null,
        eventType: params.eventType,
        actor: params.actor ?? 'system',
        payload: params.payload ?? {},
      }),
    );
  }

  findByTransaction(transactionId: string): Promise<PaymentEvent[]> {
    return this.repo.find({ where: { transactionId }, order: { createdAt: 'ASC' } });
  }
}
