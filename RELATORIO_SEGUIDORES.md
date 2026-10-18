# Relatório de Revisão Arquitetural e Plano de Implementação: Módulo de Seguidores (Senpai API & App)

---

## Sumário Executivo

Este documento apresenta a auditoria técnica completa e o planejamento arquitetural da funcionalidade de **Seguidores e Seguidos** para a plataforma Senpai (Backend Node.js/TypeScript e App Flutter).

O escopo definido é estritamente enxuto:
1. Exibição numérica de **Seguidores** e **Seguindo** nos perfis privado e público.
2. Ação de **Seguir** e **Deixar de Seguir** no perfil de outros criadores.
3. **Restrição arquitetural mandatória:** O `UserRepository` e o schema de `User` **NÃO** devem armazenar contadores denormalizados nem sofrer modificações. Toda contagem deve ser calculada a partir da coleção `follows`, que representa uma entidade separada.

---

## 1. Estado Atual do Módulo (Arquivos e Linhas)

### 1.1. Backend (`/home/pedro/projects/senpai/backend-app`)

| Componente | Arquivo Real | Linhas | Estado Atual | Análise / Auditoria |
| :--- | :--- | :--- | :--- | :--- |
| **Schema Zod** | `core/schemas/followers.schema.ts` | 11 | `followerSchema` e alias `followersSchema` | Define `_id`, `followerId`, `followingId`, `created_at`. Tipos `ObjectId`. |
| **Model** | `core/models/follows.model.ts` | 10 | `Follow`, `CreateFollowPayload` | Derivado de `followerSchema.omit({ _id: true })`. |
| **Interface Repositório** | `core/models/follows.repository.model.ts` | 12 | `FollowsRepository` | Métodos: `isFollowing`, `follow`, `unfollow`, `getFollowers`, `getFollowing`, `totalFollowers`, `totalFollowing`. |
| **Repositório MongoDB** | `src/repositories/follows.repository.ts` | 78 | `FollowsRepository` | Implementa consultas sobre a coleção `follows`. |
| **Índices de Banco** | `src/init/database.ts` | Linhas 61–65 | 3 índices na coleção `follows` | `{ followerId: 1, followingId: 1 }` (único), `{ followingId: 1 }`, `{ followerId: 1 }`. |
| **Serviço** | `src/services/follows.service.ts` | 277 | `FollowsService` | Implementa follow, unfollow, toggle, contagens e listagens. *Nota: atualmente acoplado a métodos que alteram contadores em `UserRepository`.* |
| **Injeção / Factory** | `src/factories/service.factory.ts` | Linhas 115, 268–278 | `getProfileService`, `getFollowsService` | Injeta `FollowsRepository` no `ProfileService` e instancia `FollowsService`. |
| **Rotas HTTP** | `src/routes/profile.router.ts` | Linhas 165–290 | Rotas `/profile/:target/*` | Registradas: `POST /:target/follow`, `DELETE /:target/follow`, `POST /:target/toggle-follow`, `GET /:target/is-following`, `GET /:target/followers`, `GET /:target/following`. |
| **Documentação** | `docs/API-DOC.md` | Linhas 938–1045 | Seção 3.8 | Documenta as rotas de follow e os campos em `PublicProfileDto`. |
| **Arquivos Afetados Indevidamente** | `core/schemas/user.schema.ts`<br>`core/models/user.repository.model.ts`<br>`src/repositories/user.repository.ts` | Div. | Contadores denormalizados em `User` | **Infringem a restrição arquitetural**: campos `followers_count` e `following_count` foram adicionados em `userSchema` e no repositório de usuário. Devem ser revertidos. |

### 1.2. App Flutter (`/home/pedro/projects/senpai/Senpai-Figurinhas`)

