<h1 align="center">
  💳 API Carteira Digital
</h1>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeORM-0.3-FE0803?style=for-the-badge&logo=typeorm&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Redis-Cache_(em_breve)-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Cookies-Em_breve-FF6B35?style=for-the-badge" />
</p>

<p align="center">
  API REST de carteira digital desenvolvida com foco em <strong>integridade de dados em operações financeiras</strong>, utilizando <strong>transações de banco de dados</strong>, <strong>pessimistic locking</strong> e <strong>QueryRunner</strong> para garantir consistência em cenários de alta concorrência.
</p>

---

## 🎯 Objetivo do Projeto

Este projeto é um laboratório prático para estudar e implementar mecanismos críticos de segurança em bancos de dados relacionais, com ênfase em:

- **Controle transacional explícito** com QueryRunner
- **Trava pessimista de banco de dados** (`pessimistic_write`) para evitar race conditions em movimentações financeiras
- **Rollback automático** em caso de falhas durante operações sensíveis
- **Cache distribuído** com Redis _(em desenvolvimento)_
- **Autenticação stateful** via Cookies HTTP-only _(em desenvolvimento)_

---

## 🏗️ Arquitetura

```
src/
├── auth/               # Autenticação JWT + Passport (Local & JWT strategies)
├── common/
│   ├── enum/           # Enums compartilhados (Status da transação)
│   ├── filter/         # Filtro global de exceções
│   └── interceptors/   # Interceptor global de resposta
├── guards/             # Guards JWT e Local + Strategies
├── transaction/        # Módulo de transações financeiras ← núcleo do projeto
├── users/              # Gerenciamento de usuários
├── wallet/             # Gerenciamento de carteiras
└── main.ts
```

---

## 🔐 O Núcleo: Travamento Pessimista de Banco de Dados

O ponto central deste projeto é a implementação de **pessimistic locking** com **QueryRunner** do TypeORM para garantir que operações financeiras concorrentes não causem inconsistências.

### Por que Pessimistic Lock?

Em sistemas financeiros, múltiplas requisições podem tentar modificar o mesmo registro simultaneamente. Sem um mecanismo de trava, cenários como o abaixo são possíveis:

```
Saldo inicial da carteira: R$ 100,00

[Req A] lê saldo → R$ 100,00
[Req B] lê saldo → R$ 100,00   ← lê ANTES de A gravar
[Req A] debita R$ 80,00 → grava R$ 20,00
[Req B] debita R$ 80,00 → grava R$ 20,00  ← INCONSISTÊNCIA! Saldo deveria ser negativo
```

Com `pessimistic_write`, a segunda requisição aguarda a primeira terminar antes de ler o registro, eliminando a race condition.

### Fluxo da Transferência

```
POST /transaction/transferir
         │
         ▼
┌─────────────────────────────────────────┐
│           QueryRunner criado            │
│         Transação iniciada              │
├─────────────────────────────────────────┤
│  🔒 LOCK: carteira remetente            │  ← pessimistic_write
│  🔒 LOCK: carteira destinatário         │  ← pessimistic_write
├─────────────────────────────────────────┤
│  Validações de negócio                  │
│  • Carteiras existem?                   │
│  • Saldo suficiente?                    │
├─────────────────────────────────────────┤
│  Atualiza saldos                        │
│  Cria registro da transação             │
│  Persiste tudo em batch                 │
├─────────────────────────────────────────┤
│  ✅ COMMIT    │    ❌ ROLLBACK           │
└──────────────┴──────────────────────────┘
        │                   │
   Sucesso            Erro → exceção
                      relançada
```

### Trecho de Código — Transferência com Lock

```typescript
const queryRunner = this.dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  // Trava as linhas para escrita exclusiva — outras transações aguardam
  const senderWallet = await queryRunner.manager.findOne(Wallet, {
    where: { id: dados.senderWalletId },
    lock: { mode: 'pessimistic_write' },
  });

  const receiverWallet = await queryRunner.manager.findOne(Wallet, {
    where: { id: dados.receiverWalletId },
    lock: { mode: 'pessimistic_write' },
  });

  // ... validações e atualização de saldos ...

  await queryRunner.commitTransaction();
} catch (error) {
  await queryRunner.rollbackTransaction(); // Desfaz tudo em caso de falha
  throw error;
} finally {
  await queryRunner.release(); // Libera a conexão de volta ao pool
}
```

