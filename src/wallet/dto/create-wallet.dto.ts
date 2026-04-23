import { IsNotEmpty, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsUUID('4', { message: 'O ID do usuário deve ser um UUID válido' })
  @IsNotEmpty({ message: 'O ID do usuário é obrigatório' })
  userId: string;

  @IsNotEmpty({ message: 'O saldo é obrigatório' })
  @IsNumber({}, { message: 'O saldo deve ser um número' })
  @IsPositive({ message: 'O saldo deve ser um número positivo' })
  saldo: number;
}
