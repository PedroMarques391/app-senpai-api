---
description: Cria um módulo completo (repository, service, router) para uma nova entidade da Senpai API, seguindo a Clean Architecture do projeto.
---

---
name: create-module
trigger: /create-module <name>
---

# Create Module

## Rule
Running `/create-module <name>` scaffolds a complete module — repository,
service, and router — for a new entity, following the project's layered
architecture and dependency injection pattern. `<name>` must be
kebab-case singular (e.g. `pack`, `store-item`, `daily-mission`).

## Guidelines
- Every route has a service, and every service receives its repository
  injected through the constructor — never instantiated with `new` inside
  the service itself.
- The repository is only instantiated at the composition point (the router),
  and passed into the service from there.
- The service must never import anything from Fastify (`request`/`reply`);
  it only knows about DTOs and the repository interface.
- The repository is the only layer allowed to talk to MongoDB directly.
- File naming is fixed: `<name>.repository.ts`, `<name>.service.ts`,
  `<name>.router.ts`. Do not rename or pluralize these.
- All exports for the new module's files must be added to the relevant
  `index.ts` barrel — never import a file directly from outside its folder.
- Before generating anything, check whether the module already exists
  (`core/schemas/<name>.schema.ts` or `src/repositories/<name>.repository.ts`).
  If it does, stop and ask the user whether to overwrite.

## Example Structure
```text
core/
├── schemas/
│   ├── <name>.schema.ts
│   └── index.ts
├── models/
│   ├── <name>.model.ts
│   ├── <name>.repository.model.ts
│   └── index.ts
└── dtos/
    └── <name>/
        ├── create-<name>.dto.ts
        ├── update-<name>.dto.ts
        └── index.ts
src/
├── repositories/
│   ├── <name>.repository.ts
│   └── index.ts
├── services/
│   ├── <name>.service.ts
│   └── index.ts
└── routes/
    ├── <name>.router.ts
    └── index.ts
```

## Steps

### 1. Schema — `core/schemas/<name>.schema.ts`
Define the base Zod schema for the entity (infer field list from the
conversation context or ask the user). Export the Zod type via `z.infer`.
```ts
import { z } from "zod";

export const <nameCamel>Schema = z.object({
  _id: z.string(),
  // ...entity fields
  created_at: z.date(),
  updated_at: z.date(),
});

export type <NamePascal> = z.infer<typeof <nameCamel>Schema>;
```
Add the export to `core/schemas/index.ts`.

### 2. Repository interface — `core/models/<name>.repository.model.ts`
```ts
import type { <NamePascal> } from "@/schemas";

export interface I<NamePascal>Repository {
  findById(id: string): Promise<<NamePascal> | null>;
  findMany(filter?: Partial<<NamePascal>>): Promise<<NamePascal>[]>;
  create(data: Omit<<NamePascal>, "_id" | "created_at" | "updated_at">): Promise<<NamePascal>>;
  update(id: string, data: Partial<<NamePascal>>): Promise<<NamePascal> | null>;
  delete(id: string): Promise<boolean>;
}
```
Only include methods actually needed by the entity. Add to `core/models/index.ts`.

### 3. DTOs — `core/dtos/<name>/`
Derive every DTO from the schema with `.pick()` / `.omit()` — never redeclare
fields manually.
```ts
// core/dtos/<name>/create-<name>.dto.ts
import { <nameCamel>Schema } from "@/schemas";
import type { z } from "zod";

export const create<NamePascal>DtoSchema = <nameCamel>Schema.pick({
  // client-writable fields on creation
});
export type Create<NamePascal>Dto = z.infer<typeof create<NamePascal>DtoSchema>;
```
Create `update-<name>.dto.ts` the same way, then export both from
`core/dtos/<name>/index.ts` and re-export from `core/dtos/index.ts`.

