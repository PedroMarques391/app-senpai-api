# Senpai Figurinhas API - Documentação Oficial e Guia de Integração Flutter

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
- **BullMQ**: Mensageria assíncrona e background workers (`WhatsAppWorker` para mensagens via Baileys/Evolution API e `EmailWorker` para e-mails transacionais com templates HTML responsivos, incluindo códigos OTP, links de recuperação de senha e e-mails de confirmação de segurança com dados de auditoria).
- **Nodemailer / SMTP (`MailerInitializer`)**: Inicialização centralizada com pool de conexão SMTP compartilhado entre plugins Fastify e o `EmailWorker` para envio de códigos de verificação OTP, e-mails de recuperação de senha, alertas de segurança e comunicados.
- **Cloudinary**: Upload de mídia e transformação automática de assets (ex: conversão WebP, redimensionamento 256x256 e otimização para ícones de pacotes).
- **JWT (`@fastify/jwt`)**: Autenticação stateless com tokens Bearer contendo payload estrito do usuário.

---

## 2. Convenções Globais & Contratos Base

### 2.1 Padrão de Autenticação
- **Header Obrigatório (Rotas Protegidas):** `Authorization: Bearer <jwt_token>`
- **Payload do Token JWT (`request.user`):**
  - `_id`: `String` (Hex de 24 caracteres do ObjectId)
  - `wa_id`: `String` (Número normalizado no formato internacional com código de país `55`)
  - `name`: `String`
  - `userName`: `String`
  - `email`: `String`
  - `role`: `"user" | "admin" | "moderator" | "company"`
  - `premium`: `boolean` (Define acesso a cotas ilimitadas e recursos VIP)
  - `isNumberVerified`: `boolean`
  - `isEmailVerified`: `boolean` (Indica se o e-mail cadastrado foi autenticado via OTP)

### 2.2 Estrutura Padronizada de Respostas de Erro
A API possui tratamento centralizado (`error.plugin.ts` e decorators de plugins). O cliente Flutter deve tratar os seguintes status HTTP e formatos:

| Status HTTP | Código / Contexto | Payload Retornado (Exemplo Real) |
| :--- | :--- | :--- |
| **400 Bad Request** | Erro de validação Zod nos campos. | `{"success": false, "message": "Dados de requisição inválidos", "errors": {"pack_name": ["Required"]}}` |
| **400 Bad Request** | Erro de regra de negócio ou formato de ID. | `{"success": false, "message": "ID do pacote inválido"}` |
| **401 Unauthorized** | Token ausente, inválido ou expirado. | `{"success": false, "message": "Sua sessão expirou ou é inválida. Por favor, faça login novamente."}` |
| **403 Forbidden** | Cota diária excedida (Plano Free). | `{"success": false, "code": "QUOTA_EXCEEDED", "message": "Você já usou sua criação grátis de hoje. Volte amanhã ou assine o VIP para criar sem limites!"}` |
| **403 Forbidden** | Rate limit do OTP (espera necessária). | `{"success": false, "userExists": true, "retryAfter": 45, "message": "Por favor, aguarde 45 segundos antes de solicitar um novo código."}` |
| **403 Forbidden** | Falha de permissão / RBAC ou propriedade. | `{"success": false, "message": "Operação não permitida: você não pode excluir arquivos de outro usuário"}` |
| **404 Not Found** | Recurso não localizado no banco de dados. | `{"success": false, "message": "Pacote não encontrado"}` |
| **413 Payload Too Large** | Arquivo enviado no upload excede o limite máximo. | `{"success": false, "message": "O arquivo excede o limite máximo permitido de 25 MB."}` |
| **500 Internal** | Exceção não tratada no servidor. | `{"success": false, "message": "Erro interno do servidor"}` |

### 2.3 Guia de Integração para Flutter (Dart)
- **MongoDB ObjectId (`_id`, `user_id`, `pack_id`):** Retornados como `String` (hex de 24 chars). No Dart, mapear como `String`.
- **Datas (`createdAt`, `cycle_start`, `created_at`):** Serializadas como strings ISO 8601 UTC. No Dart, fazer o parse via `DateTime.parse(json['createdAt']).toLocal()` para exibição correta no fuso local.
- **Campos Opcionais e Nullable:** Tratar campos que podem vir ausentes ou como `null` usando tipos anuláveis (`String?`, `int?`).
- **Normalização e Variantes de WhatsApp (`wa_id`):** O backend garante a presença do prefixo de país `55` e oferece compatibilidade transparente com números brasileiros cadastrados com ou sem o 9º dígito (12 e 13 dígitos, ex: `551188887777` ou `5511988887777`). As consultas internas utilizam `AuthUtils.getWaIdVariants`, permitindo login, envio de OTP e busca independentemente da variante utilizada.

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
  1. **Normalização e Busca por Variantes:** O backend normaliza o número via `AuthUtils.normalizeWaId` (adicionando prefixo `55` se ausente) e localiza a conta utilizando variantes com e sem o 9º dígito (`AuthUtils.getWaIdVariants`), garantindo que tanto números de 12 quanto de 13 dígitos encontrem o cadastro correto. O OTP é registrado sob o `wa_id` exato armazenado no perfil do usuário.
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
      "message": "Código de verificação enviado com sucesso.",
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
      "message": "Código validado com sucesso.",
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
  - `400 Bad Request` / `500 Internal Error`:
    ```json
    {
      "message": "Código de verificação inválido ou expirado. Solicite um novo código."
    }
    ```

