import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessAccount } from '../../database/entities/business-account.entity';
import { CreateBusinessAccountDto } from './dto/create-business-account.dto';

@Injectable()
export class BusinessAccountsService {
  constructor(
    @InjectRepository(BusinessAccount)
    private readonly repo: Repository<BusinessAccount>,
  ) {}

  create(dto: CreateBusinessAccountDto): Promise<BusinessAccount> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(): Promise<BusinessAccount[]> {
    return this.repo.find();
  }

  // The critical lookup: every inbound C2B callback must resolve against
  // this table by shortcode. If it doesn't resolve, the callback is coming
  // in on a shortcode you haven't registered — reject it loudly rather than
  // guessing (this is the exact class of bug behind the Pesawazi mismatch).
  async findByShortcode(shortcode: string): Promise<BusinessAccount> {
    const account = await this.repo.findOne({ where: { shortcode, isActive: true } });
    if (!account) {
      throw new NotFoundException(
        `No active business account registered for shortcode ${shortcode}`,
      );
    }
    return account;
  }
}
