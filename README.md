# Senpai Figurinhas API

API backend do aplicativo **Senpai Figurinhas**, responsável pelo gerenciamento de pacotes e figurinhas, autenticação, catálogo da loja, inventário de usuários, cotas de criação e pipeline assíncrono de conversão de mídia, notificações e e-mails.

![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?style=flat&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-5.6-000000?style=flat&logo=fastify&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=flat&logo=cloudflare&logoColor=white)
![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-F38020?style=flat&logo=cloudflare&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7.5-47A248?style=flat&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-6.2-DC382D?style=flat&logo=redis&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-6.3-FF4500?style=flat&logo=redis&logoColor=white)
![Sharp](https://img.shields.io/badge/Sharp-0.35-99CC00?style=flat&logo=sharp&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-4.2-3E67B1?style=flat&logo=zod&logoColor=white)
![Resend](https://img.shields.io/badge/Resend-000000?style=flat&logo=resend&logoColor=white)

---

## Arquitetura

O projeto adota uma **Arquitetura em Camadas** (*Layered Architecture*), orientada a desacoplamento e inversão de controle manual através de *Factories*. A regra fundamental é a segregação estrita entre transporte HTTP, regras de domínio, persistência de dados e processamento em segundo plano.

### Fluxo de Dados e Camadas

```text
[ Cliente HTTP / Mobile App ]
       │
       ▼
[ Fastify Router ]  ── Validação de Schema (Zod / Type Provider)
       │
       ▼
[ ServiceFactory ]  ── Composição e Injeção de Dependências
       │
       ▼
[ Service Layer ]   ── Regras de negócio, cotas, auditoria e cache
     │        │
     │        ├──► [ BullMQ Queues ] ──► [ Redis Broker ] ──► [ Workers Autônomos ]
     │                                                          ├── MediaWorker (Sharp + R2)
     │                                                          ├── WhatsAppWorker (Meta API)
     │                                                          └── EmailWorker (Resend)
     ▼
[ Repositories ] ──► [ MongoDB Driver ]
```

### Pipeline Assíncrono de Mídia (Upload Direto no Cloudflare R2)

Para garantir máxima performance e economizar banda no servidor HTTP, o aplicativo móvel realiza o upload dos arquivos brutos diretamente no **Cloudflare R2** por meio de URLs pré-assinadas:

```text
[ App Mobile ] ── 1. POST /upload/presigned-url ──► [ Fastify API ]
     │                                                    │ Retorna URL assinada (tempKey)
     ├── 2. PUT (Arquivo bruto) ──► [ Cloudflare R2 (temp/) ]
     │
     ├── 3. POST /packs (com tempKey) ──► [ Fastify API ]
                                                │
                                                ▼
                                         [ MediaQueue ] (BullMQ)
                                                │
                                                ▼
                                         [ MediaWorker ]
                                                │
                                                ├── Baixa buffer de R2 (temp/)
                                                ├── Sharp: Converte para WebP estrito
                                                │   (512x512 stickers, 96x96 ícones, avatares, banners)
                                                ├── Upload permanente no R2 (CDN global)
                                                ├── Atualiza URLs e chaves no MongoDB
                                                ├── Exclui arquivo temporário (tempKey)
                                                └── Invalida caches pertinentes no Redis
```

* **Rotas (`src/routes`)**: Definem contratos HTTP, schemas de validação com Zod e lidam com ciclo de vida de requisição/resposta (`FastifyRequest`/`FastifyReply`). Não possuem lógica de negócio nem acessam bancos diretamente.
* **Fábricas (`src/factories`)**: Centralizam a instanciação de serviços, filas, provedores e repositórios (`ServiceFactory`, `QueueFactory`), gerenciando singletons compartilhados de cache, filas e conexões.
* **Provedores (`src/providers`)**: Encapsulam integrações com serviços de terceiros e SDKs externos (ex.: `CloudFlareR2Provider` via `@aws-sdk/client-s3` e `ResendEmailProvider`).
* **Serviços (`src/services`)**: Isolam as regras de negócio puras da aplicação (ex.: cálculo de cotas, regras de pacotes VIP, controle de ciclo de vida de OTP e uploads).
* **Repositórios (`src/repositories`)**: Camada de persistência exclusiva operando diretamente sobre o driver oficial do MongoDB (`MongoClient`/`Db`), sem dependência de ORMs intermediários.
* **Filas (`src/queues`)**: Definição e despacho de filas BullMQ (`MediaQueue`, `EmailQueue`, `WhatsAppQueue`).
* **Workers (`src/workers` e `src/worker.ts`)**: Consumidores assíncronos desacoplados. O `MediaWorker` pode ser executado como um processo independente (`src/worker.ts`) com healthcheck HTTP dedicado para orquestração em nuvem (Railway/Docker).
* **Plugins Fastify (`src/plugin`)**: Decoradores globais de autenticação JWT, validação de cotas diárias de criação e limites de armazenamento (500MB Free / 3GB VIP Pro / 6GB VIP Mestre), cliente Redis e tratamento centralizado de erros.

---

## ⚡ Ecossistema de Workers em Segundo Plano

A API adota um modelo de processamento distribuído com **BullMQ + Redis**, permitindo que tarefas intensivas em CPU ou I/O de rede não bloqueiem a thread principal do servidor HTTP:

| Worker | Fila Redis | Concorrência | Responsabilidade | Execução |
| :--- | :--- | :---: | :--- | :--- |
| **`MediaWorker`** | `"media"` | `5` | Download de buffer, pipeline Sharp (WebP), upload R2, sincronização de banco e limpeza | **Processo dedicado (`src/worker.ts`)** |
| **`EmailWorker`** | `"email"` | `3` | Envio de e-mails transacionais (OTP, recuperação de senha e auditoria) via Resend | Background |
| **`WhatsAppWorker`** | `"whatsapp"` | `3` | Disparo de mensagens de verificação e templates oficiais via Meta Graph API | Background |

---

### 🎨 Destaque: `MediaWorker` (Processamento de Mídia & Figurinhas)

O **`MediaWorker`** é o coração da pipeline de mídia da aplicação. Projetado para rodar como um serviço desacoplado e autônomo, ele garante que manipulações pesadas de imagem nunca degradem o tempo de resposta das rotas HTTP da API.

#### 1. Tipos de Conversão Suportados (`MediaConversionType`)
- **`static`**: Redimensiona e otimiza figurinhas estáticas para o formato **WebP estrito (512x512)**.
- **`animated`**: Processa figurinhas animadas (GIF/WebP) garantindo loop e taxa de quadros compatíveis com WhatsApp e Telegram.
- **`pack_icon`**: Gera o ícone oficial da bandeja do pacote em **WebP 96x96 com transparência** (`packs/:packId/icon.webp`).
- **`avatar`**: Converte e padroniza a foto de perfil do usuário (`avatars/:userId/avatar.webp`).
- **`banner`**: Processa a capa do perfil do usuário em alta resolução (`banners/:userId/banner.webp`).

#### 2. Auto-geração Inteligente de Ícone do Pacote
Ao processar a primeira figurinha de um pacote, se o pacote ainda não possuir `icon_url` definido, o `MediaWorker` intercepta o buffer de entrada e gera **automaticamente** o ícone de bandeja (96x96 WebP transparente), fazendo o upload e associando-o ao pacote no MongoDB sem necessidade de requisições extras pelo aplicativo.

#### 3. Ciclo de Vida do Job (`"process-media"`)
1. **Extração de Buffer**: Baixa o arquivo bruto recém-enviado pelo app para a pasta temporária do Cloudflare R2 (`tempKey`).
2. **Transformação Sharp**: Converte via Sharp no formato WebP padronizado com máxima nitidez e otimização de tamanho.
3. **Upload Definitivo**: Salva no Cloudflare R2 sob caminho final com headers imutáveis de cache HTTP (`Cache-Control: public, max-age=31536000, immutable`).
4. **Sincronização Atômica**: Atualiza a URL pública (`media.botdosenpai.com.br`), a chave do arquivo e o tamanho em bytes no MongoDB.
5. **Autolimpeza**: Remove o arquivo temporário do bucket R2 para evitar custos desnecessários de armazenamento.
6. **Invalidação Reativa de Cache**: Purga em lote todas as chaves pertinentes no Redis (`pack:<id>`, `stickers:pack:<id>`, `pack:user:<id>`).

#### 4. Orquestração e Healthcheck HTTP
O script de inicialização do worker ([`src/worker.ts`](src/worker.ts)) sobe um servidor HTTP nativo e ultraleve na porta especificada por `process.env.PORT` respondendo:
```json
{ "status": "healthy", "service": "media-worker" }
```
Isso permite que plataformas como **Railway**, **Kubernetes** ou **Docker** realizem probes de integridade contínuas. Além disso, conta com **Graceful Shutdown** (`SIGINT`/`SIGTERM`) para aguardar a finalização dos jobs em voo antes de fechar conexões com Redis e MongoDB com total segurança.

---

## Organização de Pastas

A base de código está dividida em duas raízes: `core` (definições de dados, contratos de domínio e utilitários compartilhados) e `src` (execução da API, rotas, lógica de aplicação e infraestrutura).

```text
├── core/
│   ├── dtos/           # Objetos de transferência de dados (DTOs) validados
│   ├── models/         # Interfaces de repositório e entidades do banco de dados
│   ├── schemas/        # Schemas de validação Zod e modelagem de contratos
│   ├── types/          # Tipagens auxiliares (auth, otp, queues, uploads, paginação)
│   └── utils/          # Classes utilitárias estáticas (Auth, Mongo, Permission, etc.)
│
├── src/
│   ├── factories/      # Injeção de dependência e instanciação (ServiceFactory, QueueFactory)
│   ├── init/           # Inicialização de infraestrutura (MongoDB, BullMQ, Mailer)
│   ├── plugin/         # Plugins Fastify (JWT, autenticação, redis, quota, erros)
│   ├── providers/      # Adaptadores de serviços externos (Cloudflare R2, Resend)
│   ├── queues/         # Definição e despacho de jobs BullMQ (media, email, whatsapp)
│   ├── repositories/   # Acesso direto a dados e coleções do MongoDB
│   ├── routes/         # Endpoints agrupados por domínio (auth, pack, profile, store, upload, etc.)
│   ├── services/       # Regras de negócio, cotas e fluxos de domínio
│   ├── templates/      # Templates HTML para e-mails transacionais
│   ├── webhook/        # Handlers de webhooks de gateways de pagamento e serviços
│   ├── workers/        # Implementação dos consumidores de filas (MediaWorker, etc.)
│   ├── index.ts        # Ponto de entrada da API HTTP (Fastify)
│   └── worker.ts       # Ponto de entrada do Worker autônomo (MediaWorker com healthcheck)
│
├── docs/               # Documentação técnica de contratos e guias de integração
└── package.json        # Dependências e scripts de build/execução
```

---

## Stack Tecnológica

### Core & Runtime
* **Node.js (v22+)** com **TypeScript (v5.9)**: Tipagem estrita e compilação de alta performance com `tsup` (ESM).
* **Fastify (v5.6)**: Framework HTTP de alta performance e baixo overhead.
* **Zod (v4.2)** + **`fastify-type-provider-zod`**: Validação estática e em tempo de execução de parâmetros, queries e payloads.

### Armazenamento de Objetos & CDN
* **Cloudflare R2**: Armazenamento compatível com a API S3 com zero taxa de egress, presigned URLs para uploads diretos a partir do aplicativo móvel e entrega de alta velocidade via CDN global (`media.botdosenpai.com.br`).
* **Sharp (v0.35)**: Pipeline de alta performance para conversão de imagens e animações em formato WebP estrito (512x512 para figurinhas, 96x96 com canal alfa para ícones de pacote, além de avatares e capas).

### Persistência & Cache
* **MongoDB (v7.5)**: Banco de dados NoSQL para usuários, pacotes, figurinhas, inventário e transações da loja.
* **Redis (v6.2)**: Armazenamento em memória para cache de catálogo/perfis, rate limiting, controle de expiração de OTPs e broker de mensagens BullMQ.

### Processamento Assíncrono & Filas
* **BullMQ (v6.3)**: Gerenciamento distribuído de filas com suporte a retentativas automáticas, backoff exponencial e persistência de falhas/conclusão.

### Comunicação & Mensageria
* **Resend**: API para envio de e-mails transacionais (ativação de conta OTP, recuperação de senha e alertas de segurança).
* **Meta Graph API (WhatsApp)**: Envio automatizado de códigos de autenticação (OTP) via mensagens de template oficiais.

### Observabilidade & Logs
* **Pino (Fastify Logger)**: Logs estruturados em formato JSON para produção e saída formatada com `pino-pretty` em desenvolvimento.

---

## Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `yarn dev` | Inicia o servidor HTTP da API em modo desenvolvimento com watch e reload automático. |
| `yarn dev:worker` | Inicia o Media Worker em modo desenvolvimento com watch e reload automático. |
| `yarn build` | Executa a checagem de tipos (`tsc --noEmit`) e gera os bundles compilados em `dist/` via `tsup`. |
| `yarn start` | Inicia a API HTTP em ambiente de produção (`dist/index.js`). |
| `yarn start:worker` | Inicia o Media Worker em ambiente de produção (`dist/worker.js`). |
| `yarn up:db` | Sobe instâncias locais do MongoDB e Redis via Docker Compose. |
| `yarn seed:catalog` | Popula o catálogo de pacotes e produtos da loja no banco de dados. |
