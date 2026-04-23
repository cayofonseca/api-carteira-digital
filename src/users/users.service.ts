import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from './entitiy/user.entity';
import { Repository } from 'typeorm/repository/Repository.js';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async createUser(dados: CreateUserDto) {
    const user = await this.userRepository.findOne({
      where: { email: dados.email },
    });

    if (user) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(dados.password, 10);

    const newUser = this.userRepository.create({
      nome: dados.nome,
      email: dados.email,
      password: hashedPassword,
    });

    return await this.userRepository.save(newUser);
  }

  async findUserForAuth(email: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :valor', { valor: email })
      .getOne();
    return user;
  }
}
