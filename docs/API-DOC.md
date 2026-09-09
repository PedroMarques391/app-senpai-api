# Senpai Figurinhas API — Documentação Oficial e Guia de Integração Flutter

Esta documentação serve como a **fonte única de verdade** (Single Source of Truth) para o backend Fastify e para a integração com o cliente Flutter, detalhando contratos rigorosos, regras de negócio, ciclo de vida de cotas e estruturas de erro.

---

## 1. Visão Geral da Arquitetura & Infraestrutura

A API Senpai segue os princípios da **Clean Architecture**, organizada em 3 camadas principais:
1. **Router (`src/routes`)**: Validação de rotas com **Zod** (`fastify-type-provider-zod`), hooks de autenticação/permissão e serialização.
2. **Services (`src/services`)**: Regras de negócio, verificação de propriedade, cálculo de cotas e side-effects.
3. **Repositories (`src/repositories`)**: Interação exclusiva com coleções do banco de dados MongoDB.

### Infraestrutura
- **Node.js + Fastify + TypeScript**: Core da API de alta performance e tipagem estrita com Host binding `0.0.0.0` e CORS configurado.
- **MongoDB Atlas**: Banco de dados NoSQL principal.
- **Redis (`ioredis`)**: Cache de alta velocidade para leituras (TTL padrão de 24h), invalidação reativa em mutações e rate limit temporizado de OTP.
- **BullMQ**: Mensageria assíncrona e background workers (ex: envio de mensagens no WhatsApp via Evolution API / Baileys).
- **Cloudinary**: Upload de mídia e transformação automática de assets (ex: conversão WebP, redimensionamento 256x256 e otimização para ícones de pacotes).
- **JWT (`@fastify/jwt`)**: Autenticação stateless com tokens Bearer contendo payload estrito do usuário.

---

## 2. Convenções Globais & Contratos Base

### 2.1 Padrão de Autenticação
- **Header Obrigatório (Rotas Protegidas):** `Authorization: Bearer <jwt_token>`
- **Payload do Token JWT (`request.user`):**
  - `_id`: `String` (Hex de 24 caracteres do ObjectId)
  - `wa_id`: `String` (Número normalizado no padrão E.164 sem o 9º dígito brasileiro)
  - `name`: `String`
  - `userName`: `String`
  - `email`: `String`
  - `role`: `"user" | "admin" | "moderator" | "company"`
  - `premium`: `boolean` (Define acesso a cotas ilimitadas e recursos VIP)
  - `isNumberVerified`: `boolean`

### 2.2 Estrutura Padronizada de Respostas de Erro
A API possui tratamento centralizado (`error.plugin.ts` e decorators de plugins). O cliente Flutter deve tratar os seguintes status HTTP e formatos:

| Status HTTP | Código / Contexto | Payload Retornado (Exemplo Real) |
| :--- | :--- | :--- |
| **400 Bad Request** | Erro de validação Zod nos campos. | `{"success": false, "message": "Dados de requisição inválidos", "errors": {"pack_name": ["Required"]}}` |
| **400 Bad Request** | Erro de regra de negócio ou formato de ID. | `{"success": false, "message": "ID do pacote inválido"}` |
| **401 Unauthorized** | Token ausente, inválido ou expirado. | `{"success": false, "message": "Operation not permitted"}` |
| **403 Forbidden** | Cota diária excedida (Plano Free). | `{"success": false, "code": "QUOTA_EXCEEDED", "message": "Você já usou sua criação grátis de hoje. Volte amanhã ou assine o VIP para criar sem limites!"}` |
| **403 Forbidden** | Rate limit do OTP (espera necessária). | `{"success": false, "userExists": true, "retryAfter": 45, "message": "Por favor, aguarde 45 segundos antes de solicitar um novo código."}` |
| **403 Forbidden** | Falha de permissão / RBAC ou propriedade. | `{"success": false, "message": "Operação não permitida: você não pode excluir arquivos de outro usuário"}` |
| **404 Not Found** | Recurso não localizado no banco de dados. | `{"success": false, "message": "Pacote não encontrado"}` |
| **500 Internal** | Exceção não tratada no servidor. | `{"success": false, "message": "Erro interno do servidor"}` |

### 2.3 Guia de Integração para Flutter (Dart)
- **MongoDB ObjectId (`_id`, `user_id`, `pack_id`):** Retornados como `String` (hex de 24 chars). No Dart, mapear como `String`.
- **Datas (`createdAt`, `cycle_start`, `created_at`):** Serializadas como strings ISO 8601 UTC. No Dart, fazer o parse via `DateTime.parse(json['createdAt']).toLocal()` para exibição correta no fuso local.
- **Campos Opcionais e Nullable:** Tratar campos que podem vir ausentes ou como `null` usando tipos anuláveis (`String?`, `int?`).
- **Normalização de Telefone:** Números de telefone WhatsApp brasileiros são normalizados pelo backend no formato `55DDXXXXXXXX` (sem o nono dígito `9`). O app Flutter pode enviar com ou sem o `9`, mas deve estar ciente de que o `wa_id` retornado estará sem o 9º dígito.