#### `POST /auth/login/loginWithIdentifier`
- **Descrição:** Login clássico com identificador (e-mail ou nome de usuário) e senha com verificação via Bcrypt. O campo `identifier` é normalizado automaticamente (`trim().toLowerCase()`). Emite JWT no header `Authorization`.
- **Request Body:**
  | Campo | Tipo Zod | Tipo Dart | Obrigatório? | Descrição |
  | :--- | :--- | :--- | :--- | :--- |
  | `identifier` | `z.string().trim().toLowerCase()` | `String` | Sim | E-mail ou username cadastrado. |
  | `password` | `z.string()` | `String` | Sim | Senha da conta. |
- **Respostas:**
  - `200 OK`: `{"success": true, "message": "Login realizado com sucesso.", "user": { ...User }}` + `Authorization` Header.

#### `POST /auth/register`
- **Descrição:** Cadastro completo inicial de usuário. Realiza hash da senha e validação de unicidade de `wa_id`, `userName` e `email`.
- **Request Body (`CreateUserDto`):** `wa_id`, `name`, `userName`, `email`, `password`.
- **Respostas:**
  - `200 OK`: `{"message": "Usuário cadastrado com sucesso.", "user": { ...User }}`

#### `POST /auth/password/recovery`
- **Descrição e Regra de Negócio:** Dispara o fluxo de recuperação de senha por e-mail para usuários cadastrados.
  1. **Normalização e Validação do E-mail:** O payload recebe `email`, que passa por validação com Zod (`z.string().trim().toLowerCase().email()`) e sanitização via `UserUtils.normalizeIdentifier`.
  2. **Verificação de Existência e Status:** O backend localiza o usuário no MongoDB. Se o usuário não existir, estiver com `status: "inactive"` ou não possuir e-mail cadastrado, retorna erro genérico amigável (`"Erro ao tentar redefinir a senha. Tente novamente."`) para evitar enumeração de contas por terceiros.
  3. **Token Criptográfico & TTL:** Gera um token seguro de 40 caracteres hexadecimais (`crypto.randomBytes(20).toString("hex")`) e grava no Redis sob a chave `reset:<token>` associado ao e-mail com tempo de expiração de **10 minutos** (600 segundos).
  4. **Envio Assíncrono via BullMQ & Nodemailer:** Enfileira o e-mail na fila `email`. O `EmailWorker` consome a fila e dispara o template HTML responsivo contendo o link de recuperação: `${PRODUCTION_URL}/pt/reset-password?token=${token}`.
- **Request Body:**
  | Campo | Tipo Zod | Tipo Dart | Obrigatório? | Descrição |
  | :--- | :--- | :--- | :--- | :--- |
  | `email` | `z.string().trim().toLowerCase().email()` | `String` | Sim | E-mail da conta a ser recuperada. |
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "E-mail de recuperação enviado com sucesso."
    }
    ```
  - `400 Bad Request` (Validação Zod de e-mail inválido):
    ```json
    {
      "success": false,
      "message": "Dados de requisição inválidos",
      "errors": {
        "email": ["Invalid email"]
      }
    }
    ```
  - `500 Internal / Erro de Regra` (Conta inativa ou não encontrada):
    ```json
    {
      "message": "Erro ao tentar redefinir a senha. Tente novamente."
    }
    ```

#### `POST /auth/reset-password`
- **Descrição e Regra de Negócio:** Redefine a senha da conta utilizando o token criptográfico recebido por e-mail e dispara alerta de segurança.
  1. **Validação do Token no Redis:** Consulta a chave `reset:<token>`. Se o token for inexistente ou estiver expirado (após 10 minutos), rejeita a requisição com erro `"Token inválido ou expirado."`.
  2. **Verificação da Conta:** Localiza a conta vinculada ao e-mail retornado pelo token no Redis e valida se a conta não possui status `inactive`.
  3. **Hash Criptográfico:** Gera novo hash seguro via Bcrypt (`AuthUtils.hashPassword`) com salt rounds adequados antes de salvar no banco de dados.
  4. **Atualização Atômica no MongoDB:** Atualiza o campo `password` do documento do usuário de forma atômica no banco de dados.
  5. **Invalidação Completa de Cache:** Remove a chave temporária `reset:<token>` do Redis e limpa o cache de perfil do usuário (`profile:<userId>` e `profile:username:<userName>`), garantindo que consultas subsequentes não retornem dados desatualizados.
  6. **E-mail de Notificação de Segurança com Auditoria:** Dispara assincronamente um e-mail de alerta (`success-email-template`) confirmando a alteração da senha, contendo detalhes de auditoria: data e horário formatados no Horário de Brasília, endereço IP de origem (com resolução de proxies/CDN), localização geográfica aproximada e dispositivo/navegador identificado pelo `User-Agent`.
- **Request Body:**
  | Campo | Tipo Zod | Tipo Dart | Obrigatório? | Descrição |
  | :--- | :--- | :--- | :--- | :--- |
  | `token` | `z.string()` | `String` | Sim | Token de recuperação recebido via link do e-mail. |
  | `password` | `z.string().min(8, "A senha deve ter no mínimo 8 caracteres.")` | `String` | Sim | Nova senha da conta (mínimo 8 caracteres). |
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Senha redefinida com sucesso."
    }
    ```
  - `400 Bad Request` (Falha na validação Zod da senha):
    ```json
    {
      "success": false,
      "message": "Dados de requisição inválidos",
      "errors": {
        "password": ["A senha deve ter no mínimo 8 caracteres."]
      }
    }
    ```
  - `500 Internal / Erro de Regra` (Token expirado/inválido ou conta inativa):
    ```json
    {
      "message": "Token inválido ou expirado."
    }
    ```
    ou
    ```json
    {
      "message": "Conta não encontrada ou inativa."
    }
    ```

