# Senpai Figurinhas API — Documentação Oficial e Guia de Integração Flutter

Esta documentação serve como a **fonte única de verdade** (Single Source of Truth) para o backend Fastify e para a integração com o cliente Flutter, detalhando contratos, regras de negócio e estruturas de erro.

---

## 1. Visão Geral da Arquitetura & Infraestrutura

A API Senpai segue os princípios da **Clean Architecture**, organizada em 3 camadas principais:
1. **Router (`src/routes`)**: Validação de rotas (Zod), serialização e delegação.
2. **Services (`src/services`)**: Regras de negócio, verificações de permissões e side-effects.
3. **Repositories (`src/repositories`)**: Interação exclusiva com o banco de dados.

### Infraestrutura
- **Node.js + Fastify + TypeScript**: Core da API, garantindo alta performance e tipagem estrita.
- **MongoDB Atlas**: Banco de dados NoSQL principal.
- **Redis (`ioredis`)**: Cache de alta performance para rotas de leitura e controle de rate-limits (ex: filas OTP).
- **BullMQ**: Mensageria e background jobs (ex: envio de mensagens no WhatsApp).
- **Cloudinary**: Upload de mídia em stream.
- **JWT (`@fastify/jwt`)**: Sistema de autenticação por tokens Bearer.

---

## 2. Convenções Globais & Contratos Base

### 2.1 Padrão de Autenticação
- **Header Obrigatório (Rotas Protegidas):** `Authorization: Bearer <jwt_token>`
- O payload decodificado do token contém informações vitais do usuário logado: `_id`, `wa_id`, `name`, `userName`, `email`, `role`, `premium`, `isNumberVerified`.

### 2.2 Estrutura Padronizada de Erros
A API possui tratamento centralizado (`error.plugin.ts`). O Flutter deve tratar os seguintes retornos:

| Status HTTP | Descrição e Contexto | Payload Retornado (Exemplo) |
| :--- | :--- | :--- |
| **400 Bad Request** | Erro de validação Zod nos campos da requisição. | `{"success": false, "message": "Dados de requisição inválidos", "errors": {"wa_id": ["Required"]}}` |
| **400 Bad Request** | Erro de regra de negócio. | `{"success": false, "message": "Você já possui este item em seu inventário"}` |
| **401 Unauthorized** | Token JWT ausente, inválido ou expirado. | `{"success": false, "message": "Operation not permitted"}` |
| **403 Forbidden** | RBAC insuficiente (ex: requer admin) ou violação de propriedade. | `{"success": false, "message": "Acesso negado. Privilégios insuficientes..."}` |
| **404 Not Found** | Recurso solicitado não foi encontrado no banco. | `{"success": false, "message": "Pacote não encontrado"}` |
| **500 Internal Error**| Exceção não tratada no backend. | `{"success": false, "message": "Erro interno do servidor"}` |

### 2.3 Guia de Integração para Flutter (Dart)
- **MongoDB ObjectId (`_id`, `user_id`, etc.):** Serializados como `String` (hex de 24 caracteres). No Dart, mapear como `String`.
- **Datas (`createdAt`, `last_login`, etc.):** Serializadas como strings ISO 8601 UTC. Utilizar `DateTime.parse()` ou `@JsonKey(fromJson: ...)` com Freezed.
- **Campos Anuláveis/Opcionais (`z.optional()` ou `z.nullable()`):** Mapear para `Type?` (ex: `String?`). A distinção entre nulo e ausente deve ser tratada no cliente.
- **União Discriminada:** Usar *sealed classes* ou `@Freezed(unionKey: 'type')` para lidar com polimorfismo (ex: módulo de Conteúdos).

---

## 3. Módulos da API

### 3.1 Autenticação & Identidade (`/auth`, `/me`)

#### `POST /auth/login/otp`
**Propósito & Regra de Negócio:** Envia um código OTP via WhatsApp para autenticação. Verifica se a conta está ativa e se o usuário é `premium`. Aplica rate limit de 60 segundos entre envios.
**Headers:** `Content-Type: application/json`
**Parâmetros / Body:**
| Campo | Tipo Zod | Equivalente Dart | Obrigatório? | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `wa_id` | `z.string()` | `String` | Sim | Número do WhatsApp do usuário. |
**Respostas:**
- `200 OK`: `{"message": "OTP sent successfully", "otp": "123456"}`
- `403 Forbidden`: `{"success": false, "userExists": true/false, "message": "..."}`

