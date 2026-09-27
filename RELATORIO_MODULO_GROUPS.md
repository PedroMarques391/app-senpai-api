# Relatório de Análise e Proposta: Módulo de Groups (`app-senpai-api`)

---

## 1. Estrutura Real do Schema de Groups Hoje

### 1.1 Stack de Persistência e Ausência do Mongoose
A investigação do ambiente revelou um fato arquitetural determinante: **o projeto NÃO utiliza Mongoose**.
Conforme declarado no [package.json](file:///home/pedro/senpai/app-senpai-api/package.json):
- **Driver de Banco:** Driver oficial nativo do MongoDB ([mongodb](file:///home/pedro/senpai/app-senpai-api/package.json#L29) `^7.5.0`).
- **Validação de Schemas e Modelos:** [Zod](file:///home/pedro/senpai/app-senpai-api/package.json#L33) (`^4.2.0`).
- **Arquitetura de Persistência:** A camada de repositórios opera diretamente sobre as coleções do MongoDB (`Db.collection<T>`), sem ORM/ODM intermediário.

### 1.2 Definição Atual do Schema ([core/schemas/group.schema.ts](file:///home/pedro/senpai/app-senpai-api/core/schemas/group.schema.ts))
```typescript
import { ObjectId } from "mongodb";
import z from "zod";

export const groupsSchema = z.object({
    _id: z.instanceof(ObjectId),
    user_id: z.instanceof(ObjectId),
    groups: z.array(
        z.object({
            title: z.string(),
            url: z.url(),
        })
    ).min(1).max(2),
    created_at: z.coerce.date().default(() => new Date()),
    updated_at: z.coerce.date().default(() => new Date()),
});

export const groupSchema = groupsSchema;
```

### 1.3 Confirmação sobre Geração de `_id` nos Sub-itens
- **Gera `_id` automático por item hoje?** **NÃO.**
  - Como o projeto não utiliza Mongoose, não há nenhum mecanismo implícito criando `_id` para elementos internos de arrays.
  - O driver nativo do MongoDB gera `_id` apenas para documentos raiz no `insertOne`.
  - O array `groups` está declarado inline como objetos literais simples contendo apenas `title` e `url`.
  - Conclusão: a hipótese de que o Mongoose geraria `_id` automaticamente não é aplicável a este projeto. Para que cada item do array tenha um identificador, é obrigatório definir um campo identificador no schema.

### 1.4 Garantia de Unicidade: 1 Documento por Usuário
O modelo pretendido (cada usuário possui no máximo 1 documento de grupos) é protegido em duas camadas:
1. **No Banco de Dados (Índice Único):**
   Em [src/init/database.ts](file:///home/pedro/senpai/app-senpai-api/src/init/database.ts#L76-L78), na inicialização do servidor:
   ```typescript
   await this.db
     .collection("groups")
     .createIndex({ user_id: 1 }, { unique: true });
   ```
2. **Na Camada de Aplicação (Service):**
   Em [src/services/group.service.ts](file:///home/pedro/senpai/app-senpai-api/src/services/group.service.ts#L28-L31), antes de realizar a criação:
   ```typescript
   const existingGroups = await this.groupRepository.find(userObjectId);
   if (existingGroups) {
     throw new Error("Usuário já possui grupos cadastrados");
   }
   ```

---

## 2. Métodos Disponíveis no Repository e Análise de Reaproveitamento

### 2.1 Métodos Atuais do `GroupRepository`
Definidos em [core/models/group.repository.model.ts](file:///home/pedro/senpai/app-senpai-api/core/models/group.repository.model.ts) e implementados em [src/repositories/group.repository.ts](file:///home/pedro/senpai/app-senpai-api/src/repositories/group.repository.ts):

| Método | Assinatura Atual | Implementação no MongoDB | Reaproveitamento |
| :--- | :--- | :--- | :--- |
| `create` | `(userId: ObjectId, data: CreateGroupDto) => Promise<Group \| null>` | `collection.insertOne(...)` | Direto (criação) |
| `find` | `(userId: ObjectId) => Promise<Group \| null>` | `collection.findOne({ user_id: userId })` | Direto (busca do doc do user) |
| `findAll` | `() => Promise<Group[]>` | `collection.find().toArray()` | Direto |
| `findById` | `(id: ObjectId) => Promise<Group \| null>` | `collection.findOne({ _id: id })` | Direto (busca por _id do doc) |
| `update` | `(id: ObjectId, data: UpdateGroupDto) => Promise<Group \| null>` | `collection.findOneAndUpdate({ _id: id }, { $set: { ...data, updated_at: new Date() } })` | **Necessita ajuste pontual OU uso via montagem em memória** |
| `delete` | `(id: ObjectId) => Promise<boolean>` | `collection.deleteOne({ _id: id })` | Direto |

### 2.2 Análise do Método `update` Atual
A implementação de [src/repositories/group.repository.ts](file:///home/pedro/senpai/app-senpai-api/src/repositories/group.repository.ts#L36-L44) é:
```typescript
async update(id: ObjectId, data: UpdateGroupDto): Promise<Group | null> {
  const updated = await this.collection.findOneAndUpdate(
    { _id: id },
    { $set: { ...data, updated_at: new Date() } },
    { returnDocument: "after" },
  );

  return updated;
}
```

#### Limitações do método atual para update de item específico via query:
1. **Filtro Rígido:** Aceita apenas `id: ObjectId`, fixando a busca exclusivamente em `{ _id: id }`. Não permite adicionar critérios como `{ user_id: userId, "groups.id": itemId }`.
2. **Encapsulamento do `$set`:** O método envolve `data` dentro de `{ $set: { ...data, updated_at: new Date() } }`.
3. **Tipagem Estrita:** O parâmetro `data` é tipado como `UpdateGroupDto`, que aceita apenas `{ groups?: [...] }`, rejeitando chaves de notação por ponto como `"groups.$.title"`.

### 2.3 Comparação de Mecanismos do MongoDB: Posicional (`$`) vs Array Filters (`$[elem]`)
- **Operador Posicional (`groups.$`):**
  - **Sintaxe de Filtro:** `{ user_id: userId, "groups.id": itemId }`
  - **Sintaxe de Update:** `{ $set: { "groups.$.title": data.title, "groups.$.url": data.url, updated_at: new Date() } }`
  - **Vantagem:** Não requer nenhum objeto de opções adicionais (`arrayFilters`). O próprio filtro identifica o primeiro elemento correspondente e o substitui.
- **Array Filters (`groups.$[elem]`):**
  - **Sintaxe de Filtro:** `{ user_id: userId }`
  - **Sintaxe de Update:** `{ $set: { "groups.$[elem].title": data.title } }`
  - **Opções:** `{ arrayFilters: [{ "elem.id": itemId }] }`
  - **Desvantagem:** Exige passar um terceiro parâmetro de opções ao driver do MongoDB.

**Conclusão Técnica:** A **sintaxe posicional (`$`)** é significativamente mais simples, direta e compatível, pois opera inteiramente através do filtro e do `$set`, sem exigir suporte a `arrayFilters` no repositório.

### 2.4 O Ajuste Pontual no Método `update` Existente (Sem Criar Método Novo)
Para permitir que o `GroupService` monte a query e o `$set` posicional diretamente, o método `update` existente no [group.repository.model.ts](file:///home/pedro/senpai/app-senpai-api/core/models/group.repository.model.ts) e no [group.repository.ts](file:///home/pedro/senpai/app-senpai-api/src/repositories/group.repository.ts) pode receber uma generalização mínima em sua assinatura:

```typescript
// Assinatura genérica no model:
export interface GroupRepository {
    // ...
    update(
      filter: ObjectId | Filter<Group>,
      data: UpdateGroupDto | UpdateFilter<Group> | Record<string, any>
    ): Promise<Group | null>;
}
```

```typescript
// Implementação pontualmente ajustada no repositório (src/repositories/group.repository.ts):
async update(
  filter: ObjectId | Filter<Group>,
  data: UpdateGroupDto | UpdateFilter<Group> | Record<string, any>,
): Promise<Group | null> {
  const queryFilter: Filter<Group> =
    filter instanceof ObjectId ? { _id: filter } : filter;

  // Se o Service já enviou um operador como $set, utiliza diretamente; caso contrário, envelopa
  const updateDoc: UpdateFilter<Group> =
    "$set" in data || "$unset" in data || "$push" in data
      ? (data as UpdateFilter<Group>)
      : { $set: { ...data, updated_at: new Date() } };

  // Garante que updated_at sempre seja atualizado mesmo com operadores customizados
  if (updateDoc.$set) {
    updateDoc.$set.updated_at = new Date();
  }

  const updated = await this.collection.findOneAndUpdate(
    queryFilter,
    updateDoc,
    { returnDocument: "after" },
  );

  return updated;
}
```

**Por que este ajuste é ideal:**
- **Zero métodos novos:** Mantém estritamente o método `update` padrão exigido pelo convention guide (`repository-services-naming-guide.md`).
- **Retrocompatibilidade total:** Qualquer chamada já existente que envie `(id: ObjectId, data: UpdateGroupDto)` continua funcionando perfeitamente sem alteração.
- **Liberdade para o Service:** Permite que o Service envie tanto filtros por ID quanto filtros compostos com operador posicional (`{ user_id: ..., "groups.id": ... }`).

---

## 3. Mensagens de Erro para Documento Já Existente

### 3.1 Mensagem e Comportamento Atual
Em [src/services/group.service.ts](file:///home/pedro/senpai/app-senpai-api/src/services/group.service.ts#L30):
```typescript
const existingGroups = await this.groupRepository.find(userObjectId);
if (existingGroups) {
  throw new Error("Usuário já possui grupos cadastrados");
}
```
No Fastify, o plugin central de erros ([src/plugin/error.plugin.ts](file:///home/pedro/senpai/app-senpai-api/src/plugin/error.plugin.ts#L14-L19)) intercepta esse `Error` e devolve:
```json
{
  "success": false,
  "message": "Usuário já possui grupos cadastrados"
}
```
Status HTTP: `400 Bad Request`.

### 3.2 Avaliação e Sugestão de Melhoria
Comparando com o padrão de outros serviços maduros da aplicação (como [PurchaseService](file:///home/pedro/senpai/app-senpai-api/src/services/purchase.service.ts#L41-L45)):
- No `PurchaseService`, as mensagens são orientadas ao usuário na 2ª pessoa ("Você já comprou este item anteriormente.", "Você não tem pétalas suficientes...").
- A mensagem atual `"Usuário já possui grupos cadastrados"` soa como um log técnico impessoal e não orienta o que o usuário deve fazer.

**Sugestão de Mensagem Melhorada:**
> `"Você já possui grupos cadastrados. Para alterar seus links, utilize a opção de edição de grupo."`

Essa mensagem comunica a regra de negócio com precisão e orienta a ação correta na interface.

---

## 4. Avaliação: Opção A (`_id` Mongoose) vs Opção B (Identificador Próprio da Aplicação)

### Opção A: `_id` Automático (Estilo Mongoose)
- **Viabilidade:** Como o projeto usa o driver nativo do MongoDB com Zod, o Mongoose não existe aqui. Para obter comportamento similar, teríamos que usar `_id: z.instanceof(ObjectId).default(() => new ObjectId())`.
- **Desvantagens no Contexto do Projeto:**
  1. No TypeScript e nas rotas, parâmetros de URL chegam como string (`params: { itemId: string }`). Trabalhar com `_id: ObjectId` em subdocumentos exige converter continuamente `MongoUtils.toObjectId(itemId)` e tratar exceções de casting.
  2. Ao serializar para JSON de saída, drivers ou clientes mobile (Flutter/Dart) podem enfrentar variações de tipo entre strings e BSON ObjectId.
  3. No MongoDB, queries de subdocumentos com `_id` exigem que o filtro receba a instância de `ObjectId`, sob risco de não encontrar o item se passar string.

### Opção B: Identificador Próprio Gerado na Aplicação (`id: string`)
- **Viabilidade:** Adicionar um campo `id: z.string()` gerado automaticamente no schema Zod através de UUID v4 ou `randomUUID()`.
- **Biblioteca no Projeto:** O projeto já possui a dependência `"uuid": "^13.0.0"` declarada no [package.json](file:///home/pedro/senpai/app-senpai-api/package.json#L32), e o Node.js 22 (runtime do projeto) possui `crypto.randomUUID()` nativo com altíssima performance.
- **Vantagens:**
  1. **Consistência Total de Tipos:** O `id` do item é `string` no schema, `string` no MongoDB, `string` na URL (`/group/item/:id`) e `String` no Dart/Flutter.
  2. **Sem Necessidade de Casting:** Não há conversão para `ObjectId`, evitando erros de validação em IDs de sub-itens.
  3. **Simplicidade de Query:** A query no MongoDB faz correspondência de string simples: `{ "groups.id": itemId }`.

### Conclusão e Recomendação
**Recomendamos fortemente a OPÇÃO B (`id: string` gerado pela aplicação via `randomUUID()`).**
Ela é a que exige **menor mudança estrutural**, elimina a complexidade de instâncias de `ObjectId` dentro de arrays e se integra perfeitamente com a API REST e o app mobile.

---

## 5. Proposta Detalhada de Implementação do UPDATE de Item

### 5.1 Ajuste Estrutural no Schema ([core/schemas/group.schema.ts](file:///home/pedro/senpai/app-senpai-api/core/schemas/group.schema.ts))
Isolamos o item em seu próprio schema com `id` gerado por padrão:

```typescript
import { ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
import z from "zod";

export const groupItemSchema = z.object({
    id: z.string().default(() => randomUUID()),
    title: z.string().min(1, "O título é obrigatório"),
    url: z.url("A URL deve ser válida"),
});

export const groupsSchema = z.object({
    _id: z.instanceof(ObjectId),
    user_id: z.instanceof(ObjectId),
    groups: z.array(groupItemSchema).min(1).max(2),
    created_at: z.coerce.date().default(() => new Date()),
    updated_at: z.coerce.date().default(() => new Date()),
});

export const groupSchema = groupsSchema;
```

### 5.2 Novo DTO de Atualização de Item (`core/dtos/group/update-group-item.dto.ts`)
```typescript
import { groupItemSchema } from "core/schemas";
import type { z } from "zod";

export const updateGroupItemDtoSchema = groupItemSchema
  .pick({
    title: true,
    url: true,
  })
  .partial()
  .strict();

export type UpdateGroupItemDto = z.infer<typeof updateGroupItemDtoSchema>;
```

### 5.3 Implementação da Lógica no `GroupService`
O `GroupService` é o responsável exclusivo por orquestrar a localização do item e a montagem do update com operador posicional `$`:

```typescript
// Em src/services/group.service.ts:

async updateGroupItem(
  userId: string,
  itemId: string,
  data: UpdateGroupItemDto
): Promise<Group> {
  const userObjectId = MongoUtils.toObjectId(userId, "ID do usuário inválido");

  // 1. Monta os campos de $set dinamicamente com base nos dados fornecidos
  const setFields: Record<string, any> = {};
  if (data.title !== undefined) {
    setFields["groups.$.title"] = data.title;
  }
  if (data.url !== undefined) {
    setFields["groups.$.url"] = data.url;
  }

  if (Object.keys(setFields).length === 0) {
    throw new Error("Nenhum dado informado para atualização");
  }

  // 2. Executa o update reutilizando o método existente do repositório
  // Filtro busca o documento do usuário E garante que o itemId existe no array dele
  const updatedGroup = await this.groupRepository.update(
    {
      user_id: userObjectId,
      "groups.id": itemId,
    },
    {
      $set: setFields,
    }
  );

  // 3. Validação explícita de "Item Não Encontrado"
  // Se o MongoDB não encontrar o documento do usuário OU o item com esse ID no array dele,
  // findOneAndUpdate retorna null (matchedCount = 0). O Service valida e lança o erro:
  if (!updatedGroup) {
    throw new Error("Item do grupo não encontrado");
  }

  return updatedGroup;
}
```

### 5.4 Comportamento da Validação de "Item Não Encontrado"
Como destacado nos requisitos:
1. O MongoDB não lança erro quando uma query de update não encontra correspondência; ele apenas retorna `null` no `findOneAndUpdate`.
2. A condição `if (!updatedGroup)` no `GroupService` detecta com precisão esse retorno nulo e lança `throw new Error("Item do grupo não encontrado")`.
3. Isso protege contra:
   - Tentativa de atualizar um `itemId` que não existe.
   - Tentativa de um usuário tentar atualizar um `itemId` pertencente a outro usuário (pois o filtro exige `user_id: userObjectId`).
   - Usuário que ainda não possui nenhum documento de grupos cadastrado.

### 5.5 Rota Fastify ([src/routes/group.router.ts](file:///home/pedro/senpai/app-senpai-api/src/routes/group.router.ts))
No router, a nova rota é exposta sob o hook autenticado existente:

```typescript
app.patch(
  "/item/:itemId",
  {
    schema: {
      params: z.object({ itemId: z.string() }),
      body: updateGroupItemDtoSchema,
    },
  },
  async (request, reply) => {
    const group = await service.updateGroupItem(
      request.user._id,
      request.params.itemId,
      request.body
    );
    return reply.status(200).send({
      success: true,
      message: "Item do grupo atualizado com sucesso",
      group,
    });
  }
);
```

---

## 6. Resumo das Decisões e Próximos Passos

1. **Nenhum Método Novo no Repositório:** O método `update` é mantido como o único método de atualização, recebendo apenas uma flexibilização interna em seus tipos para aceitar filtros arbitrários (`Filter<Group>`) e operadores (`$set`).
2. **Identificador Próprio (Opção B):** Utilização de `id: z.string().default(() => randomUUID())` no sub-schema Zod.
3. **Sintaxe Posicional (`$`):** Utilização da sintaxe nativa `{ "groups.$.campo": valor }`, dispensando `arrayFilters` e garantindo atomicidade.
4. **Validação Rigorosa no Service:** O `GroupService` intercepta retornos nulos e lança `"Item do grupo não encontrado"`.
5. **Mensagem Amigável:** Adoção de `"Você já possui grupos cadastrados. Para alterar seus links, utilize a opção de edição de grupo."` no método de criação.