#### `GET /me`
- **Descrição:** Retorna a identidade e claims do usuário autenticado diretamente a partir da validação do JWT.
- **Headers:** `Authorization: Bearer <token>`
- **Respostas:**
  - `200 OK`: `{"success": true, "message": "Dados do usuário carregados com sucesso.", "user": { ...JwtPayload }}`

---

### 3.2 Cotas Diárias de Criação (`/creation/quota`)
*(Requer Header `Authorization`)*

O sistema de cotas diárias controla a criação de pacotes e figurinhas para usuários do plano **Free**, incentivando o upgrade para **VIP (PRO/MESTRE)**.

#### Regras de Negócio do Ciclo de Cotas:
1. **Fuso Horário de Reset:** O ciclo diário é baseado no horário de Brasília (UTC-3) e **reinicia todos os dias às 06:00 BRT** (09:00 UTC).
2. **Limite Diário Grátis:** Usuários Free podem criar até **1 pacote** e até **3 figurinhas por dia** (`QuotaUtils.FREE_DAILY_STICKER_LIMIT = 3`).
3. **Bloqueio de Pacote Ativo:** Ao criar ou reservar o primeiro pacote do dia, todas as criações subsequentes daquele dia devem pertencer ao mesmo pacote até que a cota de 3 figurinhas se esgote.
4. **Usuários VIP (`premium: true`):** Possuem cota ilimitada (`isUnlimited: true`), sem restrição de pacote ou limite diário.