| Componente | Arquivo Real | Linhas | Estado Atual | Análise / Auditoria |
| :--- | :--- | :--- | :--- | :--- |
| **Controller Social** | `lib/core/settings/social_controller.dart` | 165 | `SocialController` (ChangeNotifier) | Mantém em memória e SharedPreferences apenas bloqueios (`_blocked`). Métodos `toggleFollowing`, `fetchFollowers` e `fetchFollowing` retornam stubs desativados (`false` e `[]`). |
| **Flag de Ambiente** | `lib/core/config/app_environment.dart` | Linhas 87–90 | `socialBackendReady` | Configurado com `defaultValue: false`. Bloqueia interações remotas no app. |
| **Model Creator** | `lib/models/creator.dart` | Linhas 214–220, 319–335 | `Creator.fromJson` | Mapeia `followers` e `following` via `_countLabel()` a partir de `json['followers'] ?? stats['followers']`. Helper formata `1.5K`, `6.1K`, etc. |
| **Model AuthUser** | `lib/core/auth/auth_user.dart` | Linhas 562–574 | `AuthUser.fromJson` | Mapeia `followersCount` e `followingCount` com fallbacks para `socialMap` e chaves diretas. |
| **Tela Perfil Público** | `lib/screens/creator_screen.dart` | Linhas 518–540 | `_CreatorStat` | Exibe `creator.followers` e `creator.following`. **Não possui botão de seguir/deixar de seguir renderizado**. |
| **Tela Perfil Privado** | `lib/screens/profile_screen.dart` | Linhas 1495–1535 | `_ProfileStat` | Exibe `social.currentFollowersCount` e `social.currentFollowingCount`. Possui `onTap` condicionado a `AppEnvironment.socialBackendReady` que abre `SocialConnectionsScreen`. |
| **Tela de Conexões** | `lib/screens/social_connections_screen.dart` | 150 | `SocialConnectionsScreen` | Tela com abas/lista de seguidores e seguindo (fora do escopo funcional mínimo). |
| **Service Perfil** | `lib/services/profile_api_service.dart` | Linhas 135–155 | `ProfileApiService._merge` | Realiza `_merge(base, remote)`. **Ignora os contadores retornados pelo backend**, mantendo `followers: base.followers` em vez de `remote.followers`. |

---

## 2. Tabela de Achados da Revisão de Padrão

| Arquivo / Camada | Origem | Aderência aos Padrões | Problemas Identificados (Código morto, inline, acoplamento) | Classificação | Ação Recomendada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `core/schemas/user.schema.ts` | Alteração prévia | ❌ Viola Restrição | Campos `followers_count` e `following_count` colocados no schema de usuário. | **Remover** | Reverter campos adicionados no `User`, mantendo a entidade intacta. |
| `src/repositories/user.repository.ts` | Alteração prévia | ❌ Viola Restrição | Métodos `incrementFollowersCount` e `incrementFollowingCount` criados no `UserRepository`. | **Remover** | Reverter métodos, mantendo o `UserRepository` 100% inalterado. |
| `core/models/user.repository.model.ts` | Alteração prévia | ❌ Viola Restrição | Declaração dos métodos de contagem na interface de usuário. | **Remover** | Reverter assinaturas na interface `UserRepository`. |
| `core/schemas/followers.schema.ts` | Pré-existente / Padronizado | ✅ Conforme | Nomes de campos consistentes com MongoDB (`_id`, `followerId`, `followingId`). | **Manter** | Manter como modelo canônico da entidade `Follow`. |
| `core/models/follows.repository.model.ts` | Pré-existente / Padronizado | ✅ Conforme | Métodos expressivos de repositório (`isFollowing`, `totalFollowers`, etc.). | **Simplificar** | Remover paginação desnecessária para esta fase simples. |
| `src/repositories/follows.repository.ts` | Criado | ✅ Conforme | Utiliza coleção dedicada `follows` com índices B-tree. | **Manter** | Manter `totalFollowers`, `totalFollowing`, `follow`, `unfollow`, `isFollowing`. |
| `src/services/follows.service.ts` | Criado | ⚠️ Parcial | Contém listagens completas (`getFollowers`, `getFollowing`) e chamadas a `userRepository.increment*`. | **Simplificar** | Remover lógica de lista e de incremento em `User`. Calcular contagens via `FollowsRepository`. |
| `src/routes/profile.router.ts` | Alteração prévia | ⚠️ Parcial | Rotas de listagem (`/:target/followers`, `/:target/following`) foram adicionadas além do escopo. | **Simplificar** | Manter apenas endpoints de ação e status/contadores. |
| `docs/API-DOC.md` | Documentação | ⚠️ Parcial | Contém rotas de listagem que saíram do escopo. | **Simplificar** | Atualizar contrato para refletir a versão simples. |
| App: `social_controller.dart` | Pré-existente no app | ⚠️ Desativado | Métodos de follow retornam `false`. Tentava chamar `/social/users/:id/follow` (rota inexistente no backend). | **Simplificar** | Integrar com a rota oficial do backend com atualização otimista. |
| App: `profile_api_service.dart` | Pré-existente no app | ❌ Bug de Merge | Linha 140 descarta `remote.followers` do backend e reutiliza `base.followers`. | **Simplificar** | Ajustar `_merge` para aceitar os contadores do backend. |
| App: `social_connections_screen.dart`| Pré-existente no app | 🛑 Fora de Escopo | Listas de seguidores e seguindo completas. | **Manter Inativo** | Manter `onTap: null` no perfil para não permitir navegação. |

