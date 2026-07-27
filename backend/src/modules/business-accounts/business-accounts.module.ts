import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessAccount } from '../../database/entities/business-account.entity';
import { BusinessAccountsService } from './business-accounts.service';
import { BusinessAccountsController } from './business-accounts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessAccount])],
  controllers: [BusinessAccountsController],
  providers: [BusinessAccountsService],
  exports: [BusinessAccountsService],
})
export class BusinessAccountsModule {}