---

## 3. Endpoints do Sistema

### 3.0 Monitoramento & Liveness (`/health`)

#### `GET /health`
- **Descrição e Regra:** Endpoint público de monitoramento e verificação de saúde da instância (Liveness/Readiness probe para Kubernetes ou Docker Compose).
- **Headers:** Nenhum (Aberto/Público).
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "message": "Server is running",
      "success": true
    }
    ```

---

### 3.1 Autenticação & Identidade (`/auth`, `/me`)

#### `POST /auth/login/otp`
- **Descrição e Regra de Negócio:** Envia código OTP de 6 dígitos via WhatsApp.
  1. **Normalização do Número:** O backend normaliza o número via `AuthUtils.normalizeWaId`, removendo pontuação, garantindo o prefixo `55` e removendo o nono dígito para números de celular brasileiros (`55 + DDD + 8 dígitos`).
  2. **Proteção de Usuário Inativo:** Se a conta estiver com `status: "inactive"`, a API retorna mensagem genérica com `userExists: true` para evitar enumeração de status por terceiros.
  3. **Verificação Premium:** Valida se o usuário é `premium`. Usuários não-premium recebem aviso específico.
  4. **Rate Limit:** Aplica intervalo mínimo de 60 segundos entre envios. Se chamado antes do tempo, retorna `403` com `retryAfter` indicando os segundos restantes.
  5. **TTL:** O código OTP expira em 5 minutos (300 segundos).
- **Request Body:**
  | Campo | Tipo Zod | Tipo Dart | Obrigatório? | Descrição |
  | :--- | :--- | :--- | :--- | :--- |
  | `wa_id` | `z.string()` | `String` | Sim | Número do WhatsApp (ex: `"5511999998888"` ou `"11999998888"`). |
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "message": "OTP sent successfully",
      "otp": "123456",
      "expiresIn": 300,
      "retryAfter": 60
    }
    ```
  - `403 Forbidden` (Rate Limit):
    ```json
    {
      "success": false,
      "userExists": true,
      "retryAfter": 45,
      "message": "Por favor, aguarde 45 segundos antes de solicitar um novo código."
    }
    ```
  - `403 Forbidden` (Não Premium ou Inativo):
    ```json
    {
      "success": false,
      "userExists": true,
      "message": "Parece que você ainda não é um usuário premium, cria sua conta ou faça login para continuar."
    }
    ```

#### `POST /auth/login/verify`
- **Descrição e Regra de Negócio:** Valida o código OTP de 6 dígitos e efetua o login.
  - O número `wa_id` é normalizado antes da checagem.
  - Verifica se o usuário está ativo; se inativo, lança erro `"Credenciais inválidas"`.
  - Invalida a chave do OTP no Redis, atualiza `isNumberVerified: true`, atualiza `last_login` para a data atual e emite o token JWT no Header `Authorization`.
- **Request Body:**
  | Campo | Tipo Zod | Tipo Dart | Obrigatório? | Descrição |
  | :--- | :--- | :--- | :--- | :--- |
  | `wa_id` | `z.string()` | `String` | Sim | Número do WhatsApp. |
  | `otp` | `z.string()` | `String` | Sim | Código numérico recebido. |
- **Respostas:**
  - `200 OK` (Com header `Authorization: Bearer <token>`):
    ```json
    {
      "success": true,
      "message": "OTP verified successfully",
      "user": {
        "_id": "66dec987a123b456c7890123",
        "wa_id": "5511988887777",
        "name": "Pedro",
        "userName": "pedromarques",
        "email": "pedro@email.com",
        "premium": true,
        "role": "user",
        "isNumberVerified": true,
        "isEmailVerified": false,
        "termsAccepted": true,
        "petals_balance": 150,
        "stickers_count": { "static": 10, "dynamic": 2 },
        "createdAt": "2026-09-01T12:00:00.000Z",
        "last_login": "2026-09-09T10:00:00.000Z"
      }
    }
    ```
  - `400 Bad Request`: `{"success": false, "message": "Invalid or expired OTP"}`

#### `POST /auth/login/loginWithIdentifier`
- **Descrição:** Login clássico com identificador (email ou userName) e senha com verificação via Bcrypt. Emite JWT no header `Authorization`.
- **Request Body:**
  | Campo | Tipo Zod | Tipo Dart | Obrigatório? |
  | :--- | :--- | :--- | :--- |
  | `identifier` | `z.string()` | `String` | Sim |
  | `password` | `z.string()` | `String` | Sim |
