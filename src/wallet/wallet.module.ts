import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entity/wallet.entity';
import { UsersModule } from '../users/users.module';
import { User } from '../users/entitiy/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet]),
    UsersModule,
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