### 4. Repository — `src/repositories/<name>.repository.ts`
Concrete implementation using the native MongoDB driver, implementing the
interface from step 2. No Mongoose, no query builder.
```ts
import type { Collection } from "mongodb";
import { MongoInitializer } from "@/init";
import type { I<NamePascal>Repository } from "@/models";
import type { <NamePascal> } from "@/schemas";

export class <NamePascal>Repository implements I<NamePascal>Repository {
  private collection: Collection<<NamePascal>>;

  constructor() {
    this.collection = MongoInitializer.getDb().collection<<NamePascal>>("<COLLECTION_NAME>");
  }

  async findById(id: string) {
    return this.collection.findOne({ _id: id } as any);
  }
  // ...remaining interface methods
}
```
Collection name follows the existing convention: UPPER_SNAKE_PLURAL
(`CUSTOMERS`, `STICKER_PACKS`, `STORE_ITEMS`). Add to `src/repositories/index.ts`.

### 5. Service — `src/services/<name>.service.ts`
Repository is injected through the constructor. Business rules live here only.
```ts
import type { I<NamePascal>Repository } from "@/models";
import type { Create<NamePascal>Dto, Update<NamePascal>Dto } from "@/dtos";

export class <NamePascal>Service {
  constructor(private readonly repository: I<NamePascal>Repository) {}

  async getById(id: string) {
    const entity = await this.repository.findById(id);
    if (!entity) throw new NotFoundError("<NamePascal> not found");
    return entity;
  }

  async create(data: Create<NamePascal>Dto) {
    return this.repository.create(data);
  }
  // ...remaining methods as needed
}
```
Reuse existing error classes from `core/utils` — do not recreate them.
Add to `src/services/index.ts`.

### 6. Router — `src/routes/<name>.router.ts`
The router is the composition point: it instantiates the concrete repository
and injects it into the service. Every route declares a full `schema`
(`params`/`body`/`querystring`/`response` per status code) using the DTOs
from step 3.
```ts
import type { FastifyPluginAsync } from "fastify";
import { <NamePascal>Repository } from "@/repositories";
import { <NamePascal>Service } from "@/services";
import { create<NamePascal>DtoSchema } from "@/dtos";
import { <nameCamel>Schema, errorSchema } from "@/schemas";

const repository = new <NamePascal>Repository();
const service = new <NamePascal>Service(repository);

export const <nameCamel>Router: FastifyPluginAsync = async (app) => {
  app.get("/<name-plural>/:id", {
    schema: { response: { 200: <nameCamel>Schema, 404: errorSchema } },
  }, async (request) => {
    const { id } = request.params as { id: string };
    return service.getById(id);
  });

  app.post("/<name-plural>", {
    // preHandler: [app.authenticate] — add if the route requires auth
    schema: {
      body: create<NamePascal>DtoSchema,
      response: { 201: <nameCamel>Schema, 400: errorSchema },
    },
  }, async (request, reply) => {
    const created = await service.create(request.body);
    return reply.code(201).send(created);
  });
  // ...remaining routes as needed
};
```
If a route requires authentication, reuse the existing `auth.plugin.ts`
(`request.jwtVerify()`) — never reimplement JWT verification inline.
Add `<nameCamel>Router` to `src/routes/index.ts`.

### 7. Final check
Run:
```
yarn build
```
The module is not considered done if the type check fails. Report the full
list of created/modified files to the user at the end.

## ✅ Correct
```ts
// src/routes/pack.router.ts
import { PackRepository } from "@/repositories";
import { PackService } from "@/services";

const repository = new PackRepository();
const service = new PackService(repository); // injected via constructor
```
```ts
import { PackService } from "@/services"; // imported from the barrel
```

## ❌ Incorrect
```ts
// service instantiating its own repository — breaks testability
export class PackService {
  private repository = new PackRepository();
}
```
```ts
import { PackService } from "@/services/pack.service"; // deep import
```

## Benefits
- Services stay framework-agnostic and unit-testable in isolation
  (a mock repository can be injected instead of a real one).
- The router is the single, explicit place where wiring happens.
- Consistent file naming makes every module predictable to navigate.

## Exception
Steps 1–3 (schema, repository interface, DTOs) may be skipped if the entity
already exists and only the repository/service/router trio is missing —
in that case, start directly at step 4.