- **Respostas:**
  - `200 OK`: `{"success": true, "message": "Password verified successfully", "user": { ...User }}` + `Authorization` Header.

#### `POST /auth/register`
- **Descrição:** Cadastro completo inicial de usuário. Realiza hash da senha e validação de unicidade de `wa_id`, `userName` e `email`.
- **Request Body (`CreateUserDto`):** `wa_id`, `name`, `userName`, `email`, `password`.
- **Respostas:**
  - `200 OK`: `{"message": "User created successfully", "user": { ...User }}`

#### `GET /me`
- **Descrição:** Retorna a identidade e claims do usuário autenticado diretamente a partir da validação do JWT.
- **Headers:** `Authorization: Bearer <token>`
- **Respostas:**
  - `200 OK`: `{"success": true, "message": "User fetched successfully", "user": { ...JwtPayload }}`

---

### 3.2 Cotas Diárias de Criação (`/creation/quota`)
*(Requer Header `Authorization`)*

O sistema de cotas diárias controla a criação de pacotes e figurinhas para usuários do plano **Free**, incentivando o upgrade para **VIP (PRO/MESTRE)**.

#### Regras de Negócio do Ciclo de Cotas:
1. **Fuso Horário de Reset:** O ciclo diário é baseado no horário de Brasília (UTC-3) e **reinicia todos os dias às 06:00 BRT** (09:00 UTC).
2. **Limite Diário Grátis:** Usuários Free podem criar até **1 pacote** e até **3 figurinhas por dia** (`QuotaUtils.FREE_DAILY_STICKER_LIMIT = 3`).
3. **Bloqueio de Pacote Ativo:** Ao criar ou reservar o primeiro pacote do dia, todas as criações subsequentes daquele dia devem pertencer ao mesmo pacote até que a cota de 3 figurinhas se esgote.
4. **Usuários VIP (`premium: true`):** Possuem cota ilimitada (`isUnlimited: true`), sem restrição de pacote ou limite diário.

#### `GET /creation/quota/`
- **Descrição:** Consulta o status atual da cota diária do usuário.
- **Respostas:**
  - `200 OK` (Usuário Free):
    ```json
    {
      "success": true,
      "quota": {
        "cycleStart": "2026-09-09T09:00:00.000Z",
        "packName": "Memes de Gatinhos",
        "createdStickerCount": 2,
        "isUnlimited": false
      }
    }
    ```
  - `200 OK` (Usuário VIP):
    ```json
    {
      "success": true,
      "quota": {
        "cycleStart": "2026-09-09T09:00:00.000Z",
        "packName": null,
        "createdStickerCount": 0,
        "isUnlimited": true
      }
    }
    ```

#### `POST /creation/quota/reserve-pack`
- **Descrição:** Reserva o nome do pacote que o usuário Free usará no ciclo diário atual antes de concluir o envio dos arquivos.
- **Request Body:**
  | Campo | Tipo Zod | Tipo Dart | Obrigatório? | Constraints |
  | :--- | :--- | :--- | :--- | :--- |
  | `packName` | `z.string()` | `String` | Sim | `min(1).max(50)` |
- **Respostas:**
  - `200 OK`: `{"success": true, "quota": { ...QuotaSnapshotDto }}`
  - `403 Forbidden` (Se já tiver pacote diferente reservado):
    ```json
    {
      "success": false,
      "code": "QUOTA_EXCEEDED",
      "message": "Sua criação grátis de hoje já está vinculada ao pack \"Memes de Gatinhos\". Você pode continuar nele até completar 3 figurinhas."
    }
    ```

#### `POST /creation/quota/commit`
- **Descrição:** Confirma e incrementa a contagem de figurinhas criadas no ciclo diário do usuário.
- **Request Body:**
  | Campo | Tipo Zod | Tipo Dart | Obrigatório? | Constraints |
  | :--- | :--- | :--- | :--- | :--- |
  | `packName` | `z.string()` | `String` | Sim | `min(1).max(50)` |
  | `stickerCount` | `z.number().int()` | `int` | Sim | `min(1)` |
  | `clientCycleStart` | `z.string()` | `String?` | Não | ISO 8601 opcional para sincronização |
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Cota atualizada com sucesso",
      "quota": {
        "cycleStart": "2026-09-09T09:00:00.000Z",
        "packName": "Memes de Gatinhos",
        "createdStickerCount": 3,
        "isUnlimited": false
      }
    }
    ```
  - `403 Forbidden`: `{"success": false, "code": "QUOTA_EXCEEDED", "message": "..."}`

---

### 3.3 Termos de Uso & Aceite Legal (`/terms`)
*(Requer Header `Authorization`)*

Endpoints para gerenciamento do consentimento legal e termos de serviço do usuário.

#### `POST /terms/` e `PUT /terms/`
- **Descrição:** Registra a aceitação dos termos de uso pelo usuário autenticado. Atualiza `termsAccepted: true` no banco e invalida o cache de perfil no Redis.
- **Request Body (`termsDtoSchema` - opcional):**
  | Campo | Tipo Zod | Tipo Dart | Obrigatório? | Descrição |
  | :--- | :--- | :--- | :--- | :--- |
  | `termsAccepted` | `z.boolean()` | `bool?` | Não | Flag de consentimento. |
  | `termsVersion` | `z.string()` | `String?` | Não | Versão dos termos (ex: `"1.2.0"`). |
  | `privacyAcknowledged`| `z.boolean()` | `bool?` | Não | Flag da política de privacidade. |
  | `privacyVersion` | `z.string()` | `String?` | Não | Versão da política. |
  | `legalAcceptedAt` | `z.string()` | `String?` | Não | Timestamp ISO do aceite. |
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Termos aceitos com sucesso",
      "user": { ...User }
    }
    ```

