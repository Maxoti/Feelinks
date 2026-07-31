import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { MpesaTransaction } from '../../../database/entities/mpesa-transaction.entity';
import { Student } from '../../../database/entities/student.entity';
import { Invoice } from '../../../database/entities/invoice.entity';
import { InvoicesService } from '../../invoices/invoices.service';
import { PaymentEventsService } from '../../payment-events/payment-events.service';
import { ReceiptsService } from '../../receipts/receipts.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PaymentsGateway } from '../../realtime/payments.gateway';

export interface MatchResult {
  invoiceId: string;
  confidence: number;
  reason: string;
}

interface ReconcileOutcome {
  transaction: MpesaTransaction;
  invoice: Invoice;
  match: MatchResult;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);
  private readonly AUTO_MATCH_THRESHOLD = 0.85;

  constructor(
    private readonly dataSource: DataSource,
    private readonly invoicesService: InvoicesService,
    private readonly paymentEvents: PaymentEventsService,
    private readonly receiptsService: ReceiptsService,
    private readonly notificationsService: NotificationsService,
    private readonly paymentsGateway: PaymentsGateway,
  ) {}

  async findMatch(
    manager: EntityManager,
    transaction: MpesaTransaction,
  ): Promise<MatchResult | null> {
    if (transaction.accountType === 'paybill' && transaction.billRefNumber) {
      const exact = await this.matchByAdmissionNo(manager, transaction.billRefNumber.trim());
      if (exact) return { invoiceId: exact, confidence: 1.0, reason: 'exact_admission_no' };

      const normalized = await this.matchByAdmissionNo(
        manager,
        this.normalizeRef(transaction.billRefNumber),
      );
      if (normalized) return { invoiceId: normalized, confidence: 0.9, reason: 'normalized_admission_no' };
    }

    return this.matchByPhoneAndAmount(manager, transaction);
  }

  private normalizeRef(raw: string): string {
    return raw.trim().toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
  }

  private async matchByAdmissionNo(
    manager: EntityManager,
    admissionNo: string,
  ): Promise<string | null> {
    const student = await manager.findOne(Student, { where: { admissionNo } });
    if (!student) return null;
    return this.findOpenInvoiceForStudent(manager, student.id);
  }

  private async matchByPhoneAndAmount(
    manager: EntityManager,
    transaction: MpesaTransaction,
  ): Promise<MatchResult | null> {
    const candidates = await manager.find(Student, { where: { parentPhone: transaction.msisdn } });

    if (candidates.length === 0) return null;

    if (candidates.length === 1) {
      const invoiceId = await this.findOpenInvoiceForStudent(manager, candidates[0].id);
      if (invoiceId) {
        return { invoiceId, confidence: 0.7, reason: 'single_phone_match' };
      }
      return null;
    }

    for (const student of candidates) {
      const invoice = await manager.findOne(Invoice, {
        where: { studentId: student.id },
        order: { createdAt: 'DESC' },
      });
      if (invoice && invoice.balance === transaction.transAmount) {
        return { invoiceId: invoice.id, confidence: 0.75, reason: 'phone_and_exact_balance_match' };
      }
    }

    return null;
  }

  private async findOpenInvoiceForStudent(
    manager: EntityManager,
    studentId: string,
  ): Promise<string | null> {
    const invoice = await manager
      .createQueryBuilder(Invoice, 'invoice')
      .where('invoice.student_id = :studentId', { studentId })
      .andWhere('invoice.status IN (:...statuses)', { statuses: ['unpaid', 'partial'] })
      .orderBy('invoice.created_at', 'DESC')
      .getOne();
    return invoice?.id ?? null;
  }

  async processTransaction(transactionId: string): Promise<void> {
    const outcome = await this.dataSource.transaction<ReconcileOutcome | null>(async (manager) => {
      const transaction = await manager
        .createQueryBuilder(MpesaTransaction, 'tx')
        .setLock('pessimistic_write')
        .where('tx.id = :transactionId', { transactionId })
        .getOne();

      if (!transaction || transaction.status !== 'unmatched') {
        return null;
      }

      const match = await this.findMatch(manager, transaction);

      if (!match || match.confidence < this.AUTO_MATCH_THRESHOLD) {
        await manager.update(MpesaTransaction, { id: transactionId }, {
          status: 'unmatched',
          matchConfidence: match ? match.confidence.toFixed(3) : null,
        });
        await this.paymentEvents.log(
          {
            transactionId,
            eventType: match ? 'low_confidence_match' : 'no_match_found',
            payload: match ? { reason: match.reason, confidence: match.confidence } : {},
          },
          manager,
        );

        this.paymentsGateway.emitPaymentReceived({
          transactionId: transaction.id,
          invoiceId: null,
          amount: transaction.transAmount,
          msisdn: transaction.msisdn,
          channel: transaction.channel,
          status: 'unmatched',
          transTime: transaction.transTime.toISOString(),
        });

        return null;
      }

      const { transaction: reconciledTx, invoice } = await this.reconcile(manager, transaction, match);
      return { transaction: reconciledTx, invoice, match };
    });

    // Only reached once the transaction above has actually committed —
    // side effects can never roll back a payment that's already recorded.
    if (outcome) {
      const { transaction, invoice, match } = outcome;
      this.finishSideEffects(transaction, match, invoice).catch((err) => {
        this.logger.error(
          `Post-reconcile side effects failed for tx ${transaction.id} (payment itself is safe)`,
          err as Error,
        );
      });
    }
  }

  async manuallyAssign(transactionId: string, invoiceId: string, actor: string): Promise<void> {
    const outcome = await this.dataSource.transaction<ReconcileOutcome | null>(async (manager) => {
      const transaction = await manager
        .createQueryBuilder(MpesaTransaction, 'tx')
        .setLock('pessimistic_write')
        .where('tx.id = :transactionId', { transactionId })
        .getOne();

      if (!transaction || transaction.status === 'reconciled') return null;

      const match: MatchResult = {
        invoiceId,
        confidence: 1.0,
        reason: 'manual_assignment',
      };

      const { transaction: reconciledTx, invoice } = await this.reconcile(manager, transaction, match);

      await this.paymentEvents.log(
        { transactionId, invoiceId, eventType: 'manually_assigned', actor },
        manager,
      );

      return { transaction: reconciledTx, invoice, match };
    });

    // Fire side effects only after the whole DB transaction above has
    // committed successfully — never inside it.
    if (outcome) {
      const { transaction, invoice, match } = outcome;
      this.finishSideEffects(transaction, match, invoice).catch((err) => {
        this.logger.error(
          `Post-reconcile side effects failed for tx ${transaction.id} (payment itself is safe)`,
          err as Error,
        );
      });
    }
  }

  /**
   * Applies the payment and marks the transaction reconciled. Everything in
   * here runs inside the caller's transaction (`manager`) and must stay
   * strictly limited to DB writes that need to be atomic with each other.
   * No external calls (PDF storage, SMS, websockets) belong in this method —
   * see finishSideEffects() for those.
   */
  private async reconcile(
    manager: EntityManager,
    transaction: MpesaTransaction,
    match: MatchResult,
  ): Promise<{ transaction: MpesaTransaction; invoice: Invoice }> {
    const invoice = await this.invoicesService.applyPayment(
      manager,
      match.invoiceId,
      transaction.transAmount,
    );

    await manager.update(
      MpesaTransaction,
      { id: transaction.id },
      {
        status: 'reconciled',
        matchedInvoiceId: match.invoiceId,
        matchConfidence: match.confidence.toFixed(3),
        reconciledAt: new Date(),
      },
    );

    await this.paymentEvents.log(
      {
        transactionId: transaction.id,
        invoiceId: match.invoiceId,
        eventType: 'reconciled',
        payload: { reason: match.reason, confidence: match.confidence },
      },
      manager,
    );

    return {
      transaction: { ...transaction, status: 'reconciled', matchedInvoiceId: match.invoiceId },
      invoice,
    };
  }

  /**
   * Non-transactional side effects that follow a successful reconcile:
   * receipt generation, SMS notification, websocket broadcast. Runs after
   * the DB transaction has committed. Failures here are logged, not thrown
   * back into the caller — the payment is already safely recorded.
   */
  private async finishSideEffects(
    transaction: MpesaTransaction,
    match: MatchResult,
    invoice: Invoice,
  ): Promise<void> {
    const student = await this.dataSource.manager.findOne(Student, {
      where: { id: invoice.studentId },
    });

    if (!student) {
      this.logger.warn(
        `No student found for invoice ${invoice.id} (studentId ${invoice.studentId}) — ` +
          `skipping receipt/SMS for tx ${transaction.id}`,
      );
      this.paymentsGateway.emitPaymentReceived({
        transactionId: transaction.id,
        invoiceId: match.invoiceId,
        amount: transaction.transAmount,
        msisdn: transaction.msisdn,
        channel: transaction.channel,
        status: 'reconciled',
        transTime: transaction.transTime.toISOString(),
      });
      return;
    }

    const receipt = await this.receiptsService.generateForTransaction({
      transactionId: transaction.id,
      invoiceId: match.invoiceId,
      studentName: student.fullName,
      admissionNo: student.admissionNo,
      termName: '',
      amountPaid: transaction.transAmount,
      balance: invoice.balance,
      mpesaReceiptNumber: transaction.transId,
      paidAt: transaction.transTime,
    });

    await this.notificationsService.sendReceiptSms({
      invoiceId: match.invoiceId,
      transactionId: transaction.id,
      phone: student.parentPhone,
      studentName: student.fullName,
      amount: transaction.transAmount,
      balance: invoice.balance,
      receiptUrl: receipt.pdfUrl,
      mpesaReceiptNumber: transaction.transId,
    });

    this.paymentsGateway.emitPaymentReceived({
      transactionId: transaction.id,
      invoiceId: match.invoiceId,
      studentId: student.id,
      amount: transaction.transAmount,
      msisdn: transaction.msisdn,
      channel: transaction.channel,
      status: 'reconciled',
      transTime: transaction.transTime.toISOString(),
    });
  }
}