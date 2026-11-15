---
trigger: always_on
---

# Rule: Shared Utility Functions

To maintain consistency and avoid duplicated helper logic across the project, follow these rules whenever creating utility functions.

## General Rules

- Pure, domain-agnostic utility functions **must** be placed in `core/utils`.
- Helper functions with domain/business rules, external I/O (Redis, HTTP), framework coupling (JWT, bcrypt), or application errors **must** be placed in `src/helpers` following the `<domain>.helper.ts` / `<Domain>Helper` convention and exported via `src/helpers/index.ts` (`@/helpers`).
- Do **not** create utility or helper functions inside controllers, services, repositories, modules, or feature folders unless they are private implementation details.
- Before creating a new utility or helper, always verify whether an equivalent already exists in `core/utils` or `src/helpers`.

## Static Utility Classes

When multiple utility functions belong to the same domain or purpose, they **must** be grouped into a single static utility class.

Example:

```text
core/
└── utils/
    ├── StringUtils.ts
    ├── DateUtils.ts
    ├── ValidationUtils.ts
    └── NumberUtils.ts
```

Example:

```ts
export class StringUtils {
  static capitalize(value: string): string {
    // ...
  }

  static slugify(value: string): string {
    // ...
  }

  static normalizeWhitespace(value: string): string {
    // ...
  }
}
```

Usage:

```ts
StringUtils.capitalize(name);
```

instead of

```ts
capitalize(name);
```

## Naming

Utility classes should use the `<Domain>Utils` convention.

Examples:

- StringUtils
- DateUtils
- ValidationUtils
- NumberUtils
- ObjectUtils
- CollectionUtils
- CryptoUtils
- FileUtils

## Do Not

❌ Create isolated helper files like:

```
format.ts
capitalize.ts
parseDate.ts
```

❌ Duplicate utility functions across modules.

❌ Instantiate utility classes.

```ts
new StringUtils(); // Never
```

## Always

- Keep all methods `static`.
- Keep utility and helper classes stateless.
- Group related methods into the same utility or helper class.
- Store every pure shared utility inside `core/utils` (`<Domain>Utils.ts`) and every domain/application helper inside `src/helpers` (`<domain>.helper.ts`).
- Prefer extending an existing utility or helper class over creating a new one when the functionality belongs to the same domain.