#### `DELETE /terms/`
- **Descrição:** Revoga o consentimento dos termos de uso do usuário logado (`termsAccepted: false`) e invalida o cache do perfil.
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Aceite dos termos removido com sucesso",
      "user": { ...User }
    }
    ```

#### Rotas Alias de Compatibilidade:
- `POST /terms/legal-acceptance` (Equivalente ao `POST /terms/`)
- `PUT /terms/legal-acceptance` (Equivalente ao `PUT /terms/`)
- `DELETE /terms/legal-acceptance` (Equivalente ao `DELETE /terms/`)

---

### 3.4 Pacotes de Figurinhas (`/pack`)

#### `GET /pack/`
- **Descrição & Regras de Negócio:**
  - **Modo Usuário (`?user=<id>`):** Requer autenticação e valida se o usuário requisitante é o proprietário dos pacotes. Retorna array com todos os pacotes do usuário.
  - **Modo Público Paginado:** Lista pacotes com suporte a busca textual, filtro de tags, categoria e **ordenação parametrizada**.
  - **Otimização de Performance (Sticker Previews):** Na listagem paginada, cada pacote retorna apenas **até 4 figurinhas** para preview (`populateStickers(pack, 4)`), diminuindo drasticamente o payload trafegado no app Flutter. Para obter todas as figurinhas de um pacote, deve-se chamar `GET /pack/:id`.
  - **Cache Redis:** O cache de listagem inclui a ordenação na chave: `pack:list:${page}:${limit}:${sort}:${order}`.
- **Parâmetros de Query:**
  | Parâmetro | Tipo Zod | Tipo Dart | Obrigatório? | Default | Valores Permitidos / Descrição |
  | :--- | :--- | :--- | :--- | :--- | :--- |
  | `user` | `z.string()` | `String?` | Não | — | ID do usuário dono (requer JWT de posse). |
  | `search` | `z.string()` | `String?` | Não | — | Busca case-insensitive em nome, descrição e publisher. |
  | `tags` | `z.union([z.string(), z.array(z.string())])` | `List<String>?` | Não | — | Filtro por tags. |
  | `category` | `packCategoryEnum` | `String?` | Não | — | `"anime"`, `"memes"`, `"reactions"`, `"gaming"`, `"cute"`, `"utility"`, `"other"`. |
  | `sort` | `z.enum([...])` | `String?` | Não | `"recent"` | `"recent"` (data), `"popular"` (downloads + likes), `"downloads"`, `"likes"`. |
  | `order` | `z.enum(["asc", "desc"])` | `String?` | Não | `"desc"` | Direção da ordenação (`"desc"` ou `"asc"`). |
  | `page` | `z.coerce.number().int()` | `int` | Não | `1` | Número da página (mínimo 1). |
  | `limit` | `z.coerce.number().int()` | `int` | Não | `20` | Itens por página (máximo 50). |
- **Respostas:**
  - `200 OK (Público)`:
    ```json
    {
      "success": true,
      "data": {
        "data": [
          {
            "_id": "66dec987a123b456c7890124",
            "user_id": "66dec987a123b456c7890123",
            "pack_name": "Jujutsu Kaisen",
            "description": "Figurinhas do anime",
            "publisher": "pedromarques",
            "category": "anime",
            "tags": ["jujutsu", "gojo"],
            "icon_url": "https://res.cloudinary.com/.../c_fill,w_256,h_256,f_webp,q_auto/...",
            "is_public": true,
            "downloads_count": 120,
            "likes_count": 34,
            "stickers": [
              {
                "_id": "66dec987a123b456c7890125",
                "name": "Gojo Satoru",
                "sticker_url": "https://res.cloudinary.com/.../sticker.webp",
                "type": "static"
              }
            ],
            "created_at": "2026-09-08T15:00:00.000Z",
            "updated_at": "2026-09-08T15:00:00.000Z"
          }
        ],
        "total": 50,
        "page": 1,
        "limit": 20,
        "totalPages": 3
      }
    }
    ```

#### `POST /pack/`
*(Requer Header `Authorization`)*
- **Descrição & Regras de Negócio:**
  1. **PreHandler de Cota Diária:** Executa `checkPackCreationQuota`. Se o usuário for Free e exceder o limite de 1 pacote/dia ou o total de 3 figurinhas/dia, a requisição é barrada com HTTP `403 QUOTA_EXCEEDED`.
  2. **Criação de Figurinhas em Lote Embutidas:** O body aceita a propriedade `stickers?: CreateStickerDto[]`. Todas as figurinhas enviadas são criadas e vinculadas ao pacote na mesma operação atômica, incrementando o `stickers_count` do usuário (`static` ou `dynamic`).
  3. **Geração Automática do `icon_url`:** Se o campo `icon_url` não for informado no payload, mas o array `stickers` contiver ao menos uma figurinha com URL válida do Cloudinary, o backend gera automaticamente o `icon_url` aplicando a transformação de otimização `c_fill,w_256,h_256,f_webp,q_auto`.
  4. **Campos Opcionais com Defaults:** `description` é opcional (default `"Sem descrição"`), e `tags` é opcional (default `[]`).
  5. **Registro de Cota:** Grava o consumo da cota em `creation_quotas` para usuários Free.
- **Request Body (`CreatePackDto`):**
  | Campo | Tipo Zod | Tipo Dart | Obrigatório? | Default / Constraints | Descrição |
  | :--- | :--- | :--- | :--- | :--- | :--- |
  | `pack_name` | `z.string()` | `String` | Sim | `min(3).max(30)` | Nome do pacote. |
  | `description` | `z.string()` | `String?` | Não | `"Sem descrição"` / `max(100)` | Descrição curta. |
  | `category` | `packCategoryEnum` | `String?` | Não | `"other"` | Categoria do pacote. |
  | `tags` | `z.array(z.string())` | `List<String>?` | Não | `[]` / Max 10 tags, cada 2 a 20 chars | Tags descritivas. |
  | `is_public` | `z.boolean()` | `bool?` | Não | `true` | Visibilidade pública. |
  | `icon_url` | `z.url()` | `String?` | Não | Nulo (ou derivado da 1ª figurinha) | URL do ícone do pacote. |
  | `stickers` | `z.array(createStickerDtoSchema)` | `List<CreateStickerDto>?` | Não | Opcional | Array de figurinhas iniciais para criar junto ao pacote. |
- **Respostas:**
  - `201 Created`: `{"success": true, "message": "Pacote criado com sucesso", "pack": { ...StickerPack }}`
  - `403 Forbidden` (Cota excedida):
    ```json
    {
      "success": false,
      "code": "QUOTA_EXCEEDED",
      "message": "Você já usou sua criação grátis de hoje. Volte amanhã ou assine o VIP para criar sem limites!"
    }
    ```

#### `GET /pack/:id`
- **Descrição:** Retorna o pacote detalhado com **todas** as suas figurinhas vinculadas (com cache Redis de 24h).
- **Respostas:**
  - `200 OK`: `{"success": true, "pack": { ...StickerPack, "stickers": [ ...Sticker ] }}`
  - `404 Not Found`: `{"success": false, "message": "Pacote não encontrado"}`

#### `PUT /pack/:id`
*(Requer Header `Authorization`)*
- **Descrição:** Atualiza campos do pacote (`pack_name`, `description`, `category`, `tags`, `icon_url`, `is_public`). Requer que o usuário seja o dono do pacote. Invalida os caches relacionados.
- **Respostas:**
  - `200 OK`: `{"success": true, "message": "Pacote atualizado com sucesso", "pack": { ...StickerPack }}`

#### `DELETE /pack/:id`
*(Requer Header `Authorization`)*
- **Descrição:** Deleta o pacote e todas as figurinhas associadas a ele. Requer propriedade do pacote.
- **Respostas:**
  - `200 OK`: `{"success": true, "message": "Pacote deletado com sucesso"}`

#### `POST /pack/:id/favorite`
*(Requer Header `Authorization`)*
- **Descrição & Regra de Negócio:** Alterna o estado de favorito (Toggle Like) do pacote para o usuário autenticado.
  - Se o usuário já favoritou: remove o favorito da coleção `pack_favorites` e **decrementa atômica e confiavelmente** o contador `likes_count` do pacote (`-1`).
  - Se ainda não favoritou: insere na coleção `pack_favorites` e **incrementa atomicamente** o contador `likes_count` do pacote (`+1`).
  - Invalida o cache do pacote (`pack:${id}`) e todas as listagens cacheadas (`pack:list:*`).
- **Parâmetros / URL:** `:id` (ObjectId do pacote)
- **Respostas:**
  - `200 OK` (Ao favoritar):
    ```json
    {
      "success": true,
      "isFavorite": true,
      "message": "Pacote adicionado aos favoritos"
    }
    ```
  - `200 OK` (Ao desfavoritar):
    ```json
    {
      "success": true,
      "isFavorite": false,
      "message": "Pacote removido dos favoritos"
    }
    ```
  - `404 Not Found`: `{"success": false, "message": "Pacote não encontrado"}`

---

### 3.5 Figurinhas Individuais (`/sticker`)
*(Requer Header `Authorization` para mutações)*

#### `GET /sticker/`
- **Descrição:** Lista figurinhas de acordo com o query param informado:
  - `?user=<userId>`: Lista figurinhas do usuário autenticado (valida propriedade).
  - `?pack=<packId>`: Lista figurinhas de um pacote específico (com cache Redis `stickers:pack:${packId}`).
  - Sem parâmetros: Lista geral de figurinhas do sistema.
- **Respostas:**
  - `200 OK`: `{"success": true, "stickers": [ ...Sticker ]}`

#### `GET /sticker/:id`
- **Descrição:** Retorna os dados completos de uma figurinha isolada.
- **Respostas:**
  - `200 OK`: `{"success": true, "sticker": { ...Sticker }}`
  - `404 Not Found`: `{"success": false, "message": "Figurinha não encontrada"}`

#### `POST /sticker/:packId`
*(Requer Header `Authorization`)*
- **Descrição & Regras de Negócio:**
  1. **Validação de Cota:** Executa `checkStickerCreationQuota`. Se o usuário Free já tiver criado 3 figurinhas no ciclo diário, retorna `403 QUOTA_EXCEEDED`.
  2. **Validação de Propriedade:** Verifica se o usuário autenticado é o proprietário do pacote.
  3. **Auto-preenchimento do Ícone do Pacote:** Se o pacote estiver sem `icon_url`, a criação da primeira figurinha gera e salva automaticamente o `icon_url` do pacote aplicando a transformação Cloudinary `c_fill,w_256,h_256,f_webp,q_auto` na URL desta figurinha.
  4. **Contador do Usuário:** Incrementa atômica e persistentemente o contador `stickers_count.static` ou `stickers_count.dynamic` do perfil do usuário.
  5. **Registro de Cota:** Registra o uso da cota para usuários Free em `creation_quotas`.
- **Request Body (`CreateStickerDto`):**
  | Campo | Tipo Zod | Tipo Dart | Obrigatório? | Constraints | Descrição |
  | :--- | :--- | :--- | :--- | :--- | :--- |
  | `name` | `z.string()` | `String` | Sim | — | Nome da figurinha. |
  | `author` | `z.string()` | `String` | Sim | — | Autor da figurinha. |
  | `cloudinary_id` | `z.string()` | `String` | Sim | — | Identificador do asset no Cloudinary. |
  | `sticker_url` | `z.url()` | `String` | Sim | URL válida | URL final da imagem/animação. |
  | `emojis` | `z.array(z.string())` | `List<String>?` | Não | Max 3 emojis / default `[]` | Emojis associados. |
  | `type` | `z.enum(["dynamic", "static"])` | `String` | Sim | `"dynamic"` ou `"static"` | Tipo da figurinha. |
- **Respostas:**
  - `201 Created`: `{"success": true, "message": "Figurinha criada com sucesso", "sticker": { ...Sticker }}`
  - `403 Forbidden` (Cota excedida): `{"success": false, "code": "QUOTA_EXCEEDED", "message": "..."}`

#### `PUT /sticker/:id`
*(Requer Header `Authorization`)*
- **Descrição & Regra de Negócio:** Permite ao criador da figurinha atualizar seu nome, autor e emojis vinculados. Valida a posse da figurinha pelo usuário logado e invalida o cache da figurinha e do pacote correspondente.
- **Request Body (`UpdateStickerDto` - estrito):**
  | Campo | Tipo Zod | Tipo Dart | Obrigatório? | Constraints |
  | :--- | :--- | :--- | :--- | :--- |
  | `name` | `z.string()` | `String` | Sim | Nome atualizado. |
  | `author` | `z.string()` | `String` | Sim | Autor atualizado. |
  | `emojis` | `z.array(z.string())` | `List<String>?` | Não | Max 3 emojis. |
- **Respostas:**
  - `200 OK`: `{"success": true, "message": "Figurinha atualizada com sucesso", "sticker": { ...Sticker }}`
  - `403 Forbidden`: `{"success": false, "message": "Operação não permitida..."}`
  - `404 Not Found`: `{"success": false, "message": "Figurinha não encontrada"}`

#### `DELETE /sticker/:id`
*(Requer Header `Authorization`)*
- **Descrição:** Remove a figurinha, valida posse do usuário e decrementa o contador `stickers_count` (estático ou dinâmico) do perfil de forma atômica.
- **Respostas:**
  - `200 OK`: `{"success": true, "message": "Figurinha deletada com sucesso"}`

---

### 3.6 Loja & Transações de Pétalas (`/store`)

#### `GET /store/` e `GET /store/:id`
- **Descrição:** Lista itens cosméticos disponíveis na loja (molduras, emblemas, wallpapers, planos VIP) com filtro opcional por `?status=active|inactive`.
- **Respostas:**
  - `200 OK`: `{"success": true, "items": [ ...StoreItem ]}`

#### `POST /store/:id/purchase`
*(Requer Header `Authorization`)*
- **Descrição & Regras de Negócio:**
  1. Verifica se o item está ativo (`status: "active"`).
  2. Verifica se o usuário já possui o item no seu inventário (impede compras duplicadas).
  3. Compara o saldo de pétalas do usuário (`petals_balance`) com o preço do item (`price_in_petals`).
  4. Executa dedução atômica das pétalas do usuário (`$inc: { petals_balance: -price }`).
  5. Adiciona o item ao inventário (`inventory` collection) e incrementa `purchases_count` na loja.
  6. **Retorno do Novo Saldo:** Retorna `newBalance` diretamente no JSON de resposta, permitindo que o Flutter atualize instantaneamente o saldo na interface sem disparar uma nova requisição para `/profile`.
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Item adquirido com sucesso",
      "item": {
        "_id": "66dec987a123b456c7890199",
        "name": "Moldura Dourada",
        "type": "border",
        "price_in_petals": 50,
        "asset_url": "https://res.cloudinary.com/.../border.png"
      },
      "newBalance": 250
    }
    ```
  - `400 Bad Request` (Saldo insuficiente ou item já adquirido):
    ```json
    {
      "success": false,
      "message": "Saldo de pétalas insuficiente para realizar a compra"
    }
    ```

