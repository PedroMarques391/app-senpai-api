---
trigger: always_on
---

# Rule: Shared Utility Functions

To maintain consistency and avoid duplicated helper logic across the project, follow these rules whenever creating utility functions.

## General Rules

- Any reusable helper function **must** be placed in `core/utils`.
- Do **not** create utility functions inside controllers, services, repositories, modules, or feature folders unless they are private implementation details.
- Before creating a new utility, always verify whether an equivalent already exists in `core/utils`.

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
- Keep utility classes stateless.
- Group related methods into the same utility class.
- Store every shared utility inside `core/utils`.
- Prefer extending an existing utility class over creating a new one when the functionality belongs to the same domain.