import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Status } from '../../common/enum/status.enum';
import { Wallet } from '../../wallet/entity/wallet.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  valor: number;

  @Column({ type: 'enum', enum: Status })
  status: Status;

  @ManyToOne(() => Wallet)
  senderWallet: Wallet;

  @ManyToOne(() => Wallet)
  receiverWallet: Wallet;
}
