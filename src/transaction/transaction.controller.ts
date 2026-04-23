import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { createTransactionDto } from './dto/create-transaction.dto';
import { JwtGuard } from '../guards/jwt-auth.guard';

@Controller('transaction')
@UseGuards(JwtGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('transferir')
  async transferir(@Body() dados: createTransactionDto, @Req() req: any) {
    console.log(`Usuário logado fazendo a transferência: ${req.user}`);
    return await this.transactionService.transferir(dados);
  }

  @Post('estornar/:id')
  async estornar(@Param('id') id: string) {
    return await this.transactionService.estornar(id);
  }
}
