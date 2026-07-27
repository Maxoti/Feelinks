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
    await this.dataSource.transaction(async (manager) => {
      const transaction = await manager
        .createQueryBuilder(MpesaTransaction, 'tx')
        .setLock('pessimistic_write')
        .where('tx.id = :transactionId', { transactionId })
        .getOne();

      if (!transaction || transaction.status !== 'unmatched') {
        return;
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

        return;
      }

      await this.reconcile(manager, transaction, match);
    });
  }

  async manuallyAssign(transactionId: string, invoiceId: string, actor: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const transaction = await manager
        .createQueryBuilder(MpesaTransaction, 'tx')
        .setLock('pessimistic_write')
        .where('tx.id = :transactionId', { transactionId })
        .getOne();

      if (!transaction || transaction.status === 'reconciled') return;

      await this.reconcile(manager, transaction, {
        invoiceId,
        confidence: 1.0,
        reason: 'manual_assignment',
      });
      await this.paymentEvents.log(
        { transactionId, invoiceId, eventType: 'manually_assigned', actor },
        manager,
      );
    });
  }

  private async reconcile(
    manager: EntityManager,
    transaction: MpesaTransaction,
    match: MatchResult,
  ): Promise<void> {
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

    const student = await manager.findOne(Student, { where: { id: invoice.studentId } });

    const receipt = await this.receiptsService.generateForTransaction({
      transactionId: transaction.id,
      invoiceId: match.invoiceId,
      studentName: student?.fullName ?? 'Unknown',
      admissionNo: student?.admissionNo ?? '',
      termName: '',
      amountPaid: transaction.transAmount,
      balance: invoice.balance,
      mpesaReceiptNumber: transaction.transId,
      paidAt: transaction.transTime,
    });

    if (student) {
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
    }

    this.paymentsGateway.emitPaymentReceived({
      transactionId: transaction.id,
      invoiceId: match.invoiceId,
      studentId: student?.id,
      amount: transaction.transAmount,
      msisdn: transaction.msisdn,
      channel: transaction.channel,
      status: 'reconciled',
      transTime: transaction.transTime.toISOString(),
    });
  }
}