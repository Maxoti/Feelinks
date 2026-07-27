import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from '../../database/entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { MobiwaveProvider } from './mobiwave.provider';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity])],
  providers: [NotificationsService, MobiwaveProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
