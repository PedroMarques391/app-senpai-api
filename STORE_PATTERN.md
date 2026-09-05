# STORE_PATTERN.md — Padrão Atual da Loja de Cosméticos (Store)

> **Propósito:** Documentar a arquitetura e convenções atuais da loja de itens cosméticos (`store_items`) e seu inventário de usuário (`user_items`). Serve de referência para a futura etapa de sincronização real com o catálogo Mongo e integração com o app Flutter.
>
> **⚠️ Não altera nenhum código — é somente leitura.**

---

## 1. Schema MongoDB — `store_items`

Definido em [`core/schemas/store.schema.ts`](core/schemas/store.schema.ts):

```typescript
storeItemSchema = z.object({
  _id               : ObjectId,
  name              : string  (3–50 chars),
  description       : string,
  type              : StoreItemType,     // enum — ver abaixo
  price_in_petals   : number  (int >= 0),
  purchases_count   : number  (int, default: 0),
  thumbnail_cloudinary_id : string,
  thumbnail_url     : url (string),
  file_cloudinary_id : string  (opcional),
  file_url          : url (string, opcional),
  status            : StoreItemStatus,  // enum — ver abaixo
  created_at        : Date,
  updated_at        : Date,
})
```

### Enums

| Enum | Valores possíveis |
|---|---|
| `StoreItemType` | `"wallpaper"`, `"gift"`, `"badge"`, `"border"`, `"profile_frame"`, `"profile_picture"`, `"premium_subscription"`, `"other"` |
| `StoreItemStatus` | `"active"`, `"inactive"` |

> **Nota:** Os tipos do `StoreItemType` do backend **não correspondem** diretamente aos cosméticos do Flutter (`"effect"`, `"background"`, `"card_style"`). A sincronização futura precisará mapear esses valores ou unificar os enums.

---

## 2. Schema MongoDB — `user_items` (Inventário)

Definido em [`core/schemas/inventory-item.schema.ts`](core/schemas/inventory-item.schema.ts):

```typescript
inventoryItemSchema = z.object({
  _id         : ObjectId,
  user_id     : ObjectId,     // referência ao usuário dono
  item_id     : ObjectId,     // referência ao store_items._id
  item_type   : StoreItemType, // espelho de store_items.type (denormalizado)
  acquired_at : Date,
})
```

> **Relação:** Sem `populate`. O item completo de loja não é embutido no inventário — se a UI precisar exibir nome/thumbnail do item, precisa fazer um segundo `GET /store/:id` ou enriquecer a resposta na camada de serviço.

---

## 3. DTOs de entrada

### `CreateStoreItemDto` ([`core/dtos/store/create-store-item.dto.ts`](core/dtos/store/create-store-item.dto.ts))

Deriva do `storeItemSchema` omitindo campos gerados pelo sistema e usando `.strict()`:

```typescript
// Campos obrigatórios no body do POST /store/ (admin only):
{
  name                    : string  (3–50 chars),
  description             : string,
  type                    : StoreItemType,
  price_in_petals         : number (int >= 0),
  thumbnail_cloudinary_id : string,
  thumbnail_url           : url,
  file_cloudinary_id?     : string,
  file_url?               : url,
}
// Campos omitidos (gerados pelo servidor): _id, created_at, updated_at,
// purchases_count, status (default "active").
```

### `UpdateStoreItemDto`

`createStoreItemDtoSchema.partial().strict()` — todos os campos opcionais, mesmos campos do create.

---

## 4. Camada de Repositório (`StoreRepository`)

Definida em [`core/models/store.repository.model.ts`](core/models/store.repository.model.ts).  
Implementada em [`src/repositories/store.repository.ts`](src/repositories/store.repository.ts).

| Método | Assinatura | Comportamento |
|---|---|---|
| `findAll(status?)` | `Promise<StoreItem[]>` | `find({ status? })` na collection `store_items`. Sem ordenação explícita (depende da inserção). |
| `findById(id)` | `Promise<StoreItem \| null>` | `findOne({ _id: id })` |
| `create(data)` | `Promise<StoreItem>` | Valida com `insertStoreItemSchema.parse()`, faz `insertOne`, relê o documento com `findOne`. |
| `update(id, data)` | `Promise<StoreItem \| null>` | `findOneAndUpdate` com `$set` + `updated_at`. Retorna documento atualizado. |
| `delete(id)` | `Promise<boolean>` | `deleteOne`. Retorna `deletedCount > 0`. |
| `incrementPurchasesCount(id)` | `Promise<void>` | `updateOne` com `$inc: { purchases_count: 1 }`. |

