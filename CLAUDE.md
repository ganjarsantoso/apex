# CLAUDE.md — APEX

## Project Overview

APEX is a dual-mode orchestration framework for OpenCode CLI, pairing interactive planning (Discovery) with automated execution and security scanning, governed by a strict state machine.

## Architecture

```
apex/
  apps/cli/            — OpenCode plugin entry point
  packages/
    types/             — All shared type definitions (zod-validated)
    shared/            — Constants, utilities, token budgets
    events/            — Typed event bus with correlation IDs
    orchestration/     — State machine + profile switcher + hooks bridge
    brain/             — Interactive discovery, questioning, spec builder
    planner/           — Task decomposition, dependency mapping
    compiler/          — Plan → immutable JSON compilation
    engine/            — Automated execution, subagent dispatch, TDD loops
    context/           — Active/Working/Archive memory + compressor
    sentinel/          — Governance: policy engine, security scanner, capability enforcement
    manifest/          — Capability manifests and permission management
    registry/          — Skill and plugin registry
    scheduler/         — Task scheduling and priority execution
    model-router/      — LLM capability-based routing
    memory-graph/      — Persistent knowledge graph
    knowledge/         — Knowledge base: storage, search, ranking, consolidation
    retrospective/     — Retrospective generation and lesson extraction
    semantic/          — Embedding providers and vector search
    patterns/          — Pattern exchange, validation, and signing
```

## Key Commands

```bash
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm lint             # Lint all packages
pnpm compile-prompts  # Rebuild system prompt
pnpm typecheck        # TypeScript type checking
```

## Development

- TypeScript strict mode
- pnpm workspaces
- tsup for building
- vitest for testing
- All types zod-validated

## Packages

All 20 packages under `@apex/*` namespace:
- `@apex/types` — Core types and Zod schemas
- `@apex/shared` — Shared utilities
- `@apex/events` — Typed event bus
- `@apex/orchestration` — State machine + profile switching
- `@apex/brain` — APEX Discovery
- `@apex/planner` — APEX Planning
- `@apex/compiler` — Plan compiler
- `@apex/engine` — APEX Execution
- `@apex/context` — Context management
- `@apex/sentinel` — Governance: policy, security, capabilities
- `@apex/manifest` — Capability manifests
- `@apex/registry` — Plugin registry
- `@apex/scheduler` — Task scheduling
- `@apex/model-router` — LLM routing
- `@apex/memory-graph` — Knowledge graph
- `@apex/knowledge` — Knowledge base
- `@apex/retrospective` — Lesson extraction
- `@apex/semantic` — Vector search
- `@apex/patterns` — Pattern exchange
- `@apex/cli` — CLI plugin
