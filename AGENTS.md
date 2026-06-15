# APEX (Autonomous Planning and Execution eXchange) — Agent Instructions

This is a **production-grade orchestration framework** for OpenCode CLI. APEX pairs interactive planning (Discovery) with automated execution and security scanning, governed by a strict state machine.

**Version:** 0.1.0

## Core Architecture

APEX operates as a strict state machine:

```
IDEA → DISCOVERY → PLANNING → APPROVED → COMPILED → EXECUTING → REVIEW → COMPLETE
                                                         ↘ FAILED → ROLLBACK → PLANNING
```

Two distinct modes:
- **Interactive** (DISCOVERY, PLANNING, FAILED) — Brain phase: targeted questioning, design, planning
- **Automated** (EXECUTING, ROLLBACK) — Engine phase: automated TDD, security, no questions

## Available Agents

| Agent | Phase | Purpose | Model |
|-------|-------|---------|-------|
| orchestrator | All | State machine, profile switching, lifecycle | claude-sonnet-4-5 |
| brain | DISCOVERY | Targeted questioning, spec writing | claude-opus-4-5 |
| planner | PLANNING | Task decomposition, dependency mapping | claude-opus-4-5 |
| engine | EXECUTING | Automated task execution, TDD loops | claude-sonnet-4-5 |
| code-reviewer | REVIEW | Spec compliance + code quality | claude-opus-4-5 |
| security-reviewer | REVIEW | Sentinel vulnerability scan | claude-opus-4-5 |

## Slash Commands

| Command | Phase | Description |
|---------|-------|-------------|
| `/brainstorm` | IDEA → DISCOVERY | Start interactive discovery |
| `/spec` | DISCOVERY → PLANNING | Write design spec |
| `/plan` | PLANNING | Create implementation plan |
| `/approve` | PLANNING → APPROVED | Freeze plan for execution |
| `/compile` | APPROVED → COMPILED | Compile plan to immutable JSON |
| `/run` | COMPILED → EXECUTING | Execute compiled plan automatically |
| `/review` | EXECUTING → REVIEW | Run 3-stage review gate |
| `/status` | Any | Show phase, profile, context usage |
| `/compact` | Any | Manual context compression |

## Design Principles

1. **No Execution Without Compilation** — Hard boundary between planning and execution; compiled plans are immutable
2. **Interactive Planning Only** — Brain asks questions; Engine never does
3. **Profile Isolation** — Each operating mode has its own capabilities, skills, and permissions
4. **Context Efficiency** — Token preservation is mandatory
5. **Fail Closed** — When in doubt, block — not proceed

## Security

- Sentinel runs static analysis + runtime guard + capability enforcement on every action
- CRITICAL security issues block delivery
- Never hardcode secrets, always validate input
- Runtime protection blocks dangerous commands

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

## Lifecycle: Execute → Learn → Remember → Refine → Share

All five phases of the APEX intelligence pipeline are complete:

| Phase | Package | Status |
|-------|---------|--------|
| Execute | Core orchestration (brain → planner → compiler → engine → sentinel) | Complete |
| Learn | `@apex/retrospective` — retrospective generation, lesson extraction | Complete |
| Remember | `@apex/semantic` — embeddings, vector search | Complete |
| Refine | `@apex/knowledge` — consolidation, feedback ranking | Complete |
| Share | `@apex/patterns` — pattern exchange format | Complete |

See [docs/roadmap.md](./docs/roadmap.md) for full details on each phase.