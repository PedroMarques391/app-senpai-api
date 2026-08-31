# Roadmap & Tasks do Senpai API

## 👥 1. Social & Relacionamentos (Followers)

- [ ] Implementar módulo de Followers (Repository, Service, Controller/Router).
- [ ] Adicionar `followers_count` e `following_count` no `user.schema.ts` e métodos de `$inc` atômicos no `UserRepository`.
- [ ] Rotas de Follow e Unfollow com validações (ex: não seguir a si mesmo, prevenir duplicidade com índice composto).
- [ ] Endpoints de listagem paginada de seguidores (`/users/:id/followers`) e seguidos (`/users/:id/following`).
- [ ] Rota de verificação de status (`GET /users/:id/is-following`).
- [ ] Feed personalizado de stickers/packs criados apenas por usuários que você segue.

## 🎯 2. Gamificação & Missões Diárias (Daily Missions)

- [ ] Implementar Módulo de Missões Diárias (Repository, Service, Router).
- [ ] Sistema de reset diário de missões (cron job ou lazy check no login/acesso).
- [ ] Lógica de resgate de recompensas (creditando `petals_balance` de forma atômica).

## ⚡ 3. Performance, Infraestrutura & Caching (Redis)

- [x] Configurar Redis no Docker Compose e cliente de conexão (`ioredis` ou `redis`).
- [x] Implementar camada/helper de cache com TTL e invalidação inteligente.
- [x] Cachear endpoints de alta leitura:
  - Perfil público (`/profile/:userName`)
  - Listagem de Packs públicos e populares
  - Listagem da Loja (`/store`)
- [x] Implementar Invalidação de Cache em mutações (ex: ao criar/atualizar um pack, invalidar a listagem).

## 📬 4. Mensageria & Background Jobs (RabbitMQ)

- [ ] Configurar RabbitMQ no Docker Compose e cliente de mensageria (ex: `amqplib`).
- [ ] Criar fila e consumer para envio de OTP (WhatsApp / E-mail).
- [ ] Criar fila e consumer para e-mails transacionais (boas-vindas, confirmação de conta, redefinição de senha).

## 🔐 5. Segurança & Autenticação

- [ ] Fluxo de "Esqueci minha senha" / Redefinição de senha com token temporário e expiração.
- [ ] Adicionar `@fastify/rate-limit` para proteger endpoints sensíveis contra brute-force (`/auth/login`, `/auth/otp`, etc.).
- [ ] Confirmação de e-mail e verificação de telefone (usando `isEmailVerified` e `isNumberVerified`).

## 📚 6. Documentação & Swagger (OpenAPI)

- [ ] Configurar `@fastify/swagger` e `@fastify/swagger-ui` integrados ao `fastify-type-provider-zod`.
- [ ] Documentar schemas de request, response, tags e parâmetros em todas as rotas (Auth, User, Packs, Stickers, Store, Content, Admin, etc.).
- [ ] Configurar rota da documentação interativa (ex: `/docs` ou `/swagger`).
- [ ] Adicionar suporte a autenticação JWT Bearer diretamente na interface do Swagger UI.
- [ ] Escrever README do projeto com instruções de setup, variáveis de ambiente e arquitetura.
- [ ] Endpoint de Health Check (`GET /health`) monitorando status do MongoDB e dependências.
