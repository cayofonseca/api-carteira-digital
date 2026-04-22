import { PrimaryGeneratedColumn, Column, Entity, OneToOne } from 'typeorm';
import { Wallet } from '../../wallet/entity/wallet.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ unique: true })
  email: string;

  @OneToOne(() => Wallet, (wallet) => wallet.user, { cascade: true })
  wallet: Wallet;
}