---

## 3. Desenho Mínimo Proposto

### 3.1. Modelo e Índices no Banco de Dados (MongoDB)

A coleção `follows` opera como entidade relacional desacoplada:

```typescript
// Entidade Follow
export interface Follow {
  _id: ObjectId;
  followerId: ObjectId; // Usuário que segue
  followingId: ObjectId; // Usuário que é seguido
  created_at: Date;
}
```

**Índices no MongoDB (`src/init/database.ts`):**
1. `{ followerId: 1, followingId: 1 }` com `{ unique: true }`: Impede duplicatas no nível do motor e garante unicidade atômica.
2. `{ followingId: 1 }`: Garante contagem $O(\log N)$ imediata de seguidores via `countDocuments({ followingId: targetId })`.
3. `{ followerId: 1 }`: Garante contagem $O(\log N)$ imediata de quem o usuário segue via `countDocuments({ followerId: targetId })`.

*Diagnóstico de Índices:* **Não falta nenhum índice.** Todos os 3 índices já estão configurados em `src/init/database.ts`.

### 3.2. Contrato de API Proposto (Formato API-DOC.md)

#### `POST /profile/:username/follow`
- **Descrição:** Segue o usuário identificado por `:username`.
- **Autenticação:** Obrigatória (`Bearer <token>`).
- **Comportamento (Idempotente):** Se já estiver seguindo, não retorna erro; confirma o vínculo e retorna as métricas atualizadas.
- **Validações:**
  - Usuário não pode seguir a si mesmo (`400 CANNOT_FOLLOW_SELF`).
  - Alvo não encontrado ou inativo (`404 USER_NOT_FOUND`).
- **Resposta (`200 OK`):**
  ```json
  {
    "success": true,
    "is_following": true,
    "followers_count": 142,
    "following_count": 35
  }
  ```

#### `DELETE /profile/:username/follow`
- **Descrição:** Deixa de seguir o usuário identificado por `:username`.
- **Autenticação:** Obrigatória (`Bearer <token>`).
- **Comportamento (Idempotente):** Se não estiver seguindo, não retorna erro; remove o vínculo se existir e retorna as métricas atualizadas.
- **Resposta (`200 OK`):**
  ```json
  {
    "success": true,
    "is_following": false,
    "followers_count": 141,
    "following_count": 35
  }
  ```

#### `GET /profile/:username/social-summary`
- **Descrição:** Retorna o resumo social do perfil (contagem de seguidores, contagem de seguindo e se o usuário autenticado da sessão segue este perfil).
- **Autenticação:** Opcional (se não autenticado, `is_following` retorna `false`).
- **Resposta (`200 OK`):**
  ```json
  {
    "success": true,
    "followers_count": 141,
    "following_count": 35,
    "is_following": true
  }
  ```

---

## 4. Comparação das Opções A, B e C para Contadores e `is_following`