#### Regras de Cota de Armazenamento (`Storage Quota`):
Além das cotas diárias de criação, a plataforma monitora e limita o consumo total de armazenamento de mídias (`storage_used_bytes`) de cada usuário:
1. **Limite Plano Free:** **1 GB** (`1.073.741.824` bytes).
2. **Limite Plano VIP (`premium: true`):** **10 GB** (`10.737.418.240` bytes).
3. **PreHandler `checkStorageQuota`:** Intercepta envios de mídia no endpoint `POST /upload`. Se `storage_used_bytes + content_length > limit`, a requisição é barrada antes do stream para o Cloudinary com HTTP `403 Forbidden` (`code: "STORAGE_LIMIT_EXCEEDED"`).
4. **Ciclo de Vida e Sincronização:**
   - O tamanho em bytes da figurinha (`size_bytes`) é persistido e incrementado em `storage_used_bytes` na criação de figurinhas ou pacotes com itens.
   - Ao excluir figurinhas (`DELETE /sticker/:id`) ou pacotes (`DELETE /pack/:id`), o espaço ocupado é decrementado automaticamente da cota do usuário.

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
  2. **Criação de Figurinhas em Lote Embutidas:** O body aceita a propriedade `stickers?: CreateStickerDto[]`. Todas as figurinhas enviadas são criadas e vinculadas ao pacote na mesma operação atômica, incrementando o `stickers_count` do usuário (`static` ou `dynamic`) e acumulando `storage_used_bytes` com base na soma dos `size_bytes` de cada figurinha.
  3. **Geração Automática do `icon_url`:** Se o campo `icon_url` não for informado no payload, mas o array `stickers` contiver ao menos uma figurinha com URL válida do Cloudinary, o backend gera automaticamente o `icon_url` aplicando a transformação de otimização `c_fill,w_256,h_256,f_webp,q_auto`.
  4. **Campos Opcionais com Defaults:** `description` é opcional (default `"Sem descrição"`), e `tags` é opcional (default `[]`).
  5. **Registro de Cota:** Grava o consumo da cota em `creation_quotas` para usuários Free.
  6. **Invalidação Reativa de Cache:** Limpa as listagens cacheadas (`pack:list:*`), os pacotes do usuário (`pack:user:<userId>`) e o cache de perfil (`profile:<userId>`).
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
- **Descrição & Regras de Negócio:**
  1. **Validação de Propriedade:** Requer que o usuário seja o proprietário do pacote.
  2. **Exclusão Transacional no Banco:** Deleta o pacote e todas as suas figurinhas associadas no MongoDB (`packRepository.delete`).
  3. **Ajuste de Cotas do Usuário:** Decrementa os contadores de figurinhas (`stickers_count.static` e `stickers_count.dynamic`) e decrementa o armazenamento ocupado (`storage_used_bytes`).
  4. **Limpeza Segura de Mídias:** Aciona a deleção em lote dos assets correspondentes no Cloudinary via `deleteManyQuietly` no `UploadService`, sem blocos `try/catch` silenciosos e sem risco de derrubar a requisição com erros externos de rede.
  5. **Invalidação Reativa de Cache:** Invalida o cache do pacote (`pack:<id>`), listagens (`pack:list:*`), pacotes do usuário (`pack:user:<userId>`), figurinhas do pacote (`stickers:pack:*`) e o cache de perfil do usuário (`profile:<userId>`).
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
  4. **Contador do Usuário e Armazenamento:** Incrementa atômica e persistentemente o contador `stickers_count.static` ou `stickers_count.dynamic` do perfil do usuário e incrementa `storage_used_bytes` caso `size_bytes` seja informado.
  5. **Registro de Cota:** Registra o uso da cota para usuários Free em `creation_quotas`.
  6. **Invalidação Reativa de Cache:** Limpa os caches de figurinhas (`stickers:pack:<packId>`), do pacote (`pack:<packId>`), listagens (`pack:list:*`), pacotes do usuário (`pack:user:<userId>`) e do perfil do usuário (`profile:<userId>`), garantindo sincronização instantânea dos contadores na interface do app.
