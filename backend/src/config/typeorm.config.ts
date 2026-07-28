import 'dotenv/config';
import { DataSourceOptions } from 'typeorm';
import { Student } from '../database/entities/student.entity';
import { Term } from '../database/entities/term.entity';
import { Invoice } from '../database/entities/invoice.entity';
import { BusinessAccount } from '../database/entities/business-account.entity';
import { StkRequest } from '../database/entities/stk-request.entity';
import { MpesaTransaction } from '../database/entities/mpesa-transaction.entity';
import { Receipt } from '../database/entities/receipt.entity';
import { PaymentEvent } from '../database/entities/payment-event.entity';
import { NotificationEntity } from '../database/entities/notification.entity';

// Table structure, constraints, and triggers are owned by schema.sql —
// TypeORM here runs with synchronize: false. Entities mirror the schema;
// any future migrations should be additive, never auto-synced.
export const typeOrmConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    Student,
    Term,
    Invoice,
    BusinessAccount,
    StkRequest,
    MpesaTransaction,
    Receipt,
    PaymentEvent,
    NotificationEntity,
  ],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  extra:{
    max:5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  },
};
