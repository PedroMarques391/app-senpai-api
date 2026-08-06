---
trigger: always_on
---

# Barrel Exports

## Rule

All module exports must be exposed exclusively through `index.ts` files (barrel exports).

## Guidelines

- Every directory that exposes public functionality must contain an `index.ts`.
- Only import from a module's root, never from its internal files.
- Internal implementation details must remain private to the module.
- Avoid deep imports across modules.

## Example Structure

```text
src/
├── modules/
│   └── users/
│       ├── controllers/
│       │   ├── create-user.controller.ts
│       │   └── index.ts
│       ├── services/
│       │   ├── create-user.service.ts
│       │   └── index.ts
│       ├── repositories/
│       │   ├── users.repository.ts
│       │   └── index.ts
│       ├── routes/
│       │   ├── users.routes.ts
│       │   └── index.ts
│       └── index.ts
```

## ✅ Correct

```ts
// modules/users/services/index.ts
export * from './create-user.service';
```

```ts
// modules/users/index.ts
export * from './controllers';
export * from './services';
export * from './repositories';
export * from './routes';
```

```ts
import { CreateUserService } from '@/modules/users';
```

## ❌ Incorrect

```ts
import { CreateUserService } from '@/modules/users/services/create-user.service';
```

## Benefits

- Enforces a consistent import structure.
- Defines a clear public API for each module.
- Prevents deep imports.
- Simplifies refactoring.
- Reduces coupling between modules.

## Exception

Relative imports within the same directory or feature are allowed. This rule only applies to imports across different modules or features.