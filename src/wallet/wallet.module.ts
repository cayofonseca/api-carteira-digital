import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entity/wallet.entity';
import { UserModule } from '../user/user.module';
import { User } from '../user/entity/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet]),
    UserModule,
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
