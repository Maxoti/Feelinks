import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface PaymentReceivedPayload {
  transactionId: string;
  invoiceId: string | null;
  studentId?: string;
  amount: string;
  msisdn: string;
  channel: 'c2b' | 'stk';
  status: 'matched' | 'reconciled' | 'unmatched';
  transTime: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.APP_BASE_URL ?? '*',
  },
  namespace: '/payments',
})
export class PaymentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PaymentsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Bursar client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Bursar client disconnected: ${client.id}`);
  }

  emitPaymentReceived(payload: PaymentReceivedPayload) {
    this.logger.log(`Broadcasting payment:received — ${payload.transactionId}`);
    this.server.emit('payment:received', payload);
  }
}