- **Request Body (`CreateStickerDto`):**
  | Campo | Tipo Zod | Tipo Dart | Obrigatório? | Constraints | Descrição |
  | :--- | :--- | :--- | :--- | :--- | :--- |
  | `name` | `z.string()` | `String` | Sim | — | Nome da figurinha. |
  | `author` | `z.string()` | `String` | Sim | — | Autor da figurinha. |
  | `cloudinary_id` | `z.string()` | `String` | Sim | — | Identificador do asset no Cloudinary. |
  | `sticker_url` | `z.url()` | `String` | Sim | URL válida | URL final da imagem/animação. |
  | `emojis` | `z.array(z.string())` | `List<String>?` | Não | Max 3 emojis / default `[]` | Emojis associados. |
  | `type` | `z.enum(["dynamic", "static"])` | `String` | Sim | `"dynamic"` ou `"static"` | Tipo da figurinha. |
  | `size_bytes` | `z.number().nonnegative()` | `int?` | Não | `>= 0` / default `0` | Tamanho do arquivo em bytes. |
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
- **Descrição & Regras de Negócio:**
  1. **Validação de Propriedade:** Requer que o usuário autenticado seja o proprietário da figurinha.
  2. **Exclusão no Banco de Dados:** Remove o registro da figurinha no MongoDB via `stickerRepository.delete`.
  3. **Ajuste de Cotas do Usuário:** Decrementa de forma atômica o contador `stickers_count` (estático ou dinâmico) e o armazenamento ocupado `storage_used_bytes`.
  4. **Limpeza Segura no Cloudinary:** Executa a deleção segura do asset via `uploadService.deleteQuietly`, garantindo que a base de dados permaneça íntegra antes da exclusão física na CDN.
  5. **Invalidação Reativa de Cache:** Invalida a figurinha (`sticker:<id>`), as figurinhas do pacote (`stickers:pack:*`), o pacote (`pack:<packId>`), listagens (`pack:list:*`), pacotes do usuário (`pack:user:<userId>`) e o cache de perfil (`profile:<userId>`).
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
        "bio": "Criador de figurinhas e fã de animes",
        "isVerifiedCreator": true,
        "createdAt": "2026-09-01T12:00:00.000Z"
      }
    }
    ```

#### `PATCH /profile/complete-registration`
- **Descrição:** Permite finalizar o cadastro de um usuário após login inicial via OTP.
- **Request Body (`CompleteRegistrationDto`):** `name`, `userName`, `email`, `password`.

#### `PUT /profile/`
- **Descrição:** Atualiza dados cadastrais e preferências do perfil do próprio usuário autenticado (`UpdateUserDto`).
- **Campos Aceitos (`UpdateUserDto` - Parciais e estritos):**
  | Campo | Tipo Zod | Tipo Dart | Constraints / Descrição |
  | :--- | :--- | :--- | :--- |
  | `name` | `z.string()` | `String?` | Nome do usuário. |
  | `userName` | `z.string()` | `String?` | Nome de usuário único (letras minúsculas/sem espaços). |
  | `email` | `z.string().email()` | `String?` | E-mail do usuário (único no sistema). |
  | `bio` | `z.string()` | `String?` | Biografia do usuário (máximo 120 caracteres). |
  | `avatar_url` | `z.url()` | `String?` | URL do avatar hospedado. |
  | `banner_url` | `z.url()` | `String?` | URL do banner do perfil. |
  | `preferred_payment` | `z.string()` | `String?` | Identificador de pagamento preferencial. |
- **Campos Protegidos do Sistema:** O schema omite intencionalmente campos como `premium`, `petals_balance`, `role`, `status`, `subscriptions`, `stickers_count`, `daily_missions`, etc., garantindo que alterações no perfil nunca afetem a assinatura VIP ou o saldo do usuário.
- **Invalidação de Cache:** Invalida automaticamente `profile:<userId>` e `profile:username:<userName>`.
- **Respostas:**
  - `200 OK`: `{"success": true, "message": "Perfil atualizado com sucesso", "profile": { ...User }}`

#### `DELETE /profile/`
- **Descrição:** Desativa o perfil do usuário autenticado (soft-delete: `status = "inactive"`, define `deletedAt`).

#### `POST /profile/email/code/send`
- **Descrição e Regra de Negócio:** Dispara o envio de um código de verificação OTP de 6 dígitos para o endereço de e-mail informado. Disponível para **qualquer usuário autenticado** (não requer plano Premium).
  1. **Enfileiramento Assíncrono:** O envio é processado via fila `email` no **BullMQ**, consumida pelo `EmailWorker` com template HTML responsivo estilizado.
  2. **Verificação de Conta Ativa:** Identifica o usuário logado (`request.user._id`) e bloqueia solicitações caso a conta possua status `inactive`.
  3. **Disponibilidade Geral:** Não há restrição de assinatura (plano Free e VIP têm acesso igual à verificação de identidade por e-mail).
  4. **Rate Limit:** Aplica intervalo mínimo de 60 segundos entre disparos para o mesmo e-mail. Se chamado antes do tempo, retorna `403 Forbidden` com `retryAfter` indicando os segundos restantes para reenvio.
  5. **TTL:** O código OTP expira em 5 minutos (300 segundos).
- **Request Body:**
  | Campo | Tipo Zod | Tipo Dart | Obrigatório? | Descrição |
  | :--- | :--- | :--- | :--- | :--- |
  | `email` | `z.string().trim().toLowerCase().email()` | `String` | Sim | E-mail do usuário a receber o código OTP. |
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Código enviado para o seu e-mail",
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

#### `POST /profile/email/code/verify`
- **Descrição e Regra de Negócio:** Valida o código OTP de 6 dígitos e confirma o e-mail da conta do usuário autenticado.
  1. **Validação do Código:** Compara o código informado com o token armazenado no Redis via `OtpService.verifyOtp`. Lança erro caso o código seja inválido ou já tenha expirado.
  2. **Atualização no Banco de Dados:** Atualiza o usuário com `isEmailVerified: true` de forma atômica no MongoDB.
  3. **Invalidação de Cache Automática:** Remove imediatamente as chaves de cache de perfil no Redis (`profile:<userId>` e `profile:username:<userName>`), garantindo que a próxima consulta a `GET /profile/` retorne o status atualizado sem inconsistências de cache.
- **Request Body:**
  | Campo | Tipo Zod | Tipo Dart | Obrigatório? | Descrição |
  | :--- | :--- | :--- | :--- | :--- |
  | `email` | `z.string().trim().toLowerCase().email()` | `String` | Sim | E-mail validado. |
  | `code` | `z.string().length(6)` | `String` | Sim | Código numérico de 6 dígitos recebido por e-mail. |
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "E-mail verificado com sucesso!"
    }
    ```
  - `400 Bad Request` / `500 Internal Error`:
    ```json
    {
      "message": "Código de verificação inválido ou expirado. Solicite um novo código."
    }
    ```

---

### 3.9 Upload de Mídia (`/upload`)
*(Requer Header `Authorization`)*

#### `POST /upload/?folder=...`
- **Descrição:** Envia arquivos de imagem/sticker via Multipart Stream diretamente ao Cloudinary, organizando o path em pastas segregadas por usuário (`folder/userName/filename`).
- **Validação de Cota:** Possui o preHandler `app.checkStorageQuota`. Bloqueia o upload antes de iniciar a transmissão se o tamanho indicado no header `Content-Length` somado ao `storage_used_bytes` do usuário ultrapassar o limite do plano (1GB Free / 10GB VIP).
- **Limite Máximo por Arquivo (25 MB):** O servidor rejeita imediatamente uploads truncados ou que excedam 25 MB com HTTP `413 Payload Too Large`.
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
      "type": "png",
      "bytes": 45120
    }
    ```
  - `403 Forbidden` (Cota de Armazenamento Excedida):
    ```json
    {
      "success": false,
      "code": "STORAGE_LIMIT_EXCEEDED",
      "message": "Limite de armazenamento atingido (1 GB para plano Free). Faça upgrade para VIP e desbloqueie 10 GB!",
      "storage": {
        "used_bytes": 1073741824,
        "limit_bytes": 1073741824,
        "is_vip": false
      }
    }
    ```
  - `413 Payload Too Large`:
    ```json
    {
      "success": false,
      "message": "O arquivo excede o limite máximo permitido de 25 MB."
    }
    ```

#### `DELETE /upload/?public_id=...`
- **Descrição:** Exclui um asset do Cloudinary. Valida com rigor se o `public_id` contém o `userName` do usuário requisitante para prevenir deleção de arquivos de outros usuários. Suporta exclusão transparente tanto de imagens quanto de vídeos com fallback automático de tipo de recurso (`image` / `video`) na camada resiliente do `UploadService`.

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

### 3.12 Missões Diárias, Níveis & Atividade (`/missions`)
*(Requer Header `Authorization`)*

O módulo de gamificação do Senpai estimula a retenção e o engajamento diário dos usuários através de missões com objetivos práticos, acúmulo de experiência (**XP**), progressão de **Nível (1 ao 100)**, ofensivas (**Streaks**) e bonificação em **Pétalas**.

#### Regras de Negócio e Mecânicas de Gamificação:
1. **Ciclo Diário Sincronizado:** O ciclo diário de missões é rigorosamente alinhado ao fuso de Brasília (`QuotaUtils.getCycleInfo()`), com virada todos os dias às **06:00 BRT** (09:00 UTC), gerando a chave de ciclo `YYYY-MM-DD` (ex: `"2026-09-18"`).
2. **Ciclo Semanal ISO & Dias Ativos:** Acompanha os dias em que o usuário esteve ativo na semana corrente (`DateUtils.getIsoWeekIdentifier`, ex: `"2026-W38"`). Ao virar a semana ISO, o array `weekly_active_days` é reiniciado com o novo dia.
3. **Ofensiva Diária (Streak):**
   - Se o usuário acessar o app no mesmo ciclo diário: o streak é mantido.
   - Se o último ciclo ativo foi o dia anterior (`yesterday`): o streak é incrementado em `+1`.
   - Se houver quebra de 1 ou mais dias: a ofensiva é resetada para `1`.
4. **Sistema Progressivo de Níveis & XP (`LevelUtils`):**
   - **Nível Máximo:** `100`.
   - **Fórmula de XP Necessário:** `xpForLevel(level) = 1000 + (level - 1) * 80`.
     - *Nível 1:* 1.000 XP
     - *Nível 2:* 1.080 XP
     - *Nível 3:* 1.160 XP ...
   - O cálculo decompõe o `total_xp` acumulado, calculando o nível atual, o progresso percentual (`progress` de `0.0` a `1.0`), o XP no nível (`xpInLevel`) e o XP faltante para o próximo nível (`xpNeeded`).
5. **Missões Estáticas Diárias:**
   - `daily_checkin` ("Presença Diária"): Abrir o app no dia. Concluída automaticamente ao consultar o overview diário. Recompensa: `+40 XP`, `+5 Pétalas`.
   - `create_sticker` ("Criar Figurinha"): Criar pelo menos 1 figurinha no editor no ciclo atual. Recompensa: `+120 XP`, `+20 Pétalas`.
   - `favorite_pack` ("Apoiar a Comunidade"): Adicionar pelo menos 1 pacote público aos favoritos no ciclo atual. Recompensa: `+80 XP`, `+10 Pétalas`.
6. **Resgate Atômico de Recompensas (`claim`):**
   - O resgate é transacionado atomicamente no MongoDB com `findOneAndUpdate` e predicado `$ne: missionId`.
   - Não permite resgate duplo no mesmo ciclo diário.
   - As recompensas em pétalas e XP são creditadas instantaneamente no documento do usuário.

---

#### `GET /missions/daily`
- **Descrição:** Retorna o panorama completo de missões do dia, progresso do usuário, nível, XP, streak e histórico semanal de presença. Ao chamar este endpoint, a presença diária (`daily_checkin`) é automaticamente completada e a atividade é atualizada.
- **Headers:** `Authorization: Bearer <token>`
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "cycle_date": "2026-09-18",
      "level_info": {
        "level": 3,
        "xpInLevel": 420,
        "xpNeeded": 1160,
        "progress": 0.3621
      },
      "activity": {
        "current_streak": 5,
        "weekly_active_days": [
          "2026-09-15",
          "2026-09-16",
          "2026-09-17",
          "2026-09-18"
        ],
        "week_cycle": "2026-W38"
      },
      "missions": [
        {
          "id": "daily_checkin",
          "title": "Presença Diária",
          "description": "Abra o Senpai e confira suas novidades do dia.",
          "goal": 1,
          "metric": "app_checkin",
          "reward": {
            "xp": 40,
            "petals": 5
          },
          "active": true,
          "current_progress": 1,
          "completed": true,
          "claimed": false
        },
        {
          "id": "create_sticker",
          "title": "Criar Figurinha",
          "description": "Crie pelo menos 1 figurinha no editor hoje.",
          "goal": 1,
          "metric": "stickers_created",
          "reward": {
            "xp": 120,
            "petals": 20
          },
          "active": true,
          "current_progress": 1,
          "completed": true,
          "claimed": false
        },
        {
          "id": "favorite_pack",
          "title": "Apoiar a Comunidade",
          "description": "Adicione 1 pacote público aos seus favoritos.",
          "goal": 1,
          "metric": "packs_favorited",
          "reward": {
            "xp": 80,
            "petals": 10
          },
          "active": true,
          "current_progress": 0,
          "completed": false,
          "claimed": false
        }
      ]
    }
    ```

