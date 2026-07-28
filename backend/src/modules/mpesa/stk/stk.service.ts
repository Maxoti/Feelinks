import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { StkRequest } from '../../../database/entities/stk-request.entity';
import { MpesaTransaction } from '../../../database/entities/mpesa-transaction.entity';
import { InvoicesService } from '../../invoices/invoices.service';
import { BusinessAccountsService } from '../../business-accounts/business-accounts.service';
import { DarajaClientService } from '../daraja/daraja-client.service';
import { ReconciliationService } from '../reconciliation/reconciliation.service';

export interface StkCallbackPayload {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value?: string | number }>;
      };
    };
  };
}

@Injectable()
export class StkService {
  private readonly logger = new Logger(StkService.name);

  constructor(
    @InjectRepository(StkRequest) private readonly stkRepo: Repository<StkRequest>,
    @InjectRepository(MpesaTransaction) private readonly txRepo: Repository<MpesaTransaction>,
    private readonly invoicesService: InvoicesService,
    private readonly businessAccounts: BusinessAccountsService,
    private readonly darajaClient: DarajaClientService,
    private readonly reconciliation: ReconciliationService,
    private readonly config: ConfigService,
  ) {}

  async initiate(invoiceId: string, phone: string): Promise<StkRequest> {
    const invoice = await this.invoicesService.findOne(invoiceId);

    // DB partial unique index (idx_stk_requests_one_pending_per_invoice) is
    // the hard backstop; this check gives a clean error instead of a 500.
    const existingPending = await this.stkRepo.findOne({
      where: { invoiceId, status: 'pending' },
    });
    if (existingPending) {
      throw new ConflictException('An STK push is already pending for this invoice');
    }

    const shortcode = this.config.get<string>('DARAJA_SHORTCODE')!;
    const shortcodeType = this.config.get<string>('DARAJA_SHORTCODE_TYPE') as 'till' | 'paybill';
    const account = await this.businessAccounts.findByShortcode(shortcode);

    const { checkoutRequestId, merchantRequestId } = await this.darajaClient.initiateStkPush({
      phone,
      amount: Number(invoice.balance),
      shortcode,
      shortcodeType,
      passkey: this.config.get<string>('DARAJA_PASSKEY')!,
      accountReference: invoice.id,
      transactionDesc: 'School fees payment',
      callbackUrl: this.config.get<string>('DARAJA_STK_CALLBACK_URL')!.trim(),
    });

    return this.stkRepo.save(
      this.stkRepo.create({
        invoiceId,
        businessAccountId: account.id,
        checkoutRequestId,
        merchantRequestId,
        phone,
        amount: invoice.balance,
        status: 'pending',
      }),
    );
  }

  private extractMeta(items: Array<{ Name: string; Value?: string | number }>, name: string) {
    return items.find((i) => i.Name === name)?.Value;
  }

  async handleCallback(payload: StkCallbackPayload): Promise<void> {
    const cb = payload.Body.stkCallback;

    const stkRequest = await this.stkRepo.findOne({
      where: { checkoutRequestId: cb.CheckoutRequestID },
    });
    if (!stkRequest) {
      this.logger.warn(`STK callback for unknown CheckoutRequestID ${cb.CheckoutRequestID}`);
      return;
    }
    if (stkRequest.status !== 'pending') {
      this.logger.log(`STK callback for ${cb.CheckoutRequestID} already resolved, ignoring`);
      return; // idempotent no-op — Daraja can resend callbacks
    }

    if (cb.ResultCode !== 0) {
      await this.stkRepo.update(stkRequest.id, {
        status: cb.ResultCode === 1032 ? 'timeout' : 'failed',
        resultCode: cb.ResultCode,
        resultDesc: cb.ResultDesc,
        resolvedAt: new Date(),
      });
      return;
    }

    const items = cb.CallbackMetadata?.Item ?? [];
    const amount = String(this.extractMeta(items, 'Amount'));
    const mpesaReceiptNumber = String(this.extractMeta(items, 'MpesaReceiptNumber'));
    const phoneNumber = String(this.extractMeta(items, 'PhoneNumber'));
    const transDateRaw = String(this.extractMeta(items, 'TransactionDate'));

    await this.stkRepo.update(stkRequest.id, {
      status: 'success',
      resultCode: cb.ResultCode,
      resultDesc: cb.ResultDesc,
      mpesaReceiptNumber,
      resolvedAt: new Date(),
    });

    const existingTx = await this.txRepo.findOne({ where: { transId: mpesaReceiptNumber } });
    if (existingTx) {
      this.logger.log(`Duplicate STK receipt ${mpesaReceiptNumber}, skipping transaction insert`);
      return;
    }

    const businessAccount = await this.businessAccounts.findByShortcode(
      this.config.get<string>('DARAJA_SHORTCODE')!,
    );

    // STK already knows the invoice — no fuzzy matching needed. Insert
    // directly as 'matched' and hand straight to the reconciler, skipping
    // the matching step entirely.
    const tx = await this.txRepo.save(
      this.txRepo.create({
        channel: 'stk',
        businessAccountId: businessAccount.id,
        accountType: businessAccount.accountType,
        transId: mpesaReceiptNumber,
        msisdn: phoneNumber,
        transAmount: amount,
        billRefNumber: null,
        transTime: this.parseStkTimestamp(transDateRaw),
        stkRequestId: stkRequest.id,
        matchedInvoiceId: stkRequest.invoiceId,
        status: 'matched',
        matchConfidence: '1.000',
        rawPayload: payload as unknown as Record<string, unknown>,
      }),
    );

    await this.reconciliation.manuallyAssign(tx.id, stkRequest.invoiceId, 'system:stk_callback');
  }

  private parseStkTimestamp(raw: string): Date {
    // yyyyMMddHHmmss
    const y = raw.slice(0, 4), mo = raw.slice(4, 6), d = raw.slice(6, 8);
    const h = raw.slice(8, 10), mi = raw.slice(10, 12), s = raw.slice(12, 14);
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
  }
}