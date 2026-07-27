import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class MobiwaveProvider {
  private readonly logger = new Logger(MobiwaveProvider.name);

  constructor(private readonly config: ConfigService) {}

  async send(recipient: string, message: string): Promise<{ providerRef: string }> {
    const apiKey = this.config.get<string>('MOBIWAVE_API_KEY');
    const senderId = this.config.get<string>('MOBIWAVE_SENDER_ID');

    const response = await axios.post(
      'https://api.mobiwave.co.ke/v1/sms/send',
      { senderId, recipient, message },
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 10_000 },
    );

    const providerRef = response.data?.messageId;
    if (!providerRef) {
      this.logger.warn(`Mobiwave response missing messageId for ${recipient}`);
    }
    return { providerRef: providerRef ?? '' };
  }
}
