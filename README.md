# APEX — Autonomous Planning and Execution eXchange

APEX is a **dual-mode orchestration framework** for [OpenCode CLI](https://opencode.ai). It pairs interactive discovery and planning with automated execution and security governance, all governed by a strict state machine.

## Packages

| Package | Description |
|---------|-------------|
| `@apex/types` | Core type definitions and Zod schemas shared across all packages |
| `@apex/shared` | Shared utilities, helpers, and common functions |
| `@apex/events` | Event bus system for decoupled inter-package communication |
| `@apex/orchestration` | State machine orchestrator managing lifecycle phases and profile switching |
| `@apex/brain` | Interactive discovery agent for questioning and specification writing |
| `@apex/planner` | Task decomposition engine and implementation planning |
| `@apex/compiler` | Compiles interactive plans into immutable execution JSON |
| `@apex/engine` | Automated execution engine with TDD loops and security scanning |
| `@apex/context` | Context management, compression, and token tracking |
| `@apex/sentinel` | Security governance: static analysis, runtime guards, injection detection |
| `@apex/manifest` | Capability manifest and permission management |
| `@apex/registry` | Skill and plugin registry for extensibility |
| `@apex/scheduler` | Task scheduling and priority-based execution sequencing |
| `@apex/model-router` | Model router for capability-based LLM selection |
| `@apex/memory-graph` | Persistent knowledge graph for long-term memory |
| `@apex/knowledge` | Knowledge base with storage, search, ranking, consolidation, and feedback |
| `@apex/retrospective` | Retrospective generation, lesson extraction, and scoring |
| `@apex/semantic` | Semantic embedding and vector search for knowledge retrieval |
| `@apex/patterns` | Pattern exchange format: export, import, validate, and sign reusable patterns |
| `@apex/cli` | CLI plugin for OpenCode with all slash commands |

## Architecture

```
User Input → Brain (Discovery) → Planner → Compiler → Immutable JSON → Engine (Execution) → Sentinel → Review
```

Two distinct modes:

- **Interactive** (Discovery, Planning) — targeted questioning, architecture design, implementation planning
- **Automated** (Execution, Rollback) — automated TDD, security scanning, no prompting

### State Machine

```
IDEA → DISCOVERY → PLANNING → APPROVED → COMPILED → EXECUTING → REVIEW → COMPLETE
                                                         ↘ FAILED → ROLLBACK → PLANNING
```

## Quick Start

APEX runs as an OpenCode CLI plugin:

```json
{
  "plugin": ["@apex/cli"]
}
```

Then in OpenCode:

```
/brainstorm "Add user authentication"
```

### Commands

| Command | Phase | Description |
|---------|-------|-------------|
| `/brainstorm` | IDEA → DISCOVERY | Start interactive discovery |
| `/spec` | DISCOVERY → PLANNING | Write design specification |
| `/plan` | PLANNING | Create implementation plan |
| `/approve` | PLANNING → APPROVED | Freeze plan for execution |
| `/compile` | APPROVED → COMPILED | Compile plan to immutable JSON |
| `/run` | COMPILED → EXECUTING | Execute compiled plan automatically |
| `/review` | EXECUTING → REVIEW | Run 3-stage review gate |
| `/status` | Any | Show phase, profile, context usage |
| `/compact` | Any | Manual context compression |

## Development

### Prerequisites

- Node.js >= 20
- pnpm

### Setup

```bash
pnpm install
pnpm build
pnpm test
```

### Project Structure

```
apex/
├── apps/
│   └── cli/          # OpenCode CLI plugin
├── packages/
│   ├── types/        # Core types and schemas
│   ├── shared/       # Shared utilities
│   ├── events/       # Event bus
│   ├── orchestration/# State machine
│   ├── brain/        # Discovery agent
│   ├── planner/      # Task planning
│   ├── compiler/     # Plan compilation
│   ├── engine/       # Execution engine
│   ├── context/      # Context management
│   ├── sentinel/     # Security governance
│   ├── manifest/     # Capability manifests
│   ├── registry/     # Plugin registry
│   ├── scheduler/    # Task scheduling
│   ├── model-router/ # LLM routing
│   ├── memory-graph/ # Knowledge graph
│   ├── knowledge/    # Knowledge base
│   ├── retrospective/# Lesson extraction
│   ├── semantic/     # Vector search
│   └── patterns/     # Pattern exchange
├── docs/
├── vitest.config.ts
├── tsconfig.base.json
└── tsup.config.ts
```

## Lifecycle: Execute → Learn → Remember → Refine → Share

APEX follows a five-phase intelligence pipeline:

| Phase | Package | Status |
|-------|---------|--------|
| Execute | Core orchestration (brain → planner → compiler → engine → sentinel) | Complete |
| Learn | `@apex/retrospective` — retrospective generation, lesson extraction | Complete |
| Remember | `@apex/semantic` — embeddings, vector search | Complete |
| Refine | `@apex/knowledge` — consolidation, feedback ranking | Complete |
| Share | `@apex/patterns` — pattern exchange format | Complete |

## Design Principles

1. **No execution without compilation** — hard boundary between planning and execution; compiled plans are immutable
2. **Interactive planning only** — Brain asks questions; Engine never does
3. **Profile isolation** — each operating mode has its own capabilities, skills, and permissions
4. **Context efficiency** — token preservation is mandatory
5. **Fail closed** — when in doubt, block, don't proceed

## License

MIT
