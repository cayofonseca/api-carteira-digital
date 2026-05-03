import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { Between, DataSource } from 'typeorm';
import { Transaction } from './entity/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Wallet } from '../wallet/entity/wallet.entity';
import { Status } from '../common/enum/status.enum';
import { FinancialReportDto } from './dto/financial-report.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { TransactionValidator } from './transaction.validator';

@Injectable()
export class TransactionService {
  constructor(
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly validator: TransactionValidator,
  ) {}

  public async transferir(dados: CreateTransactionDto, user: any) {
    console.log('Criando o Query Runner...');
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const userId = user.userId || user.sub;

    if (!userId) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    try {
      const senderWallet = await queryRunner.manager.findOne(Wallet, {
        where: { user: { id: userId } },
        lock: { mode: 'pessimistic_write' },
      });

      const receiverWallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: dados.receiverWalletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (senderWallet.id === dados.receiverWalletId) {
        throw new BadRequestException(
          'As carteiras de origem e destino não podem ser iguais',
        );
      }

      this.validator.validateTransfer(
        senderWallet,
        receiverWallet,
        dados.valor,
      );

      senderWallet.saldo = Number(senderWallet.saldo) - Number(dados.valor);
      receiverWallet.saldo = Number(receiverWallet.saldo) + Number(dados.valor);

      const novaTransacao = queryRunner.manager.create(Transaction, {
        valor: dados.valor,
        status: Status.CONCLUIDA,
        senderWallet: senderWallet,
        receiverWallet: receiverWallet,
      });

      await queryRunner.manager.save([
        senderWallet,
        receiverWallet,
        novaTransacao,
      ]);

      await queryRunner.commitTransaction();

      console.log(
        'Transferência realizada com sucesso! Limpando o cache no Redis...',
      );
      await this.cacheManager.clear();
      console.log('Cache limpo com sucesso!');

      return novaTransacao;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  public async estornar(transactionId: string, user: any) {
    const userId = user.userId || user.sub;
    console.log('Criando o queryRunner...');
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = await queryRunner.manager
        .createQueryBuilder(Transaction, 'transaction')
        .innerJoinAndSelect('transaction.senderWallet', 'senderWallet')
        .innerJoinAndSelect('senderWallet.user', 'user')
        .innerJoinAndSelect('transaction.receiverWallet', 'receiverWallet')
        .where('transaction.id = :transactionId', { transactionId })
        .setLock('pessimistic_write')
        .getOne();

      if (!transaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      this.validator.validateReversal(transaction);

      const senderWallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: transaction.senderWallet.id },
        lock: { mode: 'pessimistic_write' },
      });

      const receiverWallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: transaction.receiverWallet.id },
        lock: { mode: 'pessimistic_write' },
      });

      receiverWallet.saldo =
        Number(receiverWallet.saldo) - Number(transaction.valor);
      senderWallet.saldo =
        Number(senderWallet.saldo) + Number(transaction.valor);

      transaction.status = Status.ESTORNADA;

      await queryRunner.manager.save([
        receiverWallet,
        senderWallet,
        transaction,
      ]);

      await queryRunner.commitTransaction();

      return transaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async report(dto: FinancialReportDto, user: any) {
    console.log(
      `[DEBUG] Buscando carteira para o USER_ID: ${user.userId || user.sub}`,
    );
    const userId = user.userId || user.sub;
    if (!userId) {
      throw new ForbiddenException('Usuário não autenticado');
    }
    const carteira = await this.dataSource.manager.findOne(Wallet, {
      where: { user: { id: userId } },
    });

    console.log(
      `[REPORT] Consultando saldo da carteira: ${carteira.id} para o usuário: ${user.email}`,
    );

    console.log('CARTEIRA ENCONTRADA:', carteira);

    const transacoesDb = await this.dataSource.manager.find(Transaction, {
      where: [
        { senderWallet: { id: carteira.id } },
        { receiverWallet: { id: carteira.id } },
      ],
      relations: [
        'senderWallet',
        'senderWallet.user',
        'receiverWallet',
        'receiverWallet.user',
      ],
      order: { createdAt: 'DESC' },
    });

    console.log(
      'Exemplo de transação carregada:',
      JSON.stringify(transacoesDb[0], null, 2),
    );

    let totalEntradas = 0;
    let totalSaidas = 0;

    const ultimasTransacoes = transacoesDb.map((t) => {
      const isEntrada = t.receiverWallet?.id === carteira.id;

      const pessoaEnvolvida = isEntrada
        ? t.senderWallet?.user?.nome
        : t.receiverWallet?.user?.nome;

      return {
        id: t.id,
        data: t.createdAt,
        valor: Number(t.valor),
        tipo: isEntrada ? 'Entrada' : 'Saída',
        envolvido: pessoaEnvolvida || 'Desconhecido',
      };
    });

    return {
      carteiraId: carteira.id,
      saldo: Number(carteira.saldo),
      entradas: totalEntradas,
      saidas: totalSaidas,
      ultimasTransacoes: ultimasTransacoes,
    };
  }
}
