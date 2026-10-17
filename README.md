# DEVThiago — API

Backend Node.js + Express + TypeScript + Prisma + PostgreSQL para o sistema de gestão DEVThiago.

## Banco de dados

Docker não estava disponível na máquina usada para criar este projeto, então o PostgreSQL roda via **Homebrew** (`postgresql@16`), não via `docker-compose.yml` (que fica disponível caso você queira migrar para Docker depois).

Setup já aplicado nesta máquina:

```bash
brew services start postgresql@16
createdb -O devflow devflow   # role "devflow" com senha "devflow" já criada
```

Se for rodar em outra máquina com Docker disponível, use o `docker-compose.yml` incluso:

```bash
docker compose up -d
```

Em ambos os casos, o `DATABASE_URL` em `.env` já aponta para `postgresql://devflow:devflow@localhost:5432/devflow`.

## Rodando localmente

```bash
npm install
npx prisma migrate dev   # cria/atualiza o schema
npm run seed              # popula dados de exemplo
npm run dev                # inicia a API em http://localhost:4000
```

## Login de teste (criado pelo seed)

- E-mail: `thiago@devthiago.com`
- Senha: `password123`

## Scripts

- `npm run dev` — servidor de desenvolvimento (tsx watch)
- `npm run build` / `npm start` — build e start de produção
- `npm run prisma:migrate` — aplica migrations
- `npm run prisma:studio` — abre o Prisma Studio
- `npm run seed` — popula dados de exemplo

## Endpoints

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /dashboard`
- `GET/POST/PUT/DELETE /projects`
- `GET/POST/PUT/DELETE /clients`
- `GET/POST/PUT/DELETE /calendar/events`
- `GET/POST/PUT/DELETE /finance/transactions`, `/finance/invoices`
- `GET/POST/PUT/DELETE /support/tickets`
- `GET /users`

Todas as rotas (exceto `/auth/register` e `/auth/login`) exigem header `Authorization: Bearer <token>`.