| Dimensão | Opção A: Contadores Embutidos no Perfil (`GET /profile` e `GET /profile/:username`) | Opção B: Endpoint Separado de Resumo Social (`GET /profile/:username/social-summary`) | Opção C: Contadores no Perfil + `is_following` Separado |
| :--- | :--- | :--- | :--- |
| **Respeito à Restrição (`UserRepository` Intacto)** | ✅ Sim (calculados on-the-fly) | ✅ Sim (calculados via `FollowsRepository`) | ✅ Sim |
| **Impacto no Cache do Perfil** | ❌ **Crítico:** O perfil público fica em cache no Redis por 24h (`profile:username:<user>`). Cada follow/unfollow forçaria a invalidação do perfil inteiro ou exibiria números desatualizados. | ✅ **Excelente:** O perfil público mantém cache longo (dados cadastrais, bio, cosméticos). As métricas sociais possuem ciclo próprio. | ⚠️ Parcial: Invalidação frequente do perfil público. |
| **Contexto do Visitante (`is_following`)** | ❌ Impossível cachear no perfil público, pois `is_following` depende de *quem* está visualizando a tela. | ✅ **Ideal:** Pode receber o token do visitante e responder `is_following` de forma desacoplada do cache estático. | ✅ Bom para `is_following`. |
| **Número de Requisições do App** | 1 requisição. | 2 requisições (feitas em paralelo ao abrir o perfil). | 2 requisições. |
| **Complexidade no Frontend** | Baixa. | Baixa (FutureBuilder ou chamada paralela ao carregar tela). | Média. |

### 💡 Recomendação Técnica: **Opção B (com fallback suave)**

Recomendamos a **Opção B** como padrão arquitetural para o perfil público de criadores:
1. `GET /profile/:username` permanece puramente cadastral/estático (cache de 24h sem interrupção).
2. O app dispara em paralelo `GET /profile/:username/social-summary` para preencher as estatísticas e o estado do botão "Seguir" / "Seguindo".
3. No perfil privado do próprio usuário logado (`GET /profile/`), os contadores `followers_count` e `following_count` podem ser enriquecidos no payload sem ferir o cache, pois o perfil privado é individual por chave `profile:<userId>`.

---

## 5. O que Existe e Fica Fora do Escopo

| Funcionalidade / Código | Localização | Estado Atual | Recomendação |
| :--- | :--- | :--- | :--- |
| **Listas de Seguidores (`/followers`)** | Backend: `FollowsRepository.getFollowers`, rotas `/followers`<br>App: `SocialConnectionsScreen` | Existem stubs e rotas parciais | **Manter inativo sem expor.** Não criar UI de navegação no app nesta fase. |
| **Listas de Seguindo (`/following`)** | Backend: `FollowsRepository.getFollowing`, rotas `/following`<br>App: `SocialConnectionsScreen` | Existem stubs e rotas parciais | **Manter inativo sem expor.** Manter `onTap: null` nos números de estatística. |
| **Notificações de Publicação (`publication-notifications`)** | App: `toggleNotifications` em `SocialController`<br>Backend: Não existe | Apenas stubs no app | **Manter sem mexer.** Fora do escopo funcional mínimo. |
| **Rotas antigas `/social/users/:id/follow`** | App: Versões antigas no Git (`v186`) | Removidas no app `v187` | **Não implementar no backend.** Padronizar na rota `/profile/:username/follow`. |

---

## 6. Riscos e Decisões Pendentes (Perguntas para Aprovação)

> ### ❓ Pergunta 1: Identificador da Rota de Follow (`:username` vs `:id`)
> O app atual em `creator_screen.dart` possui tanto `creator.handle` (ex.: `@frieren`) quanto `creator.id` (quando vem de um pack). Porém, quando o perfil é aberto via pesquisa ou link direto, o `id` pode estar vazio.
> **Decisão:** Propomos que a rota seja `/profile/:username/follow`, pois o `username` sempre existe e é único. O backend resolve o `_id` internamente via `userRepository.find({ userName })` sem precisar alterar nada no repositório. Você aprova usar `:username`?

> ### ❓ Pergunta 2: Estratégia de Cache para as Contagens
> Como os contadores serão calculados diretamente da coleção `follows` via `countDocuments` (sem denormalizar em `User`), consultas repetidas ao mesmo perfil farão contagem no índice.
> **Decisão:** Propomos cache curto no Redis para a contagem do perfil público (ex.: 60 segundos), invalidado imediatamente quando houver ação de follow/unfollow naquele perfil. Você prefere com esse cache curto de 60s ou contagem 100% em tempo real no MongoDB?