---

### 3.7 Inventário (`/inventory`)
*(Requer Header `Authorization`)*

#### `GET /inventory/`
- **Descrição:** Retorna a lista completa de itens cosméticos adquiridos pelo usuário logado, ordenados do mais recente para o mais antigo (com cache Redis invalidado automaticamente a cada nova compra).
- **Respostas:**
  - `200 OK`: `{"success": true, "items": [ ...InventoryItem ]}`

---

### 3.8 Perfil do Usuário (`/profile`)
*(Todas as rotas exigem Header `Authorization`)*

#### `GET /profile/`
- **Descrição:** Retorna os dados completos do perfil autenticado, incluindo saldo de pétalas, contadores de stickers, status VIP (`premium`), datas de assinatura (`subscriptions`) e consentimento de termos (`termsAccepted`).
- **Respostas:**
  - `200 OK`: `{"success": true, "profile": { ...User }}`

#### `GET /profile/:username`
- **Descrição:** Retorna o perfil público (sanitizado) de outro usuário pelo nome de usuário (`userName`).
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "profile": {
        "name": "Pedro",
        "userName": "pedromarques",
        "avatar_url": "https://...",
        "banner_url": "https://...",
        "isVerifiedCreator": true,
        "createdAt": "2026-09-01T12:00:00.000Z"
      }
    }
    ```

#### `PATCH /profile/complete-registration`
- **Descrição:** Permite finalizar o cadastro de um usuário após login inicial via OTP.
- **Request Body (`CompleteRegistrationDto`):** `name`, `userName`, `email`, `password`.

#### `PUT /profile/`
- **Descrição:** Atualiza campos do perfil do próprio usuário autenticado (`UpdateUserDto`).

#### `DELETE /profile/`
- **Descrição:** Desativa o perfil do usuário autenticado (soft-delete: `status = "inactive"`, define `deletedAt`).

---

### 3.9 Upload de Mídia (`/upload`)
*(Requer Header `Authorization`)*

#### `POST /upload/?folder=...`
- **Descrição:** Envia arquivos de imagem/sticker via Multipart Stream diretamente ao Cloudinary, organizando o path em pastas segregadas por usuário (`folder/userName/filename`).
- **Respostas:**
  - `201 Created`:
    ```json
    {
      "success": true,
      "message": "Upload realizado com sucesso",
      "cloudinary_id": "stickers/pedro/pedro_1725888000_abc123",
      "sticker_url": "https://res.cloudinary.com/.../pedro_1725888000_abc123.png",
      "public_id": "stickers/pedro/pedro_1725888000_abc123",
      "url": "http://res.cloudinary.com/...",
      "type": "png"
    }
    ```

#### `DELETE /upload/?public_id=...`
- **Descrição:** Exclui um asset do Cloudinary. Valida com rigor se o `public_id` contém o `userName` do usuário requisitante para prevenir deleção de arquivos de outros usuários.

---

### 3.10 Conteúdos & Campanhas In-App (`/content`)

#### `GET /content/`
- **Descrição:** Consulta banners, comunicados e notificações ativas da plataforma (`start_at <= agora <= end_at`).
- **Query Params:**
  - `type`: `"banner" | "notification" | "announcement"`
  - `platform`: `"ios" | "android" | "both" | "all"`
- **Respostas:**
  - `200 OK`: `{"success": true, "contents": [ ...Content ]}`

---

### 3.11 Módulo Administrativo (`/admin/*`)
*(Requer Header `Authorization` de usuário com cargo `admin` ou `moderator`)*

- `GET /admin/users`: Listagem paginada de todos os usuários cadastrados.
- `GET /admin/users/:id`: Detalhes completos de um usuário por ID.
- `PATCH /admin/users/:id/status`: Altera status do usuário (`active` ou `inactive`).
- `PATCH /admin/users/:id/role`: Altera cargo do usuário (exclusivo de `admin`).
- `POST /admin/users/:id/petals/adjust`: Ajuste manual de saldo de pétalas com justificativa de auditoria (exclusivo de `admin`).
- `GET /admin/contents/`: Listagem administrativa de campanhas e comunicados.
- `POST /admin/contents/`: Criação de novo banner/notificação in-app.
- `GET /admin/contents/:id`: Detalhes de um comunicado.
- `PUT /admin/contents/:id`: Atualização de datas, links e imagens de comunicado.
- `DELETE /admin/contents/:id`: Remoção de comunicado (exclusivo de `admin`).

---

## 4. Modelos e Enums do Domínio

### Enums
```typescript
// Roles do Usuário
export type UserRole = "user" | "admin" | "moderator" | "company";

// Status da Conta
export type UserStatus = "active" | "inactive";

// Tipos de Assinatura VIP
export type VipType = "PRO" | "MESTRE";

// Categorias de Pacotes
export type PackCategory =
  | "anime"
  | "memes"
  | "reactions"
  | "gaming"
  | "cute"
  | "utility"
  | "other";

// Ordenação de Pacotes
export type PackSortOption = "recent" | "popular" | "downloads" | "likes";
export type SortOrder = "asc" | "desc";

// Tipos de Figurinhas
export type StickerType = "dynamic" | "static";

// Tipos de Itens da Loja
export type StoreItemType =
  | "wallpaper"
  | "gift"
  | "badge"
  | "border"
  | "profile_frame"
  | "profile_picture"
  | "premium_subscription"
  | "other";

// Conteúdos e Plataformas
export type ContentType = "banner" | "notification" | "announcement";
export type ContentPlatform = "ios" | "android" | "both" | "all";
```

### Snapshot de Cota (`QuotaSnapshotDto`)
```typescript
export interface QuotaSnapshotDto {
  cycleStart: string;              // ISO 8601 UTC (início do ciclo diário atual)
  packName: string | null;         // Nome do pacote ativo vinculado no dia
  createdStickerCount: number;     // Figurinhas criadas hoje no ciclo (0 a 3 no Free)
  isUnlimited: boolean;            // true para usuários VIP
}
```

---

## 5. Guia de Melhores Práticas para o Flutter

1. **Tratamento de Código `QUOTA_EXCEEDED` (HTTP 403):**
   - Intercepte respostas HTTP 403 contendo `"code": "QUOTA_EXCEEDED"`.
   - Ao detectar este código, exiba diretamente um modal ou bottom-sheet de **Paywall / Assinatura VIP**, informando ao usuário que o limite gratuito do dia foi atingido e que assinantes VIP possuem criação sem restrições.
2. **Sincronização Econômica com `newBalance`:**
   - Na compra de itens da loja (`POST /store/:id/purchase`), utilize o valor retornado no campo `newBalance` para atualizar o estado local de pétalas do usuário (`petals_balance`) instantaneamente, evitando chamadas adicionais a `/profile`.
3. **Consumo Eficiente da Listagem de Pacotes:**
   - A listagem paginada (`GET /pack/`) fornece até 4 figurinhas em cada pacote para alimentar a visualização de carrossel/grid de preview. Não faça requisições adicionais para cada item da lista. Busque os detalhes completos (`GET /pack/:id`) apenas quando o usuário abrir a tela dedicada do pacote.
4. **Tratamento do Botão de Favorito:**
   - Ao tocar no botão de curtir/favoritar, envie `POST /pack/:id/favorite` e atualize o ícone e o contador baseado no boolean `isFavorite` retornado.
5. **Gestão do Ciclo Diário no App:**
   - Ao carregar a tela de criação de pacotes/figurinhas, consulte previamente `GET /creation/quota` para saber se o usuário Free já tem um pacote reservado no ciclo ou se ainda possui figurinhas disponíveis.
