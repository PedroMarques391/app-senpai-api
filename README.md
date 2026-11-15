# Senpai Figurinhas API

Backend em TypeScript e Fastify do aplicativo **Senpai Figurinhas**, projetado para gerenciar pacotes e figurinhas, autenticação multi-canal, cotas por assinatura, loja de cosméticos, gamificação e processamento assíncrono de mídia em WebP.

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D26.12.1-339933?style=flat&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-5.6-000000?style=flat&logo=fastify&logoColor=white)
![License: ISC](https://img.shields.io/badge/License-ISC-blue?style=flat)

A aplicação desacopla o servidor HTTP (`src/index.ts`) do processamento pesado de imagens (`src/worker.ts`) por meio de **BullMQ + Redis** e **Cloudflare R2**, garantindo que conversões com **Sharp**, validações e disparos externos não bloqueiem o fluxo principal da API.

## Visão Geral e Capacidades

- **Upload direto em object storage** — emissão de URLs pré-assinadas para envio direto ao **Cloudflare R2**, evitando tráfego de arquivos brutos pelo servidor HTTP.
- **Conversão automática no padrão Meta/WhatsApp** — pipeline assíncrono com **Sharp** que comprime progressivamente para WebP respeitando os limites exigidos para exportação: `512x512` ≤ **100 KB** (estáticas), `512x512` ≤ **500 KB** (animadas) e `96x96` ≤ **50 KB** (ícones de pacote).
- **Autenticação multi-canal** — sessões via JWT (`@fastify/jwt`), verificação por OTP via WhatsApp (**Meta Graph API**) e e-mail (**Resend**), além de recuperação de conta com identificação de dispositivo e localização por IP.
- **Cotas e assinaturas** — controle de criação diária para contas `FREE`, limites de armazenamento por plano (`FREE` 500 MB, `PRO` 3 GB, `MESTRE` 6 GB) e sincronização de compras via webhook do **RevenueCat**.
- **Loja, inventário e gamificação** — catálogo de cosméticos, carteira de pétalas, missões diárias, conquistas e progressão de XP/nível.
- **Moderação e auditoria** — fluxo de denúncias, aplicação progressiva de strikes e registros de moderação para pacotes e grupos.
- **Assistente com IA em streaming** — integração com **Google Gemini** (`@ai-sdk/google`) baseada em base de conhecimento própria da plataforma.

---

## Arquitetura

O projeto segue uma **Arquitetura em Camadas** com composição e injeção manual de dependências centralizadas em *Factories* (`ServiceFactory` e `QueueFactory`):

```text
[ Cliente / App Mobile ]
       │
       ▼
[ Fastify Routers ]  ── Schemas Zod + Plugins globais (Auth, Quota, Error, Rate Limit)
       │
       ▼
[ ServiceFactory ]   ── Composição de Serviços, Provedores e Repositórios
       │
       ▼
[ Services Layer ]   ── Fluxos de negócio, cache Redis e Helpers/Utils estáticos
     │          │
     │          ├──► [ BullMQ Queues ] ──► [ Redis ] ──► [ Workers ]
     │                                                    ├── MediaWorker (processo dedicado)
     │                                                    ├── EmailWorker (processo da API)
     │                                                    └── WhatsAppWorker (processo da API)
     ▼
[ Repositories ]     ── Driver oficial do MongoDB (sem ORM)
```

### Responsabilidade das Camadas

- **Routes (`src/routes`)**: Definem contratos HTTP validados com `zod` e `fastify-type-provider-zod`, sem lógica de negócio ou acesso direto ao banco.
- **Plugins (`src/plugin`)**: Encapsulam autenticação JWT, validação de cotas diárias e de armazenamento, conexão Redis, envio de e-mails e tratamento centralizado de erros.
- **Factories (`src/factories`)**: Gerenciam a instanciação e os singletons de serviços, filas, provedores e repositórios.
- **Services (`src/services`)**: Orquestram regras de negócio, invalidação de cache no Redis, disparo de jobs e persistência.
- **Helpers (`src/helpers`)**: Classes estáticas de domínio e aplicação para regras reutilizáveis, acoplamentos externos (JWT, bcrypt, Redis, geolocalização) e permissões.
- **Utils (`core/utils`)**: Classes estáticas puras e agnósticas de domínio (`DateUtils`, `MongoUtils`, `NetworkUtils`, `PhoneUtils`, `StringUtils`).
- **Repositories (`src/repositories`)**: Acesso direto às coleções do MongoDB com tipagem estrita.
- **Providers (`src/providers`)**: Adaptadores para serviços externos (`CloudFlareR2Provider` via AWS S3 SDK e `ResendEmailProvider`).
- **Webhooks (`src/webhook`)**: Recepção e validação criptográfica de eventos do **Resend** e do **RevenueCat**.

---

## Processamento Assíncrono & Pipeline de Mídia

Tarefas intensivas de CPU e I/O de rede são distribuídas em filas **BullMQ**:

| Worker | Fila | Concorrência | Execução | Responsabilidade |
| :--- | :--- | :---: | :--- | :--- |
| **`MediaWorker`** | `media` | `5` | Processo autônomo (`src/worker.ts`) | Conversão Sharp para WebP, upload no R2, atualização do MongoDB, limpeza de temporários e invalidação de cache. |
| **`EmailWorker`** | `email` | `5` | Processo da API (`src/index.ts`) | Envio de e-mails transacionais (OTP, recuperação de senha, moderação) via Resend. |
| **`WhatsAppWorker`** | `whatsapp` | `5` | Processo da API (`src/index.ts`) | Disparo de códigos OTP via template oficial na Meta Graph API (`v25.0`). |

### Fluxo de Conversão (`MediaWorker` + `SharpService`)

1. O aplicativo envia a mídia bruta diretamente para a área temporária do **Cloudflare R2** usando uma URL pré-assinada.
2. Ao registrar o pacote, figurinha ou mídia de perfil, a API enfileira o job de processamento na fila `media`.
3. O **`MediaWorker`** baixa o buffer temporário e aciona o **`SharpService`** para conversão em WebP (`static`, `animated`, `avatar` ou `banner`):
   - **Figurinhas estáticas (`512x512`):** compressão progressiva até atingir **≤ 100 KB**.
   - **Figurinhas animadas (`512x512`):** ajuste progressivo de frames, qualidade, canal alfa e `minSize` até atingir **≤ 500 KB** (`loop: 0`).
   - **Capa e ícone do pacote:** geração automática de `cover.webp` (`512x512`) e `icon.webp` (`96x96`, **≤ 50 KB**) quando ausentes ou sinalizados.
4. O arquivo final é publicado no R2 com cache imutável, o registro no MongoDB recebe a URL pública e o `size_bytes` final, o arquivo temporário é removido e os caches no Redis são invalidados.

O processo do `MediaWorker` (`src/worker.ts`) conta ainda com healthcheck HTTP dedicado e *graceful shutdown* (`SIGINT`/`SIGTERM`) para encerramento seguro dos jobs em andamento.

---

## Organização de Pastas

```text
├── core/
│   ├── constants/      # Constantes globais e limites de negócio
│   ├── dtos/           # Schemas Zod de validação por domínio
│   ├── errors/         # Hierarquia de erros customizados (AppError)
│   ├── models/         # Modelos de domínio e interfaces de repositório
│   ├── schemas/        # Schemas Zod das coleções do banco
│   ├── types/          # Tipagens compartilhadas (auth, otp, queue, storage, env)
│   └── utils/          # Utilitários estáticos puros
│
├── src/
│   ├── factories/      # ServiceFactory e QueueFactory
│   ├── helpers/        # Helpers estáticos de domínio e aplicação
│   ├── init/           # Inicializadores de MongoDB, BullMQ e Mailer
│   ├── knowledge/      # Base de contexto do assistente de IA
│   ├── plugin/         # Plugins globais do Fastify
│   ├── providers/      # Integrações com Cloudflare R2 e Resend
│   ├── queues/         # Produtores de filas BullMQ
│   ├── repositories/   # Camada de persistência MongoDB
│   ├── routes/         # Roteadores HTTP por domínio e módulo admin
│   ├── seeds/          # Carga inicial de dados
│   ├── services/       # Serviços de regras de negócio e mídia
│   ├── templates/      # Templates HTML/texto de e-mails transacionais
│   ├── webhook/        # Handlers de webhooks (Resend e RevenueCat)
│   ├── workers/        # Consumidores BullMQ
│   ├── index.ts        # Entrypoint da API HTTP
│   └── worker.ts       # Entrypoint isolado do MediaWorker
│
├── docs/               # Especificações técnicas internas
├── compose.yml         # Definição de serviços em container
├── Dockerfile          # Imagem de produção (Node 26 Alpine + Yarn 4)
├── package.json        # Metadados e dependências do projeto
├── tsconfig.json       # Configuração TypeScript e path aliases
└── tsup.config.ts      # Empacotamento ESM para produção
```

---

## Stack Tecnológica

- **Runtime & Linguagem:** Node.js `>= 26.12.1`, TypeScript `5.9`, empacotamento ESM com `tsup`
- **Servidor HTTP & Validação:** Fastify `5.6`, Zod `4.2`, `fastify-type-provider-zod`, `@fastify/jwt`, `@fastify/multipart`, `@fastify/rate-limit`, `@fastify/cors`
- **Banco de Dados & Cache:** MongoDB (`mongodb` `7.5`), Redis (`redis` `6.2`), BullMQ `6.3`
- **Mídia & Storage:** Sharp `0.35`, Cloudflare R2 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- **Mensageria & Integrações:** Resend `6.29`, Meta Graph API (WhatsApp), RevenueCat Webhooks, Google Gemini (`ai` + `@ai-sdk/google`), `libphonenumber-js`, `bcrypt`
- **Logs:** Pino (`pino-pretty` em desenvolvimento)

---

## Licença

Projeto licenciado sob **ISC** ([`package.json`](package.json)).
