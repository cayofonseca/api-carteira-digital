import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtGuard } from '../guards/jwt-auth.guard';
import { FinancialReportDto } from './dto/financial-report.dto';

@Controller('transaction')
@UseGuards(JwtGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('transferir')
  async transferir(@Body() dados: CreateTransactionDto, @Req() req: any) {
    console.log('Usuário logado fazendo a transferência:', req.user);
    return await this.transactionService.transferir(dados, req.user);
  }

  @Post('estornar/:id')
  async estornar(@Param('id') id: string, @Req() req: any) {
    return await this.transactionService.estornar(id, req.user);
  }

  @UseGuards(JwtGuard)
  @Get('report')
  async report(
    @Query() financialReportDto: FinancialReportDto,
    @Req() req: any,
  ) {
    return await this.transactionService.report(financialReportDto, req.user);
  }
}
