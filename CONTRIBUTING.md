# Contributing to CloudOps OS

Thank you for your interest in contributing! This guide covers everything
you need to get started.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Commit Convention](#commit-convention)
- [Running Tests](#running-tests)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)

---

## Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/cloudops-os-mcp.git
cd cloudops-os-mcp

# 2. Install dependencies
npm install

# 3. Copy the environment template
cp .env.example .env
# Edit .env with your actual values

# 4. Start the dev server
npm run dev
```

> **Tip**: The server runs in STDIO-only mode by default during development.
> Set `NODE_ENV=production` to enable the HTTP SSE transport as well.

---

## Project Structure

```
cloudops-os-mcp/
├── src/
│   ├── index.ts                    # Entry point & graceful shutdown
│   ├── app.module.ts               # Root module (registers all features)
│   ├── modules/
│   │   └── terraform/              # Terraform automation tools + LLM agent
│   ├── monitoring/                 # Cloud resource monitoring MCP tools
│   ├── observability/              # Structured logger + log types
│   ├── realtime/                   # Message broker, event log, agent state
│   ├── health/                     # System & deployment health checks
│   └── widgets/                    # Next.js dashboard widgets
├── tests/
│   ├── fixtures/                   # Deterministic test data (Terraform, Rego)
│   ├── integration-runner.ts       # Generic test harness
│   ├── terraform-pipeline.test.ts  # Pipeline integration tests
│   └── llm-orchestration.test.ts   # Multi-agent orchestration tests
├── policies/
│   └── governance.rego             # OPA governance policy
└── examples/
    └── sample.tf                   # Example Terraform configuration
```

---

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer: Closes #N]
```

**Types:**

| Type       | When to use                                   |
|------------|-----------------------------------------------|
| `feat`     | New feature or behaviour                      |
| `fix`      | Bug fix                                       |
| `docs`     | Documentation only changes                   |
| `test`     | Adding or improving tests                     |
| `refactor` | Code restructuring without behaviour change   |
| `chore`    | Build, tooling, dependency updates            |
| `perf`     | Performance improvements                      |

**Scopes** (optional but encouraged): `terraform`, `realtime`, `health`,
`observability`, `monitoring`, `widgets`, `policy`.

---

## Running Tests

```bash
# Run all tests
npm test

# Run a specific test file
npx jest tests/terraform-pipeline.test.ts

# Run with verbose output
npx jest --verbose

# Watch mode during development
npx jest --watch
```

Test fixtures live in `tests/fixtures/` — add new fixtures there for
deterministic, offline testing. **Never** commit credentials or real API
responses as fixtures.

---

## Pull Request Process

1. **Branch** off `main` using a descriptive name:
   ```
   git checkout -b feat/realtime-websocket-gateway
   git checkout -b fix/agent-state-recovery
   ```
2. **Write tests** for any new behaviour — untested code will be asked to
   add coverage before merge.
3. **Run tests** locally before pushing: `npm test`
4. **Open a PR** with a clear description of _what_ changed and _why_.
5. A maintainer will review within 2 business days.

---

## Code Style

- **TypeScript strict mode** is enabled — no `any` without a comment justifying it.
- Use `async/await` over raw Promise chains.
- Prefer named exports; avoid `export default` for services and modules.
- Keep files focused: one service/module/tool per file.
- All public methods should have a JSDoc comment explaining intent, not
  just restating the method name.
