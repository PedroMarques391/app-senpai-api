---
description: Performs security checks, code hygiene (logs/secrets), build validation, and generates modular semantic commits following Senpai API standards.
---

---
name: semantic-commit
trigger: /semantic-commit
---

# Semantic Commit Workflow

This workflow automates and standardizes the commit process across the Senpai API codebase, ensuring code quality, security, traceability, and a clean Git history.

---

## 🎯 Commit Rules and Conventions

### 1. Message Format
```text
<type>(<scope>): <short description in imperative present tense>

[optional body with details in bullet points]
```

### 2. Allowed Types (`<type>`)
- **`feat`**: New feature, endpoint, service, model, or entity.
- **`refactor`**: Internal code restructuring, separation of concerns (SRP/DDD), types and interfaces without changing external behavior.
- **`fix`**: Bug fix, validation error resolution, or unhandled exception fix.
- **`perf`**: Performance improvements (e.g., MongoDB indexes, optimized queries, reduced network calls).
- **`docs`**: Documentation updates, READMEs, guides, or `.md` files.
- **`chore`**: Configuration tweaks, `.gitignore`, build scripts, dependencies, or environment setup.
- **`test`**: Adding or refactoring automated tests.

### 3. Standardized Scopes (`<scope>`)
Use the specific domain or architectural layer affected:
- **Domains**: `(pack)`, `(store)`, `(purchase)`, `(content)`, `(user)`, `(sticker)`, `(inventory)`, `(daily-mission)`, `(auth)`, `(upload)`
- **Layers / Infra**: `(core)`, `(models)`, `(dtos)`, `(schemas)`, `(database)`, `(plugin)`, `(factories)`, `(utils)`

### 4. Modular Commits
- Never create a "mega commit" combining unrelated domains (e.g., changes in `content` and `store` must be separate commits).
- Group files related to the same use case, domain, or layer into discrete commits.

---

## 🛡️ Mandatory Pre-Commit Checklist

Before executing any commit (`git commit`), the workflow **MUST** perform the following 3 verification steps:

### 1. Code Hygiene (Removal of Leftover Debug Logs)
- Inspect modified files (`git diff`) for temporary `console.log`, `console.debug`, or debug statements added during development.
- **Action**: Remove temporary debug logs before committing (preserving only intentional system-level logs, such as startup messages and error logging in `catch` blocks).

### 2. Security Check (Exposed Secrets & API Keys)
- Ensure no sensitive credentials or keys are hardcoded in the source code:
  - JWT secrets, database passwords, third-party API keys (Cloudinary, Stripe, etc.), connection strings with credentials.
  - Ensure `.env`, `.pem`, or credential files are not accidentally staged.
- **Action**: If any secret is detected, **abort the commit immediately** and alert the developer to move the sensitive value to `.env` or environment variables.

### 3. Build & TypeScript Type Validation
- Run type checking and project compilation:
  ```bash
  yarn build
  ```
- **Action**: If any TypeScript or compilation error occurs, **do not commit**. Report the errors to the developer for resolution prior to committing.

---

## 📋 Step-by-Step Execution Plan

1. **Inspect Repository State**:
   - Run `git status` and `git diff` to map all modified and untracked files.

2. **Scan for Logs & Secrets**:
   - Clean up any residual `console.log` statements and ensure no exposed secrets are present in staged changes.

3. **Verify Build**:
   - Run `yarn build`.
   - If the build fails: abort immediately and report the compilation errors.

4. **Group Changes Modularly**:
   - Partition changes by context/domain (e.g., Group 1 = Core/Types, Group 2 = Store/Purchase, etc.).

5. **Stage & Commit**:
   - For each group:
     ```bash
     git add <module-files>
     git commit -m "<type>(<scope>): <clear message>"
     ```

6. **Final Verification**:
   - Run `git log -n <total_commits> --stat` to display the clean, organized commit history.
