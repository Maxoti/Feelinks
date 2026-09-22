import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DarajaClientService } from '../modules/mpesa/daraja/daraja-client.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const daraja = app.get(DarajaClientService);

  await daraja.registerC2BUrls({
    shortcode: '4463675',
    confirmationUrl: 'https://feelinks.onrender.com/payments/c2b/confirmation',
    validationUrl: 'https://feelinks.onrender.com/payments/c2b/validation',
  });

  console.log('C2B URLs registered for 4463675');
  await app.close();
}

main();