---

## ✨ Funcionalidades

| Módulo        | Endpoint                    | Método | Descrição                              |
| ------------- | --------------------------- | ------ | -------------------------------------- |
| **Usuários**  | `/users`                    | `POST` | Cadastro de novo usuário               |
| **Auth**      | `/auth/login`               | `POST` | Login com email e senha                |
| **Carteira**  | `/wallet`                   | `POST` | Cria carteira vinculada ao usuário     |
| **Transação** | `/transaction/transferir`   | `POST` | Transferência entre carteiras com lock |
| **Transação** | `/transaction/estornar/:id` | `POST` | Estorno de transação com lock          |
| **Transação** | `/transaction/report`       | `GET`  | Relatório financeiro por período       |

> Todos os endpoints de transação e carteira exigem autenticação JWT via Bearer Token.

---

## 🗄️ Modelo de Dados

```
┌─────────────┐       ┌─────────────┐       ┌──────────────────────┐
│    users    │       │   wallets   │       │     transactions     │
├─────────────┤       ├─────────────┤       ├──────────────────────┤
│ id (uuid)   │──1:1──│ id (uuid)   │──1:N──│ id (uuid)            │
│ name        │       │ saldo       │       │ valor                │
│ email       │       │ userId (FK) │       │ status (enum)        │
│ password    │       └─────────────┘       │ senderWalletId (FK)  │
└─────────────┘                             │ receiverWalletId (FK)│
                                            │ createdAt            │
                                            └──────────────────────┘

Status: PENDENTE | CONCLUIDA | ESTORNADA
```

---

## 🛡️ Segurança

- **Senhas** criptografadas com `bcrypt`
- **Autenticação** via JWT (Passport + `@nestjs/jwt`)
- **Rotas protegidas** com Guards customizados (`JwtGuard`, `LocalGuard`)
- **Travamento de banco** evita duplo-gasto e race conditions
- **Rollback transacional** garante atomicidade em todas as operações financeiras

---

## 🚧 Roadmap

- [x] Autenticação JWT com Passport
- [x] CRUD de usuários e carteiras
- [x] Transferência com QueryRunner + Pessimistic Lock
- [x] Estorno com QueryRunner + Pessimistic Lock
- [x] Relatório financeiro por período
- [x] Filtro global de exceções
- [ ] **Cache com Redis** — respostas de relatórios e dados de carteira
- [ ] **Cookies HTTP-only** — sessão stateful como alternativa ao Bearer Token

---

## 🚀 Como Executar

### Pré-requisitos

- Node.js 20+
- Docker e Docker Compose

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/api-carteira-digital.git
cd api-carteira-digital

# Instale as dependências
npm install
```

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=carteira_digital

# JWT
JWT_SECRET=sua_chave_secreta_aqui
JWT_EXPIRES_IN=1d
```

### Executando

```bash
# Subir banco de dados via Docker
docker compose up -d

# Desenvolvimento (hot-reload)
npm run start:dev

# Produção
npm run build
npm run start:prod
```

---

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes com cobertura
npm run test:cov

# Testes E2E
npm run test:e2e
```

---

## 🛠️ Stack

| Tecnologia  | Versão       | Uso                         |
| ----------- | ------------ | --------------------------- |
| NestJS      | 11           | Framework principal         |
| TypeScript  | 5            | Linguagem                   |
| TypeORM     | 0.3          | ORM + QueryRunner + Locks   |
| PostgreSQL  | —            | Banco de dados relacional   |
| Passport.js | —            | Estratégias de autenticação |
| JWT         | —            | Tokens de acesso            |
| bcrypt      | —            | Hash de senhas              |
| Redis       | _(em breve)_ | Cache distribuído           |

---

<p align="center">
  Desenvolvido com foco em aprendizado de mecanismos de integridade transacional em sistemas financeiros.
</p>
