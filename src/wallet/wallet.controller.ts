import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateUserDto } from './dto/create-wallet.dto';
import { JwtGuard } from '../guards/jwt-auth.guard';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @UseGuards(JwtGuard)
  @Post()
  async create(@Body() createWalletDto: CreateUserDto) {
    return this.walletService.create(
      createWalletDto.userId,
      createWalletDto.saldo,
    );
  }
}
