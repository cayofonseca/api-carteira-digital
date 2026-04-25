import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Wallet } from '../wallet/entity/wallet.entity';
import { Status } from '../common/enum/status.enum';
import { Transaction } from './entity/transaction.entity';

@Injectable()
export class TransactionValidator {
  validateTransfer(sender: Wallet, receiver: Wallet, valor: number) {
    if (!sender || !receiver) {
      throw new NotFoundException(
        'Carteira de origem ou destino não encontrada',
      );
    }

    if (sender.saldo < valor) {
      throw new BadRequestException(
        'Saldo insuficiente para realizar a transferência',
      );
    }
  }

  validateReversal(transaction: Transaction) {
    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }

    if (transaction.status !== Status.CONCLUIDA) {
      throw new BadRequestException(
        'Apenas transações concluídas podem ser estornadas',
      );
    }
  }
}