#### `POST /auth/login/verify`
**Propósito & Regra de Negócio:** Valida o código OTP e conclui o login. Em caso de sucesso, marca o número como verificado, atualiza `last_login` e gera o token JWT.
**Parâmetros / Body:**
| Campo | Tipo Zod | Equivalente Dart | Obrigatório? | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `wa_id` | `z.string()` | `String` | Sim | Número do WhatsApp do usuário. |
| `otp` | `z.string()` | `String` | Sim | Código recebido via WhatsApp. |
**Respostas:**
- `200 OK`: `{"success": true, "message": "OTP verified successfully", "user": { ...User }}` + `Authorization` Header.
- `400 Bad Request`: `{"success": false, "message": "Invalid or expired OTP"}`

#### `POST /auth/login/loginWithIdentifier`
**Propósito & Regra de Negócio:** Login tradicional via email ou username com senha.
**Parâmetros / Body:**
| Campo | Tipo Zod | Equivalente Dart | Obrigatório? | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `identifier`| `z.string()` | `String` | Sim | Username ou Email do usuário. |
| `password` | `z.string()` | `String` | Sim | Senha do usuário. |
**Respostas:**
- `200 OK`: `{"success": true, "message": "Password verified successfully", "user": { ...User }}` + `Authorization` Header.

#### `POST /auth/register`
**Propósito & Regra de Negócio:** Cadastra um novo usuário ou atualiza dados básicos. Verifica unicidade de `wa_id`, `email` e `userName`.
**Parâmetros / Body:** `CreateUserDto` (`wa_id`, `email`, `userName`, `name`, `password` obrigatórios).
**Respostas:**
- `200 OK`: `{"message": "User created successfully", "user": { ...User }}`

#### `GET /me`
**Propósito & Regra de Negócio:** Retorna os dados da sessão atual a partir do payload do JWT validado.
**Headers:** `Authorization: Bearer <token>`
**Respostas:**
- `200 OK`: `{"success": true, "message": "User fetched successfully", "user": { ...Payload }}`

---

### 3.2 Perfil do Usuário (`/profile`)
*(Todas as rotas exigem Header `Authorization`)*

#### `GET /profile/`
**Propósito & Regra de Negócio:** Retorna os dados completos do perfil logado (com cache Redis).
**Respostas:**
- `200 OK`: `{"success": true, "profile": { ...User }}`

#### `GET /profile/:username`
**Propósito & Regra de Negócio:** Retorna o perfil público (reduzido) de um usuário específico pelo `userName`.
**Parâmetros / URL:** `:username` (String)
**Respostas:**
- `200 OK`: `{"success": true, "profile": { "name": "...", "userName": "...", "avatar_url": "...", "banner_url": "...", "isVerifiedCreator": true, "createdAt": "..." }}`

#### `PATCH /profile/complete-registration`
**Propósito & Regra de Negócio:** Complementa o cadastro de um perfil (ex: após login OTP genérico). Valida unicidade de username e email e invalida o cache do perfil.
**Parâmetros / Body:** `CompleteRegistrationDto` (`name`, `userName`, `email`, `password` obrigatórios).
**Respostas:**
- `200 OK`: `{"success": true, "message": "Cadastro finalizado com sucesso", "profile": { ...User }}`

#### `PUT /profile/`
**Propósito & Regra de Negócio:** Atualiza parcialmente os dados do perfil logado (`UpdateUserDto`). Valida unicidade de chaves se houver alteração.
**Respostas:**
- `200 OK`: `{"success": true, "message": "Perfil atualizado com sucesso", "profile": { ...User }}`

#### `DELETE /profile/`
**Propósito & Regra de Negócio:** Desativa a conta do usuário logado (soft-delete: `status='inactive'`, preenche `deletedAt`).
**Respostas:**
- `200 OK`: `{"success": true, "message": "Perfil deletado com sucesso", "result": { ...User }}`

---

### 3.3 Pacotes de Figurinhas (`/pack`)

#### `GET /pack/`
**Propósito & Regra de Negócio:** Lista pacotes. Se `?user=X` for fornecido (Requer Auth e que o usuário requisitante seja igual ao solicitado), lista pacotes do usuário. Caso contrário, lista pacotes públicos paginados com filtros.
**Parâmetros / Query:**
| Campo | Tipo Zod | Equivalente Dart | Obrigatório? | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `user` | `z.string()` | `String?` | Não | ID do usuário dono (requer JWT e posse). |
| `search`| `z.string()` | `String?` | Não | Busca textual em nome, descrição e publisher. |
| `tags` | `z.union([z.string(), z.array(z.string())])` | `List<String>?` ou `String?` | Não | Filtro por tags múltiplas. O Flutter pode enviar um ou múltiplos parâmetros `?tags=`. |
| `category`| `packCategoryEnum` | `Enum?` | Não | Filtro por categoria (ex: anime, memes). |
| `page` | `z.number()` | `int` | Não (Default: 1)| Paginação. |
| `limit` | `z.number()` | `int` | Não (Default: 20)| Itens por página (Max: 50). |
**Respostas:**
- `200 OK (Com user)`: `{"success": true, "packs": [ ...StickerPack ]}`
- `200 OK (Público)`: `{"success": true, "data": { "data": [ ...StickerPack ], "total": 100, "page": 1, "limit": 20, "totalPages": 5 }}`