> **Sem agregação/join:** `findAll` e `findById` retornam o documento puro do `store_items`, sem enriquecer com dados do inventário ou do usuário.

---

## 5. Camada de Serviço (`StoreService` e `PurchaseService`)

### `StoreService` ([`src/services/store.service.ts`](src/services/store.service.ts))

Thin wrapper sobre o repositório — valida existência do item antes de update/delete.

### `PurchaseService` ([`src/services/purchase.service.ts`](src/services/purchase.service.ts))

Orquestra a compra de um item em 5 passos sequenciais:

```
1. Busca o StoreItem — valida status "active"
2. Busca User + existência no inventário (Promise.all paralelo)
3. Checa saldo pré-update: user.petals_balance >= price_in_petals
4. Débito atômico: userRepository.deductPetals()
   - findOneAndUpdate com filtro { petals_balance: { $gte: amount } }
   - $inc: -amount
   - returnDocument: "after"
   - Retorna: number (novo saldo) | null (saldo insuficiente em race condition)
5. Cria InventoryItem + incrementa purchases_count (sequencial)
```

**Retorno atual:** `PurchaseResult { item: InventoryItem, newBalance: number }`

---

## 6. Rotas Expostas (`storeRoutes`)

Registradas em [`src/routes/store.router.ts`](src/routes/store.router.ts) com prefixo `/store` dentro do escopo autenticado global (`app.addHook("onRequest", app.authenticate)`).

| Método | Path | Auth | Acesso | Resposta |
|---|---|---|---|---|
| `GET` | `/store/` | JWT obrigatório (via hook global) | Qualquer usuário autenticado | `{ success, items: StoreItem[] }` com cache Redis 24h |
| `GET` | `/store/:id` | JWT obrigatório (via hook global) | Qualquer usuário autenticado | `{ success, item: StoreItem }` com cache Redis 24h |
| `POST` | `/store/:id/purchase` | JWT obrigatório (via hook global) | Qualquer usuário autenticado | `{ success, message, item: InventoryItem, newBalance: number }` — invalida cache de inventário e perfil |
| `POST` | `/store/` | JWT + `requireAdmin()` | Admin only | `{ success, message, item: StoreItem }` — invalida cache `store:items:*` |
| `PUT` | `/store/:id` | JWT + `requireAdmin()` | Admin only | `{ success, message, item: StoreItem }` — invalida cache |
| `DELETE` | `/store/:id` | JWT + `requireAdmin()` | Admin only | `{ success, message }` — invalida cache |

### Chaves de Cache Redis

| Chave | TTL | Invalidada por |
|---|---|---|
| `store:items:{status\|all}` | 24h | `POST /store/`, `PUT /store/:id`, `DELETE /store/:id` |
| `store:item:{id}` | 24h | `PUT /store/:id`, `DELETE /store/:id` |
| `inventory:{userId}` | — | `POST /store/:id/purchase` |
| `profile:{userId}` | — | `POST /store/:id/purchase` |

---

## 7. Pontos de Atenção para a Futura Integração

1. **`GET /store/` requer JWT:** Usuários anônimos não conseguem ver a loja. Para o app Flutter, onde a loja é visível antes do login, será necessário mover `storeRoutes` para fora do hook global de autenticação e aplicar `onRequest: [app.authenticate]` apenas nas rotas mutuamente exclusivas (`purchase`, `POST`, `PUT`, `DELETE`).

2. **Catálogo Flutter é estático/local:** O app usa `cosmeticItems` definidos em Dart (`lib/services/cosmetic_catalog.dart`) com tipos `"effect"`, `"background"`, `"card_style"` — **incompatíveis** com os `StoreItemType` do backend (`"wallpaper"`, `"badge"`, `"profile_frame"`, etc.). A futura sincronia exigirá: (a) seed de itens no MongoDB com tipos alinhados, ou (b) um campo extra no schema para o `clientType` do Flutter.

3. **`buyItem` no Flutter é 100% local:** `ProfileController.buyItem()` debita pétalas só no `SharedPreferences` — nunca chama `POST /store/:id/purchase`. O `StoreApiService.purchaseItem()` existe e está correto, mas não é usado na `PetalStoreScreen`.

4. **Resposta de compra já inclui `newBalance`:** Após o ajuste da Tarefa 2, `POST /store/:id/purchase` retorna `{ success, message, item, newBalance }`. O Flutter pode usar diretamente sem query adicional ao `/profile`.

5. **Sem paginação em `findAll`:** A rota `GET /store/` retorna todos os itens ativos em um único array. Se o catálogo crescer, considerar `page`/`limit` ou cursor-based pagination.
