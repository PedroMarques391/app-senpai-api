---
description: Cria um módulo completo (repository, service, router) para uma nova entidade da Senpai API, seguindo a Clean Architecture do projeto.
---

# Workflow: /create-module <nome>

Uso: `/create-module pack` ou `/create-module daily-mission`

`<nome>` deve estar em **kebab-case singular** (ex: `pack`, `store-item`,
`daily-mission`). Use esse mesmo `<nome>` em todos os arquivos e nomes gerados
abaixo — não traduza, não pluralize.

Ao ser acionado, o agente deve executar os passos abaixo, nesta ordem, sempre
seguindo as convenções definidas em `AGENTS.md`.

---

## Passo 1 — Confirmar se a entidade já existe

Antes de criar qualquer arquivo, verificar se já existem `core/schemas/<nome>.schema.ts`
ou `src/repositories/<nome>.repository.ts`. Se já existirem, parar e perguntar
ao usuário se é para sobrescrever ou se o nome está errado.

## Passo 2 — `core/schemas/<nome>.schema.ts`

Criar o schema Zod da entidade base. Perguntar ao usuário (ou inferir do
contexto da conversa) quais campos a entidade tem. Estrutura mínima:

```ts
import { z } from "zod";

export const <nomeCamelCase>Schema = z.object({
  _id: z.string(), // ObjectId como string
  // ...demais campos da entidade
  created_at: z.date(),
  updated_at: z.date(),
});

export type <NomePascalCase> = z.infer<typeof <nomeCamelCase>Schema>;
```

Adicionar o export em `core/schemas/index.ts` (barrel).

## Passo 3 — `core/models/<nome>.model.ts` e `<nome>.repository.model.ts`

Criar a interface do repositório (contrato), seguindo o padrão de
`user.repository.model.ts` / `pack.repository.ts` já existentes:

```ts
import type { <NomePascalCase> } from "@/schemas";

export interface I<NomePascalCase>Repository {
  findById(id: string): Promise<<NomePascalCase> | null>;
  findMany(filter?: Partial<<NomePascalCase>>): Promise<<NomePascalCase>[]>;
  create(data: Omit<<NomePascalCase>, "_id" | "created_at" | "updated_at">): Promise<<NomePascalCase>>;
  update(id: string, data: Partial<<NomePascalCase>>): Promise<<NomePascalCase> | null>;
  delete(id: string): Promise<boolean>;
}
```

Ajustar os métodos de acordo com as necessidades reais da entidade (não
inventar métodos que não serão usados). Adicionar ao barrel `core/models/index.ts`.

## Passo 4 — DTOs em `core/dtos/<nome>/`

Criar a pasta `core/dtos/<nome>/` com os DTOs derivados do schema via
`.pick()`/`.omit()`, seguindo exatamente o padrão de `create-pack.dto.ts`:

- `create-<nome>.dto.ts`
- `update-<nome>.dto.ts`
- `index.ts` (barrel local)

```ts
// core/dtos/<nome>/create-<nome>.dto.ts
import { <nomeCamelCase>Schema } from "@/schemas";
import type { z } from "zod";

export const create<NomePascalCase>DtoSchema = <nomeCamelCase>Schema.pick({
  // campos que o cliente pode enviar na criação
});
export type Create<NomePascalCase>Dto = z.infer<typeof create<NomePascalCase>DtoSchema>;
```

Registrar em `core/dtos/index.ts`.

## Passo 5 — `src/repositories/<nome>.repository.ts`

Implementação concreta usando o driver nativo do MongoDB, implementando a
interface criada no Passo 3. Sem Mongoose, sem query builders.

```ts
import type { Collection } from "mongodb";
import { MongoInitializer } from "@/init";
import type { I<NomePascalCase>Repository } from "@/models";
import type { <NomePascalCase> } from "@/schemas";

export class <NomePascalCase>Repository implements I<NomePascalCase>Repository {
  private collection: Collection<<NomePascalCase>>;

  constructor() {
    this.collection = MongoInitializer.getDb().collection<<NomePascalCase>>("<NOME_COLLECTION>");
  }

  async findById(id: string) {
    return this.collection.findOne({ _id: id } as any);
  }

  // ...demais métodos da interface
}
```

