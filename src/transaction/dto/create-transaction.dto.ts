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
  receiverWalletId: string;

  @IsNumber()
  @IsNotEmpty()
  @IsPositive({
    message: 'O valor da transação deve ser um número maior que zero',
  })
  valor: number;
}
