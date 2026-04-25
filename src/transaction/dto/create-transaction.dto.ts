import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsUUID,
  NotEquals,
} from 'class-validator';

export class CreateTransactionDto {
  @IsUUID()
  @IsNotEmpty()
  senderWalletId: string;

  @IsUUID()
  @IsNotEmpty()
  @NotEquals('senderWalletId', {
    message: 'As carteiras de origem e destino não podem ser iguais',
  })
  receiverWalletId: string;

  @IsNumber()
  @IsNotEmpty()
  @IsPositive({
    message: 'O valor da transação deve ser um número maior que zero',
  })
  valor: number;
}