Nome da collection em MAIÚSCULO_SNAKE_PLURAL, seguindo o padrão existente
(`CUSTOMERS`, `STICKER_PACKS`, `STORE_ITEMS`). Adicionar ao barrel
`src/repositories/index.ts`.

## Passo 6 — `src/services/<nome>.service.ts`

O service recebe o repositório **injetado via construtor** (nunca instanciado
internamente com `new`) e concentra toda a regra de negócio. O service nunca
importa nada do Fastify (`request`/`reply`).

```ts
import type { I<NomePascalCase>Repository } from "@/models";
import type { Create<NomePascalCase>Dto, Update<NomePascalCase>Dto } from "@/dtos";

export class <NomePascalCase>Service {
  constructor(private readonly repository: I<NomePascalCase>Repository) {}

  async getById(id: string) {
    const entity = await this.repository.findById(id);
    if (!entity) throw new NotFoundError("<NomePascalCase> not found");
    return entity;
  }

  async create(data: Create<NomePascalCase>Dto) {
    // validações de negócio específicas entram aqui
    return this.repository.create(data);
  }

  // ...demais métodos (update, delete, list) conforme necessário
}
```

Se o projeto ainda não tiver classes de erro customizadas (`NotFoundError`
etc.) reaproveitar as já existentes em `core/utils` — não recriar.

Adicionar ao barrel `src/services/index.ts`.

## Passo 7 — `src/routes/<nome>.router.ts`

A rota **instancia** o repositório e injeta no service (composição na borda da
aplicação — é aqui, e só aqui, que a instância concreta do repositório é
criada). Toda rota declara `schema` completo (params/body/querystring/response
por status code) usando os DTOs do Passo 4.

```ts
import type { FastifyPluginAsync } from "fastify";
import { <NomePascalCase>Repository } from "@/repositories";
import { <NomePascalCase>Service } from "@/services";
import { create<NomePascalCase>DtoSchema } from "@/dtos";
import { <nomeCamelCase>Schema } from "@/schemas";
import { errorSchema } from "@/schemas"; // ajustar conforme schema de erro existente no projeto

const repository = new <NomePascalCase>Repository();
const service = new <NomePascalCase>Service(repository);

export const <nomeCamelCase>Router: FastifyPluginAsync = async (app) => {
  app.get("/<nome-plural>/:id", {
    schema: {
      response: { 200: <nomeCamelCase>Schema, 404: errorSchema },
    },
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return service.getById(params.id);
  });

  app.post("/<nome-plural>", {
    // preAuth: [app.authenticate] // adicionar se a rota exigir login
    schema: {
      body: create<NomePascalCase>DtoSchema,
      response: { 201: <nomeCamelCase>Schema, 400: errorSchema },
    },
  }, async (request, reply) => {
    const created = await service.create(request.body);
    return reply.code(201).send(created);
  });

  // ...demais rotas (update, delete, list) conforme necessário
};
```

Se a rota for autenticada, usar o plugin já existente (`auth.plugin.ts` /
`request.jwtVerify()`), nunca reimplementar verificação de JWT.

Registrar `<nomeCamelCase>Router` em `src/routes/index.ts`.

## Passo 8 — Registrar no bootstrap

Confirmar que `src/index.ts` (ou onde os plugins são registrados) já importa
`src/routes/index.ts` como barrel — se sim, nenhum registro adicional é
necessário. Se o projeto registra rotas uma a uma, adicionar o novo router lá.

## Passo 9 — Checagem final

Rodar:
```
yarn build
```
Não considerar o módulo pronto se a checagem de tipos falhar. Reportar ao
usuário a lista de arquivos criados/alterados ao final.

---

## Resumo dos arquivos gerados por `/create-module <nome>`

```
core/schemas/<nome>.schema.ts
core/models/<nome>.model.ts
core/models/<nome>.repository.model.ts
core/dtos/<nome>/create-<nome>.dto.ts
core/dtos/<nome>/update-<nome>.dto.ts
core/dtos/<nome>/index.ts
src/repositories/<nome>.repository.ts
src/services/<nome>.service.ts
src/routes/<nome>.router.ts
```

mais as atualizações nos respectivos `index.ts` (barrel exports).