---

#### `POST /missions/:id/claim`
- **Descrição:** Reivindica as recompensas (XP e Pétalas) de uma missão diária concluída.
- **Headers:** `Authorization: Bearer <token>`
- **URL Params:**
  - `id`: Identificador da missão (ex: `"daily_checkin"`, `"create_sticker"`, `"favorite_pack"`).
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Recompensa resgatada com sucesso!",
      "petals_balance": 125,
      "total_xp": 2660,
      "level_info": {
        "level": 3,
        "xpInLevel": 500,
        "xpNeeded": 1160,
        "progress": 0.4310
      }
    }
    ```
  - `500 Internal / Regra de Negócio` (Missão incompleta ou já resgatada):
    ```json
    {
      "message": "Missão ainda não foi concluída."
    }
    ```
    ou
    ```json
    {
      "message": "Recompensa já foi resgatada ou ciclo expirou."
    }
    ```

---

### 3.13 Faturamento & Webhooks RevenueCat (`/webhooks/revenuecat`)

Módulo responsável pelo processamento de eventos de compras in-app e assinaturas de planos VIP (VIP Pro e VIP Mestre) através da integração com **RevenueCat**.

#### `GET /webhooks/revenuecat/`
- **Descrição:** Endpoint de verificação de liveness e status da rota de faturamento.
- **Headers:** Nenhum (Aberto).
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Billing route is up"
    }
    ```

#### `POST /webhooks/revenuecat/revenuecat-webhook`
- **Descrição & Regras de Negócio:**
  1. **Autenticação por Secret:** Requer header `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`. Requisições com token inválido ou ausente são rejeitadas com HTTP `401 Unauthorized`.
  2. **Identificação do Usuário:** O RevenueCat envia o campo `event.app_user_id`, que deve corresponder ao `_id` do usuário no MongoDB (Hex de 24 caracteres).
  3. **Tratamento de Eventos:**
     - `INITIAL_PURCHASE` / `RENEWAL`: Ativa o status `premium: true` no usuário e popula o objeto `subscriptions` com:
       - `start`: Data atual.
       - `end`: Data de expiração (`event.expiration_at_ms`).
       - `plan`: `"VIP_MESTRE"` (se `event.product_id === "vip_mestre"`) ou `"VIP_PRO"`.
       - `type`: `"MESTRE"` (se `event.product_id === "vip_mestre"`) ou `"PRO"`.
     - `CANCELLATION` / `EXPIRATION`: Atualiza `premium: false` no perfil do usuário.
- **Request Body (RevenueCat Webhook Payload):**
  ```json
  {
    "event": {
      "type": "INITIAL_PURCHASE",
      "app_user_id": "66dec987a123b456c7890123",
      "product_id": "vip_mestre",
      "expiration_at_ms": 1735689600000
    }
  }
  ```
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "success": true
    }
    ```
  - `401 Unauthorized`:
    ```json
    {
      "error": "Unauthorized"
    }
    ```

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
export type VipPlan = "VIP_PRO" | "VIP_MESTRE";

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

// Métricas de Missões Diárias
export type MissionMetric =
  | "app_checkin"
  | "stickers_created"
  | "packs_favorited";
```

