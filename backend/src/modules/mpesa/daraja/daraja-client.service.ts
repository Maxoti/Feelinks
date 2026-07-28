import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface StkPushParams {
  phone: string;            // 2547XXXXXXXX
  amount: number;
  shortcode: string;
  shortcodeType: 'till' | 'paybill';
  passkey: string;
  accountReference: string; // invoice id / admission no — ties callback back to invoice
  transactionDesc: string;
  callbackUrl: string;
}

@Injectable()
export class DarajaClientService {
  private readonly logger = new Logger(DarajaClientService.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl =
      this.config.get<string>('DARAJA_ENV') === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';
  }

  private async getAccessToken(): Promise<string> {
    const key = this.config.get<string>('DARAJA_CONSUMER_KEY');
    const secret = this.config.get<string>('DARAJA_CONSUMER_SECRET');
    const auth = Buffer.from(`${key}:${secret}`).toString('base64');

    try {
      const { data } = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        { headers: { Authorization: `Basic ${auth}` } },
      );
      return data.access_token;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        this.logger.error(
          `Daraja OAuth failed [${err.response?.status}]: ${JSON.stringify(err.response?.data)}`,
        );
      }
      throw err;
    }
  }

  private buildPassword(shortcode: string, passkey: string, timestamp: string): string {
    return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  }

  private timestamp(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
      `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
    );
  }

  async initiateStkPush(params: StkPushParams): Promise<{
    checkoutRequestId: string;
    merchantRequestId: string;
  }> {
    const token = await this.getAccessToken();
    const timestamp = this.timestamp();
    const password = this.buildPassword(params.shortcode, params.passkey, timestamp);

    const transactionType =
      params.shortcodeType === 'till' ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline';

    const payload = {
      BusinessShortCode: params.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: Math.round(params.amount), // Daraja rejects decimals — force integer
      PartyA: params.phone,
      PartyB: 4800959,
      PhoneNumber: params.phone,
      CallBackURL: params.callbackUrl.trim(),
      AccountReference: params.accountReference,
      TransactionDesc: params.transactionDesc,
    };

    this.logger.debug(`STK push payload: ${JSON.stringify(payload)}`);

    try {
      const { data } = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (data.ResponseCode !== '0') {
        this.logger.error(`STK initiate rejected: ${data.ResponseDescription}`);
        throw new Error(`STK push rejected: ${data.ResponseDescription}`);
      }

      return {
        checkoutRequestId: data.CheckoutRequestID,
        merchantRequestId: data.MerchantRequestID,
      };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        this.logger.error(
          `Daraja STK push failed [${err.response?.status}]: ${JSON.stringify(err.response?.data)}`,
        );
      }
      throw err;
    }
  }

  async registerC2BUrls(params: {
    shortcode: string;
    confirmationUrl: string;
    validationUrl: string;
  }): Promise<void> {
    const token = await this.getAccessToken();

    try {
      await axios.post(
        `${this.baseUrl}/mpesa/c2b/v1/registerurl`,
        {
          ShortCode: params.shortcode,
          ResponseType: 'Completed',
          ConfirmationURL: params.confirmationUrl,
          ValidationURL: params.validationUrl,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err) {
      if (axios.isAxiosError(err)) {
        this.logger.error(
          `Daraja C2B URL registration failed [${err.response?.status}]: ${JSON.stringify(err.response?.data)}`,
        );
      }
      throw err;
    }
  }
}