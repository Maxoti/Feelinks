import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface MobiwaveSendResult {
  success: boolean;
  messageId: string | null;
  status: 'SENT' | 'FAILED';
  error?: string;
  raw?: unknown;
}

/**
 * Ported from the working Mobiwave/TalkSasa integration proven in Msingi
 * (notifications/sms/mobiwave.provider.js). Key things carried over
 * deliberately, since they were the actual fixes that made it work there:
 *  - Auth is `Authorization: Bearer <token>`, not an API-key query param.
 *  - Body fields are `recipient` / `sender_id` / `type` / `message`.
 *  - Success is determined by *parsing the response body*, not just a
 *    non-error HTTP status — Mobiwave can return 200 with a failure payload.
 */
@Injectable()
export class MobiwaveProvider {
  private readonly logger = new Logger(MobiwaveProvider.name);
  private readonly apiUrl: string;
  private readonly apiToken: string;
  private readonly senderId: string;

  constructor(private readonly config: ConfigService) {
    this.apiUrl = this.config.get<string>('MOBIWAVE_API_URL') ?? 'https://sms.mobiwave.co.ke/api/v3/sms';
    this.apiToken = this.config.get<string>('MOBIWAVE_API_TOKEN') ?? '';
    this.senderId = this.config.get<string>('MOBIWAVE_SENDER_ID') ?? 'SCHOOL';

    if (!this.apiToken) {
      this.logger.warn('MOBIWAVE_API_TOKEN not configured in environment variables');
    }
  }

  async send(recipient: string, message: string): Promise<MobiwaveSendResult> {
    if (!this.apiToken) {
      return { success: false, messageId: null, status: 'FAILED', error: 'Mobiwave API token not configured' };
    }

    const formattedPhone = this.formatPhoneNumber(recipient);

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          recipient: formattedPhone,
          sender_id: this.senderId,
          type: 'plain',
          message,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 30_000,
        },
      );

      const parsed = this.parseResponse(response.data);

      if (!parsed.success) {
        this.logger.warn(`Mobiwave rejected SMS to ${formattedPhone}: ${parsed.message}`);
        return { success: false, messageId: null, status: 'FAILED', error: parsed.message, raw: parsed.raw };
      }

      return { success: true, messageId: parsed.messageId, status: 'SENT', raw: parsed.raw };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message ?? err.message;
      this.logger.error(`Mobiwave send failed for ${formattedPhone}: ${errorMessage}`);
      return { success: false, messageId: null, status: 'FAILED', error: errorMessage };
    }
  }

  private formatPhoneNumber(phone: string): string {
    const cleaned = String(phone).replace(/[\s\-()+]/g, '');
    if (cleaned.startsWith('254')) return cleaned;
    if (cleaned.startsWith('0')) return '254' + cleaned.substring(1);
    if (cleaned.startsWith('7') || cleaned.startsWith('1')) return '254' + cleaned;
    return cleaned;
  }

  private parseResponse(data: any): { success: boolean; messageId: string | null; message: string; raw: unknown } {
    let parsed = data;
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data);
      } catch {
        return {
          success: data.toLowerCase().includes('success'),
          messageId: null,
          message: data,
          raw: data,
        };
      }
    }

    return {
      success: parsed?.success || parsed?.status === 'success' || false,
      messageId: parsed?.message_id || parsed?.messageId || parsed?.id || null,
      message: parsed?.message || parsed?.response || '',
      raw: parsed,
    };
  }
}