> ### ❓ Pergunta 3: Reversão dos Campos no `User`
> Para cumprir estritamente a restrição de **NÃO alterar o `UserRepository` nem o `user.schema.ts`**, devemos reverter os campos `followers_count` e `following_count` adicionados no `User` e remover os métodos `incrementFollowersCount` / `incrementFollowingCount` do `UserRepository`.
> **Decisão:** Confirma a remoção dessas alterações para restaurar a pureza do `UserRepository`?

---

## 7. Plano de Ação em Fases (Checklist)

### Fase 1: Limpeza e Restauração da Pureza do `User`
- [ ] Reverter campos `followers_count` e `following_count` de `core/schemas/user.schema.ts`.
- [ ] Remover métodos `incrementFollowersCount` e `incrementFollowingCount` de `core/models/user.repository.model.ts` e `src/repositories/user.repository.ts`.
- [ ] Reverter inclusão nos seeds (`src/seeds/data/users.data.ts` e `src/seeds/users.seed.ts`).
- [ ] Validar que `yarn tsc --noEmit` passa limpo sem nenhuma dependência residual.

### Fase 2: Repositório e Modelo de Follows (Entidade Isolada)
- [ ] Confirmar integridade do `followerSchema` em `core/schemas/followers.schema.ts` e `Follow` em `core/models/follows.model.ts`.
- [ ] Assegurar que `FollowsRepository` em `src/repositories/follows.repository.ts` contenha exclusivamente:
  - `follow(followerId: ObjectId, followingId: ObjectId): Promise<void>` (com tratamento idempotente de chave única).
  - `unfollow(followerId: ObjectId, followingId: ObjectId): Promise<void>`.
  - `isFollowing(followerId: ObjectId, followingId: ObjectId): Promise<boolean>`.
  - `totalFollowers(userId: ObjectId): Promise<number>`.
  - `totalFollowing(userId: ObjectId): Promise<number>`.

### Fase 3: Service e Rotas no Backend
- [ ] Adequar `FollowsService` em `src/services/follows.service.ts`:
  - Injetar `FollowsRepository`, `UserRepository` e `ICacheService`.
  - Usar do `UserRepository` **apenas** o método existente `find(identifier)`.
  - Implementar `followUser(followerId, targetUsername)` idempotente.
  - Implementar `unfollowUser(followerId, targetUsername)` idempotente.
  - Implementar `getSocialSummary(targetUsername, visitorUserId?)`.
- [ ] Registrar rotas em `src/routes/profile.router.ts`:
  - `POST /profile/:username/follow`
  - `DELETE /profile/:username/follow`
  - `GET /profile/:username/social-summary`
- [ ] Remover rotas de listagem que saíram do escopo (`/followers`, `/following`).

### Fase 4: App — Botão Seguir/Seguindo
- [ ] Em `Senpai-Figurinhas/lib/screens/creator_screen.dart`:
  - Inserir o botão "Seguir" / "Seguindo" no card de cabeçalho do criador (oculto se `isOwnProfile == true`).
  - Implementar verificação de login (redireciona visitante para o fluxo de autenticação).
  - Implementar atualização otimista: alterna o estado visual imediatamente; se a requisição HTTP falhar, reverte e exibe mensagem de erro.
  - Adicionar trava contra duplo toque (`_isSubmitting`).
  - Garantir altura mínima de 48 dp e semântica de acessibilidade.

### Fase 5: App — Exibição dos Números
- [ ] Em `Senpai-Figurinhas/lib/screens/creator_screen.dart`:
  - Conectar os contadores de seguidores e seguindo ao retorno de `GET /profile/:username/social-summary`.
  - Utilizar o formatador compacto existente (`_compactCount`, ex.: "6,1K").
  - Manter placeholder estável sem layout shift ao carregar.
  - Manter os números sem clique (`onTap: null`), sem navegação para listas.
- [ ] Em `Senpai-Figurinhas/lib/services/profile_api_service.dart`:
  - Corrigir o método `_merge` para aceitar as contagens do backend em vez de sobrescrever com o estado base vazio.

