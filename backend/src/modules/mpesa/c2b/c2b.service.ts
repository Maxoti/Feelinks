import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MpesaTransaction } from '../../../database/entities/mpesa-transaction.entity';
import { BusinessAccountsService } from '../../business-accounts/business-accounts.service';
import { ReconciliationService } from '../reconciliation/reconciliation.service';
import { PaymentsGateway } from '../../realtime/payments.gateway';

export interface C2BConfirmationPayload {
  TransactionType: string;
  TransID: string;
  TransTime: string;
  TransAmount: string;
  BusinessShortCode: string;
  BillRefNumber?: string;
  MSISDN: string;
}

@Injectable()
export class C2BService {
  private readonly logger = new Logger(C2BService.name);

  constructor(
    @InjectRepository(MpesaTransaction) private readonly txRepo: Repository<MpesaTransaction>,
    private readonly businessAccounts: BusinessAccountsService,
    private readonly reconciliation: ReconciliationService,
    private readonly paymentsGateway: PaymentsGateway,
  ) {}

  private parseTransTime(raw: string): Date {
    const y = raw.slice(0, 4), mo = raw.slice(4, 6), d = raw.slice(6, 8);
    const h = raw.slice(8, 10), mi = raw.slice(10, 12), s = raw.slice(12, 14);
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
  }

  async handleConfirmation(payload: C2BConfirmationPayload): Promise<{ id: string; alreadyExisted: boolean }> {
    const account = await this.businessAccounts.findByShortcode(payload.BusinessShortCode);

    const billRef = account.accountType === 'till' ? null : (payload.BillRefNumber?.trim() || null);

    const existing = await this.txRepo.findOne({ where: { transId: payload.TransID } });
    if (existing) {
      this.logger.log(`Duplicate C2B confirmation for ${payload.TransID}, ignoring`);
      return { id: existing.id, alreadyExisted: true };
    }

    const saved = await this.txRepo.save(
      this.txRepo.create({
        channel: 'c2b',
        businessAccountId: account.id,
        accountType: account.accountType,
        transId: payload.TransID,
        msisdn: payload.MSISDN,
        transAmount: payload.TransAmount,
        billRefNumber: billRef,
        transTime: this.parseTransTime(payload.TransTime),
        status: 'unmatched',
        rawPayload: payload as unknown as Record<string, unknown>,
      }),
    );

    // Bursar sees "money incoming" immediately, before matching completes.
    this.paymentsGateway.emitPaymentReceived({
      transactionId: saved.id,
      invoiceId: null,
      amount: saved.transAmount,
      msisdn: saved.msisdn,
      channel: 'c2b',
      status: 'unmatched',
      transTime: saved.transTime.toISOString(),
    });

    await this.reconciliation.processTransaction(saved.id);

    return { id: saved.id, alreadyExisted: false };
  }
}