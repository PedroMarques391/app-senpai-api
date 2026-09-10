# Senpai Figurinhas API

API backend do aplicativo **Senpai Figurinhas**, responsável pelo gerenciamento de pacotes e figurinhas, autenticação, catálogo da loja, inventário de usuários, cotas de criação e processamento assíncrono de notificações e e-mails.

![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-5.6-000000?style=flat&logo=fastify&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7.5-47A248?style=flat&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-6.2-DC382D?style=flat&logo=redis&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-6.3-FF4500?style=flat&logo=redis&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-4.2-3E67B1?style=flat&logo=zod&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-2.10-3448C5?style=flat&logo=cloudinary&logoColor=white)

---

## Arquitetura

O projeto adota uma **Arquitetura em Camadas** (*Layered Architecture*), orientada a desacoplamento e inversão de controle manual através de *Factories*. A regra fundamental é a segregação estrita entre transporte HTTP, regras de domínio e persistência de dados.

### Fluxo de Dados e Camadas

```text
[ Cliente HTTP ]
       │
       ▼
[ Fastify Router ]  ── Validação de Schema (Zod / Type Provider)
       │
       ▼
[ ServiceFactory ]  ── Composição e Injeção de Dependências
       │
       ▼
[ Service Layer ]   ── Regras de negócio, cálculo de cotas e cache
    │        │
    │        ├──► [ BullMQ Queue ] ──► [ Redis ] ──► [ Worker ] (Processamento Assíncrono)
    ▼        │
[ Repository ] ──► [ MongoDB Driver ]
```

* **Rotas (`src/routes`)**: Definem contratos HTTP, schemas de validação com Zod e lidam com ciclo de vida de requisição/resposta (`FastifyRequest`/`FastifyReply`). Não possuem lógica de negócio nem acessam bancos diretamente.
* **Fábricas (`src/factories`)**: Centralizam a instanciação de serviços, filas e repositórios (`ServiceFactory`, `QueueFactory`), gerenciando instâncias compartilhadas de cache, filas e conexões.
* **Serviços (`src/services`)**: Isolam as regras de negócio puras da aplicação (ex.: cálculo de expiração de cotas, validação de transações na loja, controle de ciclo de vida de OTP). Não conhecem o Fastify e recebem dependências injetadas pelo construtor.
* **Repositórios (`src/repositories`)**: Camada de persistência exclusiva. Operam diretamente sobre o driver oficial do MongoDB (`MongoClient`/`Db`), sem dependência de ORMs intermediários.
* **Filas e Workers (`src/queues`, `src/workers`)**: Processamento assíncrono em segundo plano via BullMQ e Redis para envio de mensagens via WhatsApp (Meta API) e e-mails transacionais (Nodemailer).
* **Plugins Fastify (`src/plugin`)**: Decoradores globais de autenticação JWT, validação de cotas de criação de pacotes/figurinhas, cliente Redis, cliente SMTP e tratamento centralizado de erros.

---

## Organização de Pastas

A base de código está dividida em duas raízes: `core` (definições de dados, contratos de domínio e utilitários compartilhados) e `src` (execução da API, rotas, lógica de aplicação e infraestrutura).

```text
├── core/
│   ├── schemas/        # Schemas de validação e modelagem com Zod
│   ├── models/         # Interfaces de repositório e tipos TypeScript derivados
│   ├── dtos/           # Objetos de transferência de dados (DTOs) validados
│   ├── types/          # Tipagens auxiliares (auth, otp, paginação, upload)
│   └── utils/          # Classes utilitárias estáticas (Auth, Otp, Mongo, Quota, etc.)
│
├── src/
│   ├── factories/      # Provedores de injeção de dependência (ServiceFactory, QueueFactory)
│   ├── init/           # Inicialização de infraestrutura (MongoDB, BullMQ, Cloudinary, Mailer)
│   ├── plugin/         # Plugins do Fastify (JWT, autenticação, redis, quota, mailer, erros)
│   ├── queues/         # Definição e despacho de filas BullMQ
│   ├── repositories/   # Acesso direto a dados e coleções do MongoDB
│   ├── routes/         # Endpoints agrupados por domínio (auth, profile, pack, store, etc.)
│   ├── services/       # Regras de negócio e fluxos de domínio
│   ├── templates/      # Templates HTML de e-mails transacionais e comunicados
│   ├── workers/        # Consumidores de filas em background (WhatsApp, E-mail)
│   └── index.ts        # Ponto de entrada da aplicação e bootstrap do servidor
│
├── docs/               # Documentação técnica de contratos e guias de integração
└── package.json        # Dependências e scripts de build/execução
```

---

## Stack Tecnológica

### Core & Runtime
* **Node.js (v22)** com **TypeScript (v5.9)**: Tipagem estrita e compilação otimizada com `tsup` (ESM).
* **Fastify (v5.6)**: Framework HTTP de alta performance.
* **Zod (v4.2)** + **`fastify-type-provider-zod`**: Validação estática e em tempo de execução de parâmetros, queries e payloads.

### Persistência & Cache
* **MongoDB (v7.5)**: Banco de dados NoSQL para entidades de usuários, pacotes, figurinhas, inventário e missões diárias.
* **Redis (v6.2)**: Armazenamento em memória para cache de perfis, rate limiting, controle de cooldown/expiração de OTPs e broker de filas.

### Processamento Assíncrono & Filas
* **BullMQ (v6.3)**: Gerenciamento distribuído de filas com suporte a retentativas automáticas e backoff exponencial.

### Observabilidade & Logs
* **Fastify Logger (Pino)**: Logs estruturados em formato JSON para produção e saída formatada com `pino-pretty` em desenvolvimento.

### Integrações Externas
* **Cloudinary**: Upload, processamento e entrega de ativos de imagem (avatares, banners, figurinhas estáticas e dinâmicas).
* **Meta Graph API (WhatsApp)**: Envio automatizado de códigos de autenticação (OTP) via mensagens de template.
* **Nodemailer**: Transporte SMTP para disparo de e-mails transacionais e de verificação.