#### `POST /pack/`
*(Requer Header `Authorization`)*
**Propósito & Regra de Negócio:** Cria um pacote de figurinhas (`CreatePackDto`). Sanitiza tags e atribui ownership ao usuário logado.
**Parâmetros / Body:**
| Campo | Tipo Zod | Equivalente Dart | Obrigatório? | Default / Constraints | Descrição |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `pack_name` | `z.string()` | `String` | Sim | `min(3).max(30)` | Nome do pacote. |
| `description` | `z.string()` | `String` | Sim | `min(5).max(100)` | Descrição curta. |
| `tags` | `z.array(z.string())` | `List<String>` | Sim | `min(1).max(10)`. Item: `min(2).max(20)` | Array de tags descritivas. |
| `category` | `packCategoryEnum` | `Enum` | Não | `other` | Categoria do pacote. |
| `is_public` | `z.boolean()` | `bool` | Não | `true` | Visibilidade do pacote. |
| `icon_url` | `z.url()` | `String?` | Não | Nulo | Ícone do pacote. |

**Respostas:**
- `201 Created`: `{"success": true, "message": "Pacote criado com sucesso", "pack": { ...StickerPack }}`
- `400 Bad Request`: (Em caso de erro em alguma constraint do Zod).

#### `GET /pack/:id`
**Propósito & Regra de Negócio:** Retorna pacote detalhado (com figurinhas) via cache.
**Respostas:**
- `200 OK`: `{"success": true, "pack": { ...StickerPack }}`
- `404 Not Found`: `{"success": false, "message": "Pacote não encontrado"}`

#### `PUT /pack/:id` e `DELETE /pack/:id`
*(Requer Header `Authorization`)*
**Propósito & Regra de Negócio:** Modifica ou deleta (com deleção em cascata de figurinhas vinculadas) um pacote. RBAC estrito de posse.
**Respostas:**
- `200 OK`: Retorna pacote modificado ou sucesso na exclusão.

---

### 3.4 Figurinhas Individuais (`/sticker`)
*(Todas as rotas POST, PUT, DELETE exigem Auth e Ownership)*

#### `GET /sticker/`
**Propósito:** Listar figurinhas baseado nos query params `?user=` (valida ownership) ou `?pack=` (lista via cache do pacote).
**Respostas:**
- `200 OK`: `{"success": true, "stickers": [ ...Sticker ]}`

#### `GET /sticker/:id`
**Propósito:** Retorna detalhes de uma figurinha isolada via cache.
**Respostas:**
- `200 OK`: `{"success": true, "sticker": { ...Sticker }}`
- `404 Not Found`: `{"success": false, "message": "Figurinha não encontrada"}`

#### `POST /sticker/:packId`
**Propósito:** Cria uma figurinha, associa ao pacote, e incrementa atomicamente o contador `stickers_count` (estático ou dinâmico) do usuário. Invalida cache do pacote.
**Parâmetros / Body (`CreateStickerDto`):**
| Campo | Tipo Zod | Equivalente Dart | Obrigatório? | Default / Constraints | Descrição |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | `z.string()` | `String` | Sim | Nenhuma | Nome ou alias da figurinha. |
| `author` | `z.string()` | `String` | Sim | Nenhuma | Autor original da figurinha. |
| `cloudinary_id` | `z.string()` | `String` | Sim | Nenhuma | ID de referência no Cloudinary. |
| `sticker_url` | `z.url()` | `String` | Sim | `.url()` | URL do arquivo final. |
| `emojis` | `z.array(z.string())` | `List<String>` | Não | `[]`, `.max(3)` | Array com no máximo 3 emojis correspondentes. |
| `type` | `z.enum([...])` | `Enum` | Sim | `dynamic` ou `static` | Define onde o contador no usuário será incrementado. |

**Respostas:**
- `201 Created`: `{"success": true, "message": "Figurinha criada com sucesso", "sticker": { ...Sticker }}`
- `400 Bad Request`: (Se exceder 3 emojis, formato de URL inválido, etc).

#### `DELETE /sticker/:id`
**Propósito:** Deleta a figurinha e decrementa o contador `stickers_count` no usuário logado atomicamente.
**Respostas:**
- `200 OK`: `{"success": true, "message": "Figurinha deletada com sucesso"}`

---

### 3.5 Loja & Transações de Pétalas (`/store`)
*(Rotas GET com Auth opcional dependendo do front, POST/PUT/DELETE requer Admin)*

#### `GET /store/` e `GET /store/:id`
**Propósito:** Lista itens disponíveis para aquisição (`?status=active|inactive`).