### Fase 6: Documentação e Testes
- [ ] Atualizar `docs/API-DOC.md` no backend com o contrato final simplificado.
- [ ] Atualizar `API-DOC.md` no app com o espelho do contrato.
- [ ] Executar validação de build completa em ambos os repositórios (`yarn build` no backend e `flutter analyze` no app).

---

## 8. Verificação Final Prevista (`git diff`)

Após a conclusão das fases de implementação, a execução de:
```bash
git diff origin/main -- core/schemas/user.schema.ts src/repositories/user.repository.ts core/models/user.repository.model.ts
```
**Deverá retornar saída completamente vazia**, comprovando que:
1. O schema de `User` não possui campos de contagem social.
2. O `UserRepository` não possui métodos dedicados a contadores sociais.
3. A entidade de seguidores permanece 100% isolada e autossuficiente.

---

## 9. Matriz de Cenários de Testes

| Cenário de Teste | Ação Executada | Comportamento Esperado no Backend | Comportamento Esperado no App |
| :--- | :--- | :--- | :--- |
| **1. Seguir normal** | Usuário clica em "Seguir". | Insere registro na coleção `follows`, recalcula `totalFollowers` via índice e retorna `{ is_following: true, followers_count: N+1 }`. | Botão muda para "Seguindo" com microanimação; contador incrementa instantaneamente. |
| **2. Seguir novamente (Duplo toque / Corrida)** | Dois toques quase simultâneos em "Seguir". | Primeiro insere; segundo bate no índice único `{ followerId: 1, followingId: 1 }`, trata erro de chave duplicada como sucesso idempotente e retorna `{ is_following: true }`. | Interface ignora o segundo toque através da trava de submissão (`_isSubmitting`). |
| **3. Deixar de seguir** | Usuário clica em "Seguindo". | Remove registro da coleção `follows`, recalcula `totalFollowers` e retorna `{ is_following: false, followers_count: N-1 }`. | Botão muda para "Seguir"; contador decrementa instantaneamente. |
| **4. Deixar de seguir sem seguir** | Chamada direta de `DELETE`. | Operação `deleteOne` não encontra registro; retorna sucesso com `{ is_following: false }`. | Estado permanece desmarcado. |
| **5. Seguir a si mesmo** | Usuário tenta seguir o próprio perfil. | Backend rejeita com HTTP `400 CANNOT_FOLLOW_SELF`. | Botão sequer é renderizado no próprio perfil (`isOwnProfile == true`). |
| **6. Usuário inexistente ou inativo** | Seguir conta inexistente ou com `status: "inactive"`. | Backend rejeita com HTTP `404 USER_NOT_FOUND`. | App exibe Snackbar informando que o perfil não está disponível. |
| **7. Visitante sem login** | Usuário deslogado acessa perfil de criador. | `GET /profile/:username/social-summary` retorna contadores com `is_following: false`. | Números aparecem formatados ("6,1K"); toque no botão de seguir abre tela de login. |
| **8. Falha de rede / Timeout** | Falha de conexão durante o clique em "Seguir". | Requisição não chega ou é interrompida. | Atualização otimista é desfeita; botão e contador revertem ao valor anterior; exibe aviso amigável. |
| **9. Formatação numérica** | Perfil com 0, 850, 1.450 e 1.200.000 seguidores. | Backend envia inteiros brutos (`0`, `850`, `1450`, `1200000`). | App formata como `"0"`, `"850"`, `"1,5K"`, `"1,2M"`. |
| **10. Conta desativada após follow** | Usuário seguido tem a conta suspensa/inativada. | `getSocialSummary` verifica `user.status !== "inactive"`. | Perfil exibe estado de restrição sem crash. |

---

## 10. Atualizações Necessárias no API-DOC.md

1. **Remover** as rotas fora de escopo que foram temporariamente adicionadas (`GET /profile/:target/followers` e `GET /profile/:target/following`).
2. **Documentar** os 3 contratos oficiais:
   - `POST /profile/:username/follow`
   - `DELETE /profile/:username/follow`
   - `GET /profile/:username/social-summary`
3. **Esclarecer** que o `GET /profile/:username` permanece estritamente cadastral e que o consumo social do app Flutter é realizado através do endpoint `social-summary`.