### Modelos de Gamificação & Missões
```typescript
export interface MissionReward {
  xp: number;
  petals: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  goal: number;
  metric: MissionMetric;
  reward: MissionReward;
  active: boolean;
}

export interface UserMissionProgressDto extends Mission {
  current_progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface LevelInfo {
  level: number;
  xpInLevel: number;
  xpNeeded: number;
  progress: number; // 0.0 a 1.0 (percentual de progresso na barra)
}

export interface DailyMissionOverview {
  cycle_date: string;
  level_info: LevelInfo;
  activity: {
    current_streak: number;
    weekly_active_days: string[];
    week_cycle: string;
  };
  missions: UserMissionProgressDto[];
}

export interface ClaimMissionResult {
  petals_balance: number;
  total_xp: number;
  level_info: LevelInfo;
}
```

### Assinatura VIP do Usuário (`UserSubscription`)
```typescript
export interface UserSubscription {
  start: Date | string;
  end: Date | string;
  type: VipType;
  plan: VipPlan;
}
```

### Perfil Público do Usuário (`PublicProfileDto`)
```typescript
export interface PublicProfileDto {
  name: string;
  userName: string;
  createdAt: Date | string;
  avatar_url?: string;
  banner_url?: string;
  bio?: string;
  isVerifiedCreator: boolean;
}
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
6. **Fluxo de Verificação de E-mail via OTP:**
   - Na tela de perfil ou configurações, use `POST /profile/email/code/send` e mapeie o campo `retryAfter` para acionar a contagem regressiva no botão de reenvio.
   - Após o sucesso em `POST /profile/email/code/verify`, a próxima requisição a `GET /profile/` refletirá `isEmailVerified: true` automaticamente devido à invalidação de cache pelo backend.
7. **Fluxo de Recuperação e Redefinição de Senha:**
   - **Disparo da Recuperação:** Na tela "Esqueci minha senha", faça um `POST /auth/password/recovery` passando `{ "email": "usuario@email.com" }`. O backend normaliza o e-mail (lowercase/trim), valida a vigência da conta e enfileira um e-mail com link de redefinição.
   - **Deep Link / Abertura Web:** O link recebido no e-mail aponta para `${PRODUCTION_URL}/pt/reset-password?token=<token>`. O aplicativo Flutter pode interceptar este domínio via App Links/Deep Links para abrir a tela de redefinição in-app capturando o query parameter `token`, ou permitir que o usuário realize o reset pelo navegador e retorne ao app para fazer o login.
   - **Submissão da Nova Senha:** Na tela de criação da nova senha, envie `POST /auth/reset-password` contendo `{ "token": "<token>", "password": "<novaSenha>" }` (mínimo de 8 caracteres). Com o retorno `200 OK`, direcione o usuário diretamente para a tela de login (`POST /auth/login/loginWithIdentifier`).
   - **Confirmação e Auditoria:** O backend dispara automaticamente um e-mail transacional de segurança informando a alteração da senha, com dados de auditoria (data e hora de Brasília, IP, localização aproximada e dispositivo).
8. **Integração do Módulo de Gamificação (Missões, Streaks e Níveis):**
   - **Inicialização da Tela de Recompensas:** Chame `GET /missions/daily` para carregar a lista de missões, a ofensiva atual (`current_streak`), os dias ativos da semana (`weekly_active_days`) e os dados de nível (`level_info`).
   - **Barra de Progresso de XP:** Utilize `level_info.progress` (valor de `0.0` a `1.0`) para preencher diretamente a barra de progresso linear no Flutter (`LinearProgressIndicator(value: levelInfo.progress)`), exibindo `${levelInfo.xpInLevel} / ${levelInfo.xpNeeded} XP`.
   - **Feedback Imediato de Resgate:** Ao tocar no botão "Resgatar" em uma missão concluída (`completed: true` e `claimed: false`), envie `POST /missions/:id/claim`. Atualize os estados locais do usuário com o retorno:
     - Substitua o saldo de pétalas por `result.petals_balance`.
     - Atualize o XP e o `level_info` do usuário.
     - Se `result.level_info.level > levelAnterior`, dispare uma animação festiva de **Level Up!** na UI.
     - Marque a missão localmente como `claimed: true`.
9. **Integração de Assinaturas com RevenueCat:**
   - No cliente Flutter, configure o SDK do Purchases / RevenueCat informando o `_id` do MongoDB retornado no login (`request.user._id`) como `app_user_id`:
     `await Purchases.logIn(user.id);`
   - O backend processa o webhook oficial do RevenueCat (`POST /webhooks/revenuecat/revenuecat-webhook`) para conceder o status VIP (`premium: true`) e salvar o plano contratado (`VIP_PRO` ou `VIP_MESTRE`).
   - Após a conclusão da compra na App Store / Play Store pelo Flutter, recarregue os dados via `GET /profile/` para refletir imediatamente as novas cotas ilimitadas e o selo VIP no aplicativo.
