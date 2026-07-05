# Changelog

All notable changes to CloudOps OS are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Auto-recovery for degraded agents when error rate drops below 5%
- RSS and external memory metrics in system health endpoint

### Changed
- Degradation threshold lowered from 20% → 10% error rate

---

## [1.0.0] - 2026-07-02

### Added
- CloudOps OS MCP server with NestJS-style module architecture
- **Terraform Module**: AI-powered plan generation, policy validation, and
  apply/rollback pipeline via MCP tools
- **LLM Agent**: Multi-model routing (OpenRouter, Groq, fallback) with
  streaming, retry, and cost tracking
- **Policy Engine**: OPA-compatible Rego policy evaluation for cost,
  security, and tagging governance
- **Monitoring Module**: Real-time cloud resource monitoring tools
- **Realtime Module**: In-memory message broker, append-only event log,
  and WebSocket gateway contracts for live UI updates
- **Agent State Service**: Queue-depth tracking, latency averaging, and
  degradation detection for all registered agents
- **Structured Logger**: JSON-formatted logs with correlation IDs and
  OpenTelemetry-compatible trace context
- **Health Checks**: `/health/system` (memory, uptime, PID) and
  `/health/deployment` (per-agent readiness)
- **Widget Dashboard** (Next.js): Agent status dashboard and Terraform PR
  review widget
- **Governance Policy**: `policies/governance.rego` for enterprise-grade
  infrastructure guardrails
- Integration test suite: Terraform pipeline and LLM orchestration tests
- Test fixtures: verified Terraform baseline, flawed configs, and Rego
  policies for deterministic testing

### Fixed
- Server entry point had stale "Calculator MCP Server" comment header
- Structured logger was building log objects but not emitting them to stdout

### Security
- `.env.example` provided; `.env` excluded from git via `.gitignore`
- Secrets must be injected via environment variables — no hardcoded credentials

---

## [0.1.0] - 2026-06-01

### Added
- Initial project scaffold: TypeScript, Nitrostack, ESM modules
- Base `.gitignore`, `.env.example`, `jest.config.js`, `tsconfig.json`
