# Relatório Técnico e Plano de Implementação: Moderação de Grupos no App

**Projeto:** Senpai API (`backend-app`) & Senpai App Flutter (`Senpai-Figurinhas`)  
**Data:** 16 de Outubro de 2026  
**Status:** Concluído e Validado (Backend e App 100% integrados e testados)  
**Documento de Referência:** [API-DOC.md](file:///home/pedro/projects/senpai/backend-app/docs/API-DOC.md)

---

## Sumário Executivo

Historicamente, a moderação de grupos de WhatsApp da funcionalidade VIP Mestre era realizada via links em e-mails enviados ao moderador, acionando a rota pública `GET /group/moderate?token=<token>`. Esse modelo apresenta riscos operacionais conhecidos:
1. **Scanners automáticos de e-mail** (antivírus corporativos, Microsoft SafeLinks, Google Mail) pré-carregam links com requisições `GET`, aprovando ou rejeitando grupos involuntariamente.
2. **Falta de interface centralizada**, impossibilitando que múltiplos moderadores tenham visibilidade da fila de solicitações pendentes e de quem realizou a análise.
3. **Ausência de controle transacional e concorrência**, permitindo que cliques duplicados ou ações simultâneas gerem inconsistências.

Com a implementação do **Painel de Moderação** no aplicativo, o objetivo deste plano é desenhar a migração completa da tomada de decisão para dentro do app, transformando o e-mail em um alerta estritamente informativo, aposentando os links públicos de ação com total segurança e preservando as regras de negócio existentes.

---

## 1. Como o Processo Funciona Hoje (Backend)

### 1.1 Estrutura do Schema de Grupos
- **Arquivo de Definição:** [group.schema.ts](file:///home/pedro/projects/senpai/backend-app/core/schemas/group.schema.ts)
- **Coleção no MongoDB:** `groups`
- **Modelagem de Dados:** Um documento por usuário (`user_id: ObjectId`). Cada documento abriga um array `groups` contendo de 1 a 2 itens de grupo (`groupItemSchema`).
- **Campos do Subdocumento (`groupItemSchema`, L10-15):**
  - `id`: `z.string().default(() => randomUUID())` — Identificador único universal (UUID v4 em formato string), e **não** um `_id` de subdocumento do MongoDB.
  - `title`: `z.string().min(1)` — Nome/título do grupo.
  - `url`: `z.url()` — URL de convite do WhatsApp.
  - `status`: `groupItemStatusSchema` (`"pending" | "accepted" | "rejected"`), com default `"pending"`. O status **já está implementado** no schema.
- **Campos do Documento Raiz (`groupsSchema`, L17-23):**
  - `_id`: `ObjectId`
  - `user_id`: `ObjectId`
  - `groups`: `Array<GroupItem>` (mínimo 1, máximo 2)
  - `created_at`: `Date`
  - `updated_at`: `Date`

### 1.2 Ciclo de Vida: Criação, Alteração e Remoção
O ciclo é gerido por [group.service.ts](file:///home/pedro/projects/senpai/backend-app/src/services/group.service.ts) e persistido por [group.repository.ts](file:///home/pedro/projects/senpai/backend-app/src/repositories/group.repository.ts):

| Operação | Método no Service | Método no Repository | Status do Item | Disparo de E-mail |
| :--- | :--- | :--- | :--- | :--- |
| **Criação de Grupo** | `createGroup` ([L50-97](file:///home/pedro/projects/senpai/backend-app/src/services/group.service.ts#L50-L97)) | `create` ([L32-39](file:///home/pedro/projects/senpai/backend-app/src/repositories/group.repository.ts#L32-L39)) ou `update` ([L41-49](file:///home/pedro/projects/senpai/backend-app/src/repositories/group.repository.ts#L41-L49)) | Recebe `"pending"` por padrão. | Dispara `sendModerationEmail` para `MODERATOR_EMAIL` com assunto `[Moderação] Novo Grupo Cadastrado`. Gera 2 tokens (aprovar/rejeitar). |
| **Alteração de Item** | `updateGroupItem` ([L123-161](file:///home/pedro/projects/senpai/backend-app/src/services/group.service.ts#L123-L161)) | `updateGroupItem` ([L51-82](file:///home/pedro/projects/senpai/backend-app/src/repositories/group.repository.ts#L51-L82)) | **Reseta para `"pending"`** automaticamente sempre que `title` ou `url` for alterado ([L66-68](file:///home/pedro/projects/senpai/backend-app/src/repositories/group.repository.ts#L66-L68)). | Dispara `sendModerationEmail` com assunto `[Moderação] Grupo Atualizado`. Gera 2 tokens (aprovar/rejeitar). |
| **Remoção de Item** | `deleteGroupItem` ([L163-197](file:///home/pedro/projects/senpai/backend-app/src/services/group.service.ts#L163-L197)) | `deleteGroupItem` ([L106-131](file:///home/pedro/projects/senpai/backend-app/src/repositories/group.repository.ts#L106-L131)) | Executa `$pull` do item no array. Se `groups.length === 0`, deleta o documento pai. | Dispara e-mail informativo com assunto `[Moderação] Grupo Removido`. **Não gera tokens** (`groupId: undefined`). |
| **Remoção Total** | `deleteGroup` ([L200-217](file:///home/pedro/projects/senpai/backend-app/src/services/group.service.ts#L200-L217)) | `delete` ([L133-137](file:///home/pedro/projects/senpai/backend-app/src/repositories/group.repository.ts#L133-L137)) | Remove o documento pai por `_id`. | Não envia e-mail. |

### 1.3 Fluxo do E-mail do Moderador e Mecanismo de Tokens
1. **Onde é disparado:** Método privado `sendModerationEmail` ([L246-323](file:///home/pedro/projects/senpai/backend-app/src/services/group.service.ts#L246-L323)).
2. **Destinatário:** Variável de ambiente `process.env.MODERATOR_EMAIL`.
3. **Remetente:** `EMAIL_SENDERS.SECURITY` (`security@senpai.app`).
4. **Template HTML:** [moderation-group-email-template.ts](file:///home/pedro/projects/senpai/backend-app/src/templates/email/moderation-group-email-template.ts).
5. **Geração e Validação de Tokens:**
   - Para cada item de grupo sob análise, o backend gera:
     - `acceptToken = crypto.randomBytes(20).toString("hex")`
     - `rejectToken = crypto.randomBytes(20).toString("hex")`
   - Armazena no Redis via `cacheService.set` com chave `moderate:<token>` e TTL de 7 dias (`60 * 60 * 24 * 7` segundos):
     ```ts
     {
       groupId: string,
       itemId: string,
       action: "accepted" | "rejected",
       moderatorEmail: process.env.MODERATOR_EMAIL,
       createdAt: Date.now()
     }
     ```
   - **Relação com Recuperação de Senha:** O fluxo de grupos **não** compartilha utilitário de geração de tokens com [recovery.service.ts](file:///home/pedro/projects/senpai/backend-app/src/services/recovery.service.ts#L41-L43). O serviço de recuperação usa `reset:<token>` com TTL de 10 minutos para e-mails. A remoção dos tokens de grupos **não oferece nenhum impacto** ao fluxo de recuperação de senha.
6. **Como os Botões Funcionam e Rota Receptora:**
   - O e-mail renderiza tags `<a>` HTML com botões "✓ Aprovar" e "✕ Rejeitar" apontando para `${baseUrl}/group/moderate?token=<token>`.
   - A rota receptora é `GET /group/moderate` declarada em [group.router.ts](file:///home/pedro/projects/senpai/backend-app/src/routes/group.router.ts#L13-L33).
   - É um endpoint público (sem header de autorização).
   - Ao receber o clique (método **GET**):
     - Lê o payload do Redis (`moderate:<token>`).
     - Executa `updateGroupItemStatus` ([group.repository.ts:L84-104](file:///home/pedro/projects/senpai/backend-app/src/repositories/group.repository.ts#L84-L104)), atualizando `groups.$.status` para `"accepted"` ou `"rejected"`.
     - Deleta o token no Redis via `cacheService.del` (uso único).
     - **Decide imediatamente** e retorna um JSON bruto (`200 OK` com `{ success: true, message: "...", group, item }`).
     - **Não há tela de confirmação intermediária**.

### 1.4 Efeitos da Decisão Hoje e Notificações ao Dono
- **Alterações no Banco:** Atualiza `groups.$.status` para `"accepted"` ou `"rejected"` e atualiza o carimbo `updated_at: new Date()`.
- **Notificação ao Dono do Grupo:** **NENHUMA**. Não há envio de e-mail, notificação push ou alerta in-app ao criador do grupo quando ele é aprovado ou rejeitado. O dono apenas consulta o status passivamente ao acessar a tela "Meus grupos de WhatsApp" no app (`GET /group/`).
- **Diretriz:** Manter estritamente esse comportamento. Nenhuma notificação ao dono deve ser introduzida sem solicitação explícita.

### 1.5 Autorização Atual vs. Novo Schema de Usuário
- **Autorização Hoje:** Insegura. Qualquer agente que tenha posse do token da querystring pode aprovar ou rejeitar grupos, sem necessidade de login.
- **Estrutura Atual de Usuários ([user.schema.ts](file:///home/pedro/projects/senpai/backend-app/core/schemas/user.schema.ts#L4-L20)):**
  - `role`: `userRoleEnum` com valores `"user" | "admin" | "moderator"`.
  - `accountType`: `userAccountTypeEnum` com valores `"member" | "senpai" | "developer" | "owner" | "partner" | "company"`.
  - O JWT assinado no login ([auth.service.ts:L110-120](file:///home/pedro/projects/senpai/backend-app/src/services/auth.service.ts#L110-L120)) inclui ambos:
    ```ts
    {
      _id: string,
      wa_id: string,
      name: string,
      userName: string,
      email: string,
      role: UserRole,
      accountType: UserAccountType
    }
    ```
- **Proteção Atual no Backend:**
  - O roteador administrativo [admin.router.ts:L10](file:///home/pedro/projects/senpai/backend-app/src/routes/admin/admin.router.ts#L10) aplica globalmente o middleware `app.requireAdmin("admin", "moderator")`.
  - O decorador `requireAdmin` ([auth.plugin.ts:L27-40](file:///home/pedro/projects/senpai/backend-app/src/plugin/auth.plugin.ts#L27-L40)) valida exclusivamente `roles.includes(request.user.role)`.
- **Regra no App ([auth_user.dart:L213-217](file:///home/pedro/projects/senpai/Senpai-Figurinhas/lib/core/auth/auth_user.dart#L213-L217)):**
  ```dart
  bool get canAccessAdminPanel {
    if (isOwner) return true; // accountType == 'owner'
    final normalized = role.trim().toUpperCase();
    return const {'ADMIN', 'MODERATOR'}.contains(normalized);
  }
  ```
- **Divergência Registrada:** No backend, `requireAdmin` valida apenas `role`. Se um usuário tiver `accountType: "owner"`, mas `role: "user"`, ele receberá `403 Forbidden` na API, mesmo com o app exibindo o botão. Para haver coerência, quem modera no app deve possuir `role: "admin"` ou `"moderator"`, ou o backend deve reconhecer `accountType: "owner"`.

### 1.6 Rotas Administrativas Existentes
- Confirmado no código ([admin.router.ts](file:///home/pedro/projects/senpai/backend-app/src/routes/admin/admin.router.ts)) e na documentação ([API-DOC.md §3.11](file:///home/pedro/projects/senpai/backend-app/docs/API-DOC.md#L1048)):
  - Rotas de usuários: `GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id/status`, `PATCH /admin/users/:id/role`, `POST /admin/users/:id/petals/adjust`.
  - Rotas de conteúdos: `GET /admin/contents/`, `POST /admin/contents/`, `GET /admin/contents/:id`, `PUT /admin/contents/:id`, `DELETE /admin/contents/:id`.
  - Rotas de pacotes: `GET /admin/packs`, `GET /admin/packs/:id`, `PATCH /admin/packs/:id/moderation`.
  - **NÃO EXISTE rota administrativa para grupos**. Não há listagem de grupos pendentes nem rota de decisão por cargo. A moderação existe exclusivamente via token de e-mail.

---

## 2. Estado do Aplicativo (App Flutter)

### 2.1 Tela de Administração e Organização Atual
- **Acesso:** Configurado em [profile_screen.dart:L255-267](file:///home/pedro/projects/senpai/Senpai-Figurinhas/lib/screens/profile_screen.dart#L255-L267), posicionado logo abaixo de "Meus grupos de WhatsApp" (exclusivo Mestre):
  ```dart
  if (authUser.canAccessAdminPanel) ...[
    const SizedBox(height: 10),
    SenpaiIconTile(
      icon: Icons.admin_panel_settings_rounded,
      title: 'Painel de Moderação',
      subtitle: 'Revisão de denúncias e pacotes da comunidade',
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => const AdminModerationScreen(),
        ),
      ),
    ),
  ],
  ```
- **Estrutura Atual de `AdminModerationScreen` ([admin_moderation_screen.dart](file:///home/pedro/projects/senpai/Senpai-Figurinhas/lib/screens/admin/admin_moderation_screen.dart)):**
  - AppBar: Título "Moderação de Packs" e subtítulo "Painel de controle • {ROLE}".
  - Campo de busca textual por autor, tags ou título.
  - TabBar com 3 abas: "Pendentes", "Banidos" e "Todos", dedicadas à listagem de pacotes de figurinhas (`StickerPack`).
  - Chamada de API: `AdminApiService.instance.fetchPacksForModeration(...)`.
- **Artefato Órfão Identificado:**
  - Existe o arquivo [vip_master_group_admin_screen.dart](file:///home/pedro/projects/senpai/Senpai-Figurinhas/lib/screens/vip_master_group_admin_screen.dart) no app. Ele é um protótipo visual anterior que não está linkado em nenhuma rota ou menu e utiliza um controller ([vip_master_group_request_controller.dart](file:///home/pedro/projects/senpai/Senpai-Figurinhas/lib/services/vip_master_group_request_controller.dart)) cujos métodos lançam stubs (`AuthApiException('Esta área administrativa ainda não está disponível.')`).
  - **Oportunidade:** Reaproveitar os padrões e widgets estruturais desse protótipo, integrando-o diretamente ao novo contrato REST do backend.

### 2.2 Padrões Arquiteturais no App a Reaproveitar
- **API Services:** Uso de singletons assíncronos (`AdminApiService.instance`, `GroupApiService.instance`) que encapsulam chamadas via `AuthController.instance.getAuthenticatedJson` e `patchAuthenticatedJson`.
- **Tratamento de Exceções com `AuthApiException` ([auth_api.dart](file:///home/pedro/projects/senpai/Senpai-Figurinhas/lib/core/auth/auth_api.dart)):**
  - O app já mapeia `statusCode` e o atributo estruturado `code` (`error.code`).
  - Erros são exibidos via SnackBar ou widgets nativos com mensagens amigáveis, sem jamais expor JSON cru na interface.
- **Paginação Estável:** Controle via `ScrollController` monitorando o final da lista (`position.pixels >= maxScrollExtent - 200`), com controle de páginas (`page`, `totalPages`) e flags `_isLoading` e `_isLoadingMore`.
- **Loading Skeletons:** Substituição do spinner circular por esqueletos de carregamento com shimmer (atendendo à diretriz de `RELATORIO_FLICKER_CARREGAMENTO_PACKS.md`).
- **Segurança e Interação:** `AlertDialog` com ícones estilizados, proteção contra toque duplo (`_isSubmitting`), campos de texto com limite e botões tonais/filled.

### 2.3 Tratamento de Erro 403 e Mudança de Cargo
- Se o backend retornar `403 Forbidden`:
  - O app captura `AuthApiException` com `statusCode == 403`.
  - Se for na abertura da tela, renderiza a view amigável de "Acesso restrito" com ícone de escudo e texto informativo.
  - Se ocorrer no meio da sessão (ex.: o usuário teve o cargo revogado enquanto usava o app), o método chama `AppRefreshService.instance.refresh(force: true)`, sincroniza o perfil local do usuário e fecha a tela administrativa via `Navigator.pop(context)` com aviso de que os privilégios foram alterados.

---

## 3. Desenho das Novas Rotas no Backend (Formato API-DOC.md)

As novas rotas devem ser incluídas sob o prefixo `/admin/groups` no módulo administrativo do backend ([admin.router.ts](file:///home/pedro/projects/senpai/backend-app/src/routes/admin/admin.router.ts)).

### 3.1 `GET /admin/groups`

- **Descrição e Regra de Negócio:** Retorna a listagem paginada de solicitações de grupos (novos cadastros ou alterações) para análise pela equipe de moderação.
  1. **Agregação e Filtragem:** Atravessa a coleção `groups` (onde cada documento possui um array `groups`), desmembra os itens com `$unwind` e filtra pelo status solicitado (`"pending"` por padrão).
  2. **Junção com Usuários:** Realiza `$lookup` na coleção `users` para extrair o `userName` e `_id` do solicitante.
  3. **Proteção de Privacidade:** O endpoint projeta estritamente os campos necessários para a moderação, suprimindo intencionalmente e-mail, telefone/wa_id, hash de senha e saldo de pétalas.
  4. **Ordenação Determinística (FIFO):** Ordena pelas solicitações mais antigas primeiro (`requestedAt ASC`), utilizando `_id ASC` e `itemId ASC` como critério de desempate determinístico para evitar itens duplicados ou pulados na paginação.
- **Headers:** `Authorization: Bearer <token>` (Obrigatório).
- **Autorização:** Cargos `admin` e `moderator`.
- **Query Parameters (`listGroupsAdminQuerySchema`):**
  | Parâmetro | Tipo Zod | Tipo Dart | Padrão | Descrição |
  | :--- | :--- | :--- | :--- | :--- |
  | `status` | `z.enum(["pending", "accepted", "rejected"]).optional()` | `String?` | `"pending"` | Filtro pelo status de moderação do item. |
  | `page` | `z.coerce.number().int().min(1).default(1)` | `int` | `1` | Número da página para paginação. |
  | `limit` | `z.coerce.number().int().min(1).max(50).default(20)` | `int` | `20` | Quantidade de itens por página. |
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "data": {
        "items": [
          {
            "groupId": "67f1a2b3c4d5e6f7a8b9c0d1",
            "itemId": "e4b10b88-197e-4869-a1b7-99b50db15d42",
            "title": "Comunidade VIP dos Mestres",
            "url": "https://chat.whatsapp.com/ABC123xyz",
            "status": "pending",
            "requestType": "new",
            "requestedAt": "2026-10-16T14:30:00.000Z",
            "userId": "66dec987a123b456c7890123",
            "userName": "frieren"
          }
        ],
        "pagination": {
          "total": 1,
          "page": 1,
          "limit": 20,
          "totalPages": 1
        }
      }
    }
    ```
  - `401 Unauthorized`: Sessão expirada ou token ausente.
  - `403 Forbidden`: Privilégios insuficientes (`"Acesso negado. Privilégios insuficientes para esta operação."`).

---

### 3.2 `PATCH /admin/groups/:groupId/items/:itemId/moderation`

- **Descrição e Regra de Negócio:** Aplica a decisão da moderação (aprovar ou rejeitar) em um item específico de grupo de forma estritamente atômica.
  1. **Trava Atômica de Concorrência:** A atualização no MongoDB é executada via `findOneAndUpdate` utilizando como critério de filtro não apenas os identificadores, mas a condição obrigatória de que o item esteja atualmente com `status: "pending"`:
     ```ts
     {
       _id: groupObjectId,
       groups: {
         $elemMatch: {
           id: itemId,
           status: "pending"
         }
       }
     }
     ```
  2. **Tratamento de Conflito (409 Conflict):**
     - Se `findOneAndUpdate` não encontrar correspondência, o backend executa uma checagem diagnóstica:
       - Se o item não mais existir no banco (removido pelo usuário enquanto estava sob análise), responde `404 Not Found` com código estruturado `GROUP_ITEM_NOT_FOUND`.
       - Se o item existir, mas com status diferente de `"pending"`, responde `409 Conflict` com código estruturado `GROUP_ALREADY_DECIDED` e mensagem indicando que outro moderador já tomou a decisão.
  3. **Registro de Auditoria:** O item aprovado/rejeitado recebe os carimbos `decided_at` (`Date`), `decided_by` (`ObjectId` do moderador) e `moderation_note` (motivo opcional se rejeitado).
- **Headers:** `Authorization: Bearer <token>` (Obrigatório).
- **Autorização:** Cargos `admin` e `moderator`.
- **Parâmetros de Rota:**
  | Parâmetro | Tipo | Descrição |
  | :--- | :--- | :--- |
  | `groupId` | `String` (ObjectId hex de 24 caracteres) | Identificador do documento pai de grupos. |
  | `itemId` | `String` (UUID v4) | Identificador único do item no array `groups`. |
- **Request Body (`moderateGroupDtoSchema`):**
  | Campo | Tipo Zod | Tipo Dart | Obrigatório? | Descrição |
  | :--- | :--- | :--- | :--- | :--- |
  | `action` | `z.enum(["accepted", "rejected"])` | `String` | Sim | Decisão tomada pelo moderador. |
  | `note` | `z.string().trim().max(180).optional()` | `String?` | Não | Justificativa ou motivo da decisão (útil para orientar correções). |
- **Payload de Exemplo:**
  ```json
  {
    "action": "rejected",
    "note": "O link de convite fornecido expirou e não permite a entrada de novos membros."
  }
  ```
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Grupo aprovado com sucesso.",
      "data": {
        "groupId": "67f1a2b3c4d5e6f7a8b9c0d1",
        "itemId": "e4b10b88-197e-4869-a1b7-99b50db15d42",
        "status": "accepted",
        "decidedAt": "2026-10-16T18:45:00.000Z"
      }
    }
    ```
  - `400 Bad Request`: Parâmetros inválidos ou schema inválido.
  - `401 Unauthorized`: Sessão expirada ou token ausente.
  - `403 Forbidden`: Privilégios insuficientes.
  - `404 Not Found`:
    ```json
    {
      "success": false,
      "code": "GROUP_ITEM_NOT_FOUND",
      "message": "Este grupo foi removido pelo usuário ou não existe mais."
    }
    ```
  - `409 Conflict`:
    ```json
    {
      "success": false,
      "code": "GROUP_ALREADY_DECIDED",
      "message": "Esta solicitação já foi analisada por outro moderador."
    }
    ```

---

### 3.3 Pipeline de Agregação MongoDB e Estratégia de Índices

```javascript
[
  // 1. Filtragem preliminar de documentos para aproveitar o índice multikey
  { $match: { "groups.status": status } },

  // 2. Desmembramento dos itens de grupo
  { $unwind: "$groups" },

  // 3. Filtragem estrita pós-unwind
  { $match: { "groups.status": status } },

  // 4. Junção com a coleção de usuários para obter metadados do solicitante
  {
    $lookup: {
      from: "users",
      localField: "user_id",
      foreignField: "_id",
      as: "user"
    }
  },
  { $unwind: "$user" },

  // 5. Projeção com dados estritamente necessários (Sem e-mail / telefone)
  {
    $project: {
      _id: 0,
      groupId: { $toString: "$_id" },
      itemId: "$groups.id",
      title: "$groups.title",
      url: "$groups.url",
      status: "$groups.status",
      requestType: { $ifNull: ["$groups.requestType", "new"] },
      requestedAt: { $ifNull: ["$groups.updated_at", "$updated_at", "$created_at"] },
      userId: { $toString: "$user_id" },
      userName: "$user.userName"
    }
  },

  // 6. Ordenação cronológica estável (FIFO) com critério de desempate
  { $sort: { requestedAt: 1, groupId: 1, itemId: 1 } },

  // 7. Paginação atômica via $facet
  {
    $facet: {
      metadata: [{ $count: "total" }],
      data: [{ $skip: (page - 1) * limit }, { $limit: limit }]
    }
  }
]
```

**Índice Recomendado:**
```javascript
db.groups.createIndex({ "groups.status": 1, "updated_at": 1 });
```
*Análise de Custo:* Como apenas usuários com assinatura `MESTRE` podem cadastrar grupos (máximo de 2 itens por usuário), a coleção `groups` possui volume reduzido (centenas a poucos milhares de registros). O índice multikey garante que o `$match` inicial atue diretamente nos nós do índice, tornando a consulta instantânea e sem impacto de memória.

---

## 4. Plano para Aposentar a Aprovação por E-mail

### 4.1 Remoção nos E-mails Enviados
1. No método `sendModerationEmail` em [group.service.ts](file:///home/pedro/projects/senpai/backend-app/src/services/group.service.ts#L246):
   - Remover as linhas de geração de tokens (`crypto.randomBytes(20)`).
   - Remover as chamadas `this.cacheService.set('moderate:${token}', ...)` ao Redis.
   - Deixar de gerar e enviar `acceptUrl` e `rejectUrl`.
2. Em [moderation-group-email-template.ts](file:///home/pedro/projects/senpai/backend-app/src/templates/email/moderation-group-email-template.ts):
   - Remover o bloco que renderiza a tabela de botões "✓ Aprovar" e "✕ Rejeitar" ([L150-170](file:///home/pedro/projects/senpai/backend-app/src/templates/email/moderation-group-email-template.ts#L150-L170)).
   - Remover o botão "Acessar / Analisar Grupo" que abria a URL externa diretamente ([L137-142](file:///home/pedro/projects/senpai/backend-app/src/templates/email/moderation-group-email-template.ts#L137-L142)).
   - Adicionar caixa de instrução visual:
     > **Aviso de Moderação:**  
     > A tomada de decisão agora é realizada exclusivamente no aplicativo.  
     > Abra o **App Senpai > Perfil > Painel de Moderação** para analisar e aprovar ou rejeitar esta solicitação.

### 4.2 Destino das Rotas Públicas Antigas (`GET /group/moderate`)
Duas opções foram avaliadas:
- **Opção A (Remoção Imediata):** Exclui a rota do arquivo [group.router.ts](file:///home/pedro/projects/senpai/backend-app/src/routes/group.router.ts).
  - *Risco:* Moderadores que clicarem em e-mails recebidos anteriormente verão `404 Not Found` no navegador, gerando dúvidas sobre o status da solicitação.
- **Opção B (Página Informativa Temporária — RECOMENDADA):**
  - Manter a rota `GET /group/moderate` temporariamente (durante o período de transição de 14 dias).
  - A rota deixa de alterar o banco de dados e deixa de consumir tokens.
  - Ao ser acessada, ela responde com `Content-Type: text/html` renderizando uma página limpa e elegante da Senpai:
    *"Esta funcionalidade foi atualizada. A moderação de grupos agora é realizada com total segurança diretamente no aplicativo da Senpai. Abra o app para visualizar a fila de solicitações."*
  - Após 14 dias (prazo superior ao TTL de 7 dias dos tokens), a rota é removida em definitivo do código.

### 4.3 Tratamento dos Tokens já Emitidos
- Os tokens previamente gravados no Redis possuem TTL de 7 dias (`60 * 60 * 24 * 7`).
- Ao adotar a **Opção B**, o endpoint `GET /group/moderate` não consultará nem alterará mais nada com base nesses tokens, tornando-os inertes.
- Eles expirarão e serão purgados automaticamente pela limpeza de TTL nativa do Redis.
- Como reforço operacional, no momento do deploy da nova versão, pode-se executar opcionalmente uma limpeza manual de chaves com padrão `moderate:*`.

### 4.4 Avaliação de Deep Links no E-mail
- Foi investigado o arquivo [AndroidManifest.xml](file:///home/pedro/projects/senpai/Senpai-Figurinhas/android/app/src/main/AndroidManifest.xml#L42-L52) do aplicativo Flutter:
  - O app suporta Android App Links exclusivamente para os caminhos `/pack` e `/packs` no domínio `botdosenpai.com.br`.
  - **Não há intent-filter para rotas administrativas**.
  - Além disso, scanners automáticos de e-mail seguem e abrem todos os links contidos nos e-mails. Se houvesse um link no e-mail que disparasse qualquer mutação, os robôs aprovariam grupos acidentalmente.
  - **Decisão Segura:** O e-mail não terá nenhum link executável. Ele terá apenas a orientação de texto indicando ao moderador o caminho até a tela no aplicativo.

### 4.5 E-mail de Remoção
- Quando um usuário remove um item pendente através de `DELETE /group/item/:itemId`:
  - O backend remove o item do array (`$pull`).
  - Automaticamente, o item desaparece da agregação `GET /admin/groups?status=pending`, saindo da fila de moderação sem intervenção manual.
  - O e-mail informativo de remoção continuará sendo enviado ao `MODERATOR_EMAIL` como registro de auditoria, exatamente como funciona hoje.

---

## 5. Desenho da Fila no Aplicativo (App Flutter)

### 5.1 Localização e Navegação
- **Localização:** Dentro do Painel de Moderação (`AdminModerationScreen`), acessado a partir de [profile_screen.dart:L255](file:///home/pedro/projects/senpai/Senpai-Figurinhas/lib/screens/profile_screen.dart#L255).
- **Estrutura Visual:**
  - Inclusão de um seletor de módulo ou aba na tela administrativa:
    - **Pacotes de Figurinhas** (gestão de denúncias de packs).
    - **Grupos VIP Mestre** (fila de moderação de links).
  - O acesso continua condicionado a `authUser.canAccessAdminPanel`.

### 5.2 Apresentação do Card de Solicitação
Cada item na lista de grupos pendentes exibe:
1. **Título do Grupo:** Tipografia em destaque (`FontWeight.bold`).
2. **Identificação do Solicitante:** `@username` acompanhado de avatar e badge.
3. **Tipo de Solicitação:**
   - Tag verde: `Novo Grupo`
   - Tag azul/roxo: `Alteração de Link`
4. **Data da Solicitação:** Tempo relativo amigável (ex.: `solicitado há 20 minutos`).
5. **Valor Anterior (se alterado):** Como o backend atual não armazena histórico do valor anterior, na v1 será exibido o novo valor solicitado. Registrada proposta de evolução do schema no Passo 6.
6. **URL Protegida:**
   - Exibida em caixa de texto com fonte monoespaçada e fundo neutro.
   - **Validação de Domínio:** O app valida se o domínio é oficial do WhatsApp (`chat.whatsapp.com` ou `wa.me`).
     - Se o domínio for oficial: exibe badge discreta `WhatsApp Link Oficial`.
     - Se for qualquer outro domínio: exibe alerta de segurança chamativo em amarelo/vermelho `⚠️ Link com domínio não oficial`.
   - **Ação Segura de Teste:** O app **nunca** faz download de prévia nem abre o link automaticamente. Há um botão "Abrir no WhatsApp" que exibe um diálogo de confirmação antes de lançar o `url_launcher`.
   - Botão para **Copiar Link** para a área de transferência.

### 5.3 Ações de Decisão e Estados
- **Botões:**
  - `Aprovar` (Estilo Sucesso/Verde): Exibe diálogo confirmando a liberação do grupo.
  - `Rejeitar` (Estilo Perigo/Vermelho): Exibe diálogo com campo de texto opcional para informar o motivo da recusa (até 180 caracteres).
- **Proteção contra Toque Duplo:** Desabilita imediatamente ambos os botões durante a requisição com feedback de carregamento no próprio botão.
- **Feedback:** Ao aprovar ou rejeitar com sucesso, o card é removido da lista local com animação de fade/slide e uma `SnackBar` confirma a operação.
- **Estados da Interface:**
  - `Carregando Inicial`: Esqueletos de shimmer (sem flicker).
  - `Fila Vazia`: Ilustração central com texto *"Nenhum grupo aguardando moderação. Tudo em dia!"* e botão para atualizar.
  - `Erro de Conexão`: Mensagem amigável com botão "Tentar novamente".
  - `Puxar para Atualizar`: Suporte a `RefreshIndicator`.
  - `Paginação`: Scroll infinito com shimmer compacto no rodapé durante o carregamento de mais páginas.

### 5.4 Tratamento Estruturado de Erros e Concorrência

| Código HTTP / Code | Causa | Mensagem Amigável na UI | Ação Executada pelo App |
| :--- | :--- | :--- | :--- |
| `409 Conflict`<br>`GROUP_ALREADY_DECIDED` | Outro moderador já aprovou ou rejeitou este grupo enquanto ele estava aberto na tela. | *"Esta solicitação já foi analisada por outro moderador e não está mais pendente."* | Remove o item imediatamente da lista local e atualiza os contadores. |
| `404 Not Found`<br>`GROUP_ITEM_NOT_FOUND` | O usuário proprietário removeu o grupo enquanto ele aguardava análise. | *"O usuário removeu este grupo da plataforma."* | Remove o item da lista local. |
| `403 Forbidden` | Cargo do moderador foi revogado no backend durante a sessão. | *"Você não possui privilégios para moderar grupos."* | Sincroniza o perfil via `AppRefreshService`, fecha a tela de administração e volta ao perfil. |
| `400 Bad Request` | Falha de validação ou payload corrompido. | *"Não foi possível processar a decisão. Tente novamente."* | Mantém o item na tela e permite nova tentativa. |
| `Erro de Rede (Sem Internet)` | Falha de conexão com a API. | *"Falha na conexão com o servidor. Verifique sua internet."* | Exibe aviso e mantém a lista inalterada. |

---

## 6. Decisões Consolidadas (Definições do Usuário)

As seguintes definições foram aprovadas e consolidam os requisitos da implementação:

| # | Ponto Decidido | Opção Escolhida | Detalhes da Implementação |
| :-: | :--- | :--- | :--- |
| **1** | **Transição do Endpoint Antigo (`GET /group/moderate`)** | **Opção A** (Remoção Imediata) | O endpoint `GET /group/moderate` e o método `moderateGroupItem(token)` serão removidos do backend no deploy. Não haverá página transitória nem aceite de tokens legados. |
| **2** | **Autorização e Cargos de Moderação** | **Opção A** (Regra Canônica por `role`) | O controle de acesso ao módulo administrativo permanece estrito aos cargos `role in ["admin", "moderator"]`. Desenvolvedores e proprietários que moderarem grupos devem ter `role: "admin"`. |
| **3** | **Conteúdo do E-mail ao Moderador** | **Opção A + Nome do Grupo** (Seguro com Título) | O e-mail de alerta não conterá botões nem a URL de convite do WhatsApp. Conterá exclusivamente: nome do solicitante (`userName`), **nome do grupo (`title`)**, tipo da solicitação (novo cadastro / alteração), data/hora e a instrução clara para abrir o app no Painel de Moderação. |
| **4** | **Motivo de Rejeição** | **Opção A** (Campo Opcional `moderation_note`) | Criado o campo opcional `moderation_note` (máx. 180 caracteres) no item do grupo. O moderador poderá digitar uma justificativa na rejeição, e essa nota será exibida na tela "Meus grupos" do usuário VIP Mestre quando o status for `rejected`. |
| **5** | **Notificação ao Dono do Grupo** | **Opção B** (E-mail Transacional de Resultado) | Ao aprovar ou rejeitar o grupo no app, o backend enviará um e-mail transacional ao proprietário do grupo (caso possua `email` e `isEmailVerified: true`) informando o resultado da moderação (com o motivo em caso de recusa). |

---

## 7. Plano de Ação em Checklist por Fases

A ordem de entrega abaixo foi desenhada para **garantir que em nenhum momento a moderação fique inoperante** (o app precisa estar homologado antes de desativarmos as decisões por e-mail).

### Fase 1: Backend — Rotas de Moderação, Repositório e Notificação de Resultado
- [ ] Criar DTOs Zod em `core/dtos/admin/`: `list-groups-admin-query.dto.ts` e `moderate-group.dto.ts` (com campo `note`), e exportar no barrel `core/dtos/admin/index.ts`.
- [ ] Adicionar campos opcionais de auditoria em `core/schemas/group.schema.ts`: `requestType`, `requested_at`, `decided_at`, `decided_by`, `moderation_note`.
- [ ] Criar erros estruturados em `core/errors/`: `group-already-decided.error.ts` (409) e `group-item-not-found.error.ts` (404), exportando no barrel `core/errors/index.ts`.
- [ ] Implementar método de agregação e listagem no `GroupRepository` (`findManyPendingGroupsForModeration`).
- [ ] Implementar método de atualização atômica condicional no `GroupRepository` (`moderateGroupItemAtomically`).
- [ ] Criar template de e-mail de resultado para o dono do grupo (`renderGroupModerationOutcomeEmailTemplate`) em `src/templates/email/`.
- [ ] Adicionar lógica no `GroupService`: método `findManyPendingGroups`, método `moderateGroupItem` (com persistência atômica, auditoria e disparo de e-mail de resultado ao criador se `isEmailVerified: true`).
- [ ] Criar o roteador `admin-group.router.ts` e registrá-lo em `admin.router.ts` sob `/admin/groups`.
- [ ] Criar índice composto no MongoDB: `{ "groups.status": 1, "updated_at": 1 }`.
- [ ] Escrever testes unitários e de integração para as rotas administrativas.

### Fase 2: App — Fila de Moderação e Exibição de Motivo
- [ ] Adicionar métodos `fetchPendingGroups` e `moderateGroup` em `AdminApiService`.
- [ ] Criar modelo de dados `AdminGroupModerationItem` em `lib/models/admin_group_moderation.dart`.
- [ ] Atualizar `GroupItem` em `lib/models/group_item.dart` para incluir o campo opcional `moderationNote`.
- [ ] Implementar a view da fila de moderação de grupos (`AdminGroupModerationView`), integrando-a ao `AdminModerationScreen`.
- [ ] Implementar cards com validação segura de URL (destaque para domínios oficiais do WhatsApp vs. suspeitos, cópia e confirmação de abertura externa).
- [ ] Implementar diálogos de confirmação para Aprovar e Rejeitar (com campo de texto para o motivo da recusa).
- [ ] Atualizar a tela `VipMasterGroupsScreen` para exibir o motivo da recusa (`moderationNote`) quando o grupo estiver com status `rejected`.
- [ ] Tratar cenários de concorrência (`409 GROUP_ALREADY_DECIDED` e `404 GROUP_ITEM_NOT_FOUND`) com mensagens amigáveis e remoção do item da lista.
- [ ] Garantir acessibilidade (SafeArea, touch targets de 48dp, Semantics) e respeito a `disableAnimations`.

### Fase 3: Backend — Novo E-mail ao Moderador (Sem Botões e Sem URL)
- [ ] Atualizar o método `sendModerationEmail` em `GroupService`, removendo a geração de tokens e escrita no Redis.
- [ ] Atualizar `moderation-group-email-template.ts`, removendo a URL do grupo e botões "Aprovar"/"Rejeitar", mantendo: nome do usuário solicitante, nome do grupo (título), tipo de solicitação, data/hora e o aviso orientando a moderação pelo app.
- [ ] Garantir que o fluxo de `recovery.service.ts` permaneça intacto.

### Fase 4: Backend — Remoção Imediata da Rota Antiga (Opção A)
- [ ] Remover a rota `GET /group/moderate` de `group.router.ts`.
- [ ] Remover o método obsoleto `moderateGroupItem(token)` de `group.service.ts` e interfaces associadas.
- [ ] Limpar chaves legadas `moderate:*` no Redis.

### Fase 5: Testes e Homologação
- [ ] Executar a matriz completa de testes (ver Seção 8).
- [ ] Validar compatibilidade no Android 15 (Edge-to-Edge).

### Fase 6: Documentação
- [ ] Atualizar [API-DOC.md](file:///home/pedro/projects/senpai/backend-app/docs/API-DOC.md) documentando as novas rotas em `§3.11.4` e registrando a descontinuação da rota antiga em `§3.14`.

---

## 8. Matriz de Testes

| ID | Cenário de Teste | Condição Prévia | Ação Realizada | Resultado Esperado |
| :---: | :--- | :--- | :--- | :--- |
| **T01** | Moderador com permissão | Usuário logado com `role: "admin"` ou `"moderator"`. | Acessa a fila de grupos e aprova uma solicitação. | Requisição autorizada (200 OK); status do item muda para `"accepted"`; item removido da fila no app. |
| **T02** | Usuário comum sem permissão | Usuário logado com `role: "user"`. | Tenta chamar `GET /admin/groups` ou `PATCH /admin/groups/...`. | Backend responde `403 Forbidden` (`"Acesso negado..."`); app bloqueia navegação. |
| **T03** | Perda de cargo no meio da sessão | Moderador com a tela aberta tem seu cargo alterado para `"user"` no banco. | Tenta clicar em "Aprovar" em um grupo da lista. | Backend retorna `403`; app aciona `AppRefreshService`, fecha a tela administrativa e informa que os privilégios foram revogados. |
| **T04** | Aprovação e Rejeição normais | Grupo com status `"pending"` cadastrado no banco. | Moderador aprova grupo A e rejeita grupo B (com motivo). | Ambos persistem status no MongoDB (`"accepted"` e `"rejected"`) com auditoria (`decided_at`, `decided_by`). |
| **T05** | Dois moderadores concorrendo (Conflito) | Moderadores X e Y com a mesma lista aberta no app. | X aprova o grupo; 2 segundos depois, Y clica em rejeitar o mesmo grupo. | A ação de X é processada (200 OK); a ação de Y falha com `409 Conflict` (`GROUP_ALREADY_DECIDED`); o app de Y exibe aviso amigável e remove o item da lista. |
| **T06** | Usuário altera o grupo durante a análise | Grupo pendente está na fila; o criador edita o título via `PATCH /group/item/:id`. | Moderador tenta aprovar com base no dado antigo. | O update do usuário resetou o status ou atualizou o timestamp; o sistema processa a transição de forma atômica ou sinaliza conflito caso versões sejam checadas. |
| **T07** | Grupo removido durante a análise | Grupo pendente está na fila; o criador o deleta via `DELETE /group/item/:id`. | Moderador clica em aprovar o grupo. | Backend detecta que o subdocumento não existe e responde `404 Not Found` (`GROUP_ITEM_NOT_FOUND`); app remove o card sem estourar erro cru. |
| **T08** | URL fora do padrão do WhatsApp | Usuário cadastrou link encurtador (ex.: `bit.ly/xyz` ou site suspeito). | Moderador visualiza o card no app. | App exibe alerta visual de segurança: `⚠️ Domínio não oficial`; botão de abrir exige confirmação explícita; nenhuma prévia é baixada. |
| **T09** | Clique em link de e-mail antigo | Moderador clica no link de um e-mail recebido dias atrás. | Acessa `GET /group/moderate?token=...` no navegador. | Navegador exibe página informativa da Senpai orientando a abrir o app; nenhum dado no banco é alterado. |
| **T10** | Fila Vazia e Paginação | Banco sem grupos pendentes; banco com mais de 25 grupos pendentes. | Abre a tela; rola a lista até o fim. | Exibe placeholder elegante de fila vazia; rola e carrega página 2 sem saltos e sem duplicidade (ordenação estável). |

---

## 9. Atualizações Necessárias no API-DOC.md

Quando a implementação for autorizada, as seguintes seções do [API-DOC.md](file:///home/pedro/projects/senpai/backend-app/docs/API-DOC.md) serão atualizadas:

1. **Seção 3.11 — Módulo Administrativo (`/admin/*`):**
   - Adicionar subseção **3.11.4 Moderação de Grupos VIP Mestre (`/admin/groups`)**.
   - Documentar detalhadamente `GET /admin/groups` (query params, paginação, filtros e exemplo de resposta).
   - Documentar detalhadamente `PATCH /admin/groups/:groupId/items/:itemId/moderation` (parâmetros de rota, body Zod, códigos de erro `404 GROUP_ITEM_NOT_FOUND` e `409 GROUP_ALREADY_DECIDED`).
2. **Seção 3.14 — Módulo de Grupos (`/group/*`):**
   - Remover a documentação de `GET /group/moderate` (ou marcar como rota descontinuada/deprecada).
   - Atualizar a descrição da regra de negócio de `POST /group/` e `PATCH /group/item/:itemId`: remover menção aos tokens de 20 bytes e botões de e-mail; documentar que o e-mail disparado passa a ser exclusivamente um alerta informativo instruindo a moderação via aplicativo.
