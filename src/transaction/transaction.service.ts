import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transaction } from './entity/transaction.entity';
import { createTransactionDto } from './dto/create-transaction.dto';
import { Wallet } from '../wallet/entity/wallet.entity';
import { Status } from '../common/enum/status.enum';

@Injectable()
export class TransactionService {
  constructor(private dataSource: DataSource) {}

  public async transferir(dados: createTransactionDto) {
    console.log('Criando o Query Runner...');
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const senderWallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: dados.senderWalletId },
        lock: { mode: 'pessimistic_write' },
      });

      const receiverWallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: dados.receiverWalletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!senderWallet || !receiverWallet) {
        throw new NotFoundException(
          'Carteira de origem ou destino não encontrada',
        );
      }

      if (senderWallet.saldo < dados.valor) {
        throw new BadRequestException(
          'Saldo insuficiente para realizar a transferência',
        );
      }

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

      return novaTransacao;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  public async estornar(transactionId: string) {
    console.log('Criando o queryRunner...');
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { id: transactionId },
        relations: ['senderWallet', 'receiverWallet'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!transaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      if (transaction.status !== Status.CONCLUIDA) {
        throw new BadRequestException(
          'Apenas transações concluídas podem ser estornadas',
        );
      }

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
}