#### `POST /store/:id/purchase`
*(Requer Header `Authorization`)*
**Propósito & Regra de Negócio:** Transação econômica crítica.
1. Valida se o item está `active`.
2. Valida se o usuário não o possui no inventário (evita compras duplicadas).
3. Deduz pétalas atomicamente se `user.petals_balance >= price_in_petals`.
4. Insere no inventário do usuário e incrementa `purchases_count` da loja.
**Respostas:**
- `200 OK`: `{"success": true, "message": "Item adquirido com sucesso", "item": { ...InventoryItem }}`
- `400 Bad Request`: (Em caso de saldo insuficiente, item inativo ou item já adquirido).

---

### 3.6 Inventário (`/inventory`)
*(Requer Header `Authorization`)*

#### `GET /inventory/`
**Propósito:** Lista todos os itens que o usuário comprou (`InventoryItem[]`), em ordem decrescente de aquisição. Cache Redis de 24h invalidado por novas compras.
**Respostas:**
- `200 OK`: `{"success": true, "items": [ ...InventoryItem ]}`

---

### 3.7 Conteúdos Dinâmicos (`/content`)
*(Rotas base abertas/autenticadas)*

#### `GET /content/`
**Propósito & Regra de Negócio:** Endpoint de campanhas e comunicados in-app. Filtra por tempo (onde `start_at <= agora` e `end_at >= agora` ou infinito) e plataforma (`ios`, `android`, `both`, `all`).
**Parâmetros / Query:**
- `type`: `banner` | `notification` | `announcement`
- `platform`: `ios` | `android`
**Respostas:**
- `200 OK`: `{"success": true, "contents": [ ...Content ]}`
- **Guia Flutter:** Implementar conversão utilizando `@Freezed(unionKey: 'type')` e subclasses baseadas no valor de `type`.

---

### 3.8 Upload de Mídia (`/upload`)
*(Requer Header `Authorization`)*

#### `POST /upload/?folder=...`
**Propósito & Regra de Negócio:** Aceita formulários Multipart para enviar arquivos em stream para o Cloudinary. O usuário precisa ter o perfil preenchido (`userName`). O arquivo será salvo com padrão `folder/userName/userName_timestamp_uuid`.
**Respostas:**
- `201 Created`: `{"success": true, "message": "Upload realizado", "cloudinary_id": "...", "sticker_url": "...", "type": "png"}`

#### `DELETE /upload/?public_id=...`
**Propósito & Regra de Negócio:** Remove um arquivo no Cloudinary, validando rigorosamente se a string `public_id` contém `/userName/` do usuário que efetuou a requisição (prevenção de deleção arbitrária).

---

### 3.9 Administração — RBAC (`/admin/*`)
*(Requer Header `Authorization` de usuários com cargo `admin` ou `moderator`)*

- `GET /admin/users` e `GET /admin/users/:id`: Listagem completa.
- `PATCH /admin/users/:id/status`: Soft-delete (`inactive`) forçado.
- `PATCH /admin/users/:id/role`: Alterar o cargo. Exclusivo de administrador (Moderadores tomam `403 Forbidden`). Proibido de rebaixar a si mesmo.
- `POST /admin/users/:id/petals/adjust`: Ajuste econômico manual de pétalas (adição ou dedução). Requer justificativa.

*(De forma análoga, há o módulo `/admin/contents` para gerenciar as datas e status dos comunicados/banners públicos)*

---

## 4. Modelos e Enums do Domínio

Ao mapear em Dart, certifique-se de prever todos os valores (ou um caso fallback para lidar com compatibilidade futura):

- `UserRole`: `"user"`, `"admin"`, `"moderator"`, `"company"`
- `UserStatus`: `"active"`, `"inactive"`
- `PackCategory`: `"anime"`, `"memes"`, `"reactions"`, `"gaming"`, `"cute"`, `"utility"`, `"other"`
- `StickerType`: `"dynamic"`, `"static"`
- `StoreItemType`: `"wallpaper"`, `"gift"`, `"badge"`, `"border"`, `"profile_frame"`, `"profile_picture"`, `"premium_subscription"`, `"other"`
- `ContentType`: `"banner"`, `"notification"`, `"announcement"`
- `ContentPlatform`: `"ios"`, `"android"`, `"both"`, `"all"`

## 5. Guia Final de Melhores Práticas (Flutter)
1. **Interceptor do Dio:** Configure um interceptor que injete silenciosamente `Authorization: Bearer $token`. Caso receba um **401**, execute a rotina de deslogar (clear storage) e enviar para tela de boas vindas.
2. **Serialização Segura:** Evite exceptions de casting tratando chaves inexistentes como `null`.
3. **Formatação de Dados:** Datas devem ser convertidas sempre considerando timezone local para exibição (ex: `DateTime.parse(json['createdAt']).toLocal()`).
