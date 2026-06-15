# APEX Roadmap

## Execute → Learn → Remember → Refine → Share

```
Phase 11  Retrospective Engine     Execute → Learn
Phase 12  Semantic Knowledge Layer  Learn → Remember
Phase 13  Knowledge Consolidation   Remember → Refine
Phase 14  Feedback & Reinforcement  Refine → Share
Phase 15  Pattern Exchange          Share → Scale
```

---

### Phase 11 — Retrospective & Learning Engine

**Goal:** Convert execution into structured learning.

Execution → Retrospective → Knowledge

**Package:** `@apex/retrospective`

**Components:**
- `RetrospectiveGenerator` — Orchestrates retrospective creation from multiple sources
- `RetrospectiveTemplate` — Defines structure for retrospective output
- `LessonExtractor` — Parses retrospectives into actionable lessons
- `LessonScorer` — Ranks lessons by frequency, impact, and confidence

**Output:**
```ts
interface Retrospective {
  manifestId: string;
  wentWell: string[];
  failed: string[];
  repeat: string[];
  avoid: string[];
  recommendations: string[];
}
```

**Data Sources:**
- Manifest (plan, milestones, constraints)
- Task outcomes (passed/failed tasks)
- Scheduler events (assignments, timeouts, retries)
- Review results (code review, security review)
- Security findings (Sentinel violations, injection attempts)
- Rollback history (rollback triggers and frequency)

**Replaces:** Today's simplistic `extractFromManifest()` in `@apex/knowledge` with actual operational learning.

---

### Phase 12 — Semantic Knowledge Layer

**Goal:** Upgrade from keyword search to semantic search.

Keyword search → Semantic search

**Package:** `@apex/semantic`

**Components:**
- `EmbeddingProvider` — Abstract interface for embedding generation
- `VectorStore` — Storage abstraction for vector embeddings
- `SemanticRetriever` — Embedding-based similarity search

**Provider Support:**
- OpenAI
- OpenAI-compatible (e.g., LiteLLM)
- Ollama (local)
- LM Studio (local)
- Big Pickle embeddings (future)

**Storage Abstraction:**
```ts
interface VectorStore {
  storeEmbedding(id: string, vector: number[], metadata: Record<string, unknown>): Promise<void>;
  search(vector: number[], topK: number): Promise<SimilarityMatch[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}
```

**Implementations (Phase 12):**
- `InMemoryVectorStore` — Development/testing
- `SQLiteVectorStore` — Persistent single-node

---

### Phase 13 — Knowledge Consolidation

**Goal:** Deduplicate and cluster noisy lessons into canonical knowledge.

100 lessons → 23 unique lessons

**Subsystem:** Part of `@apex/knowledge`

**Components:**
- `KnowledgeNormalizer` — Canonicalizes phrasing (e.g., "build failed", "build error", "compilation failure" → normalized form)
- `KnowledgeClusterer` — Groups related lessons using embeddings + clustering
- `DuplicateDetector` — Identifies near-duplicate lessons within and across projects

**Example Input:**
```
"React build failed because alias mismatch"
"Vite alias caused build failure"
"Path alias misconfiguration broke build"
```

**Example Output:**
```
"React/Vite alias configuration issues"
  → references: manifest-a, manifest-b, manifest-c
```

---

### Phase 14 — Feedback & Reinforcement

**Goal:** Incorporate human feedback to rank and improve knowledge quality.

Knowledge + Human feedback → Organizational learning

**Subsystem:** Part of `@apex/knowledge`

**Components:**
- `KnowledgeRatingStore` — Stores feedback entries per lesson
- `LessonRanker` — Computes aggregate scores from feedback

**Interface:**
```ts
interface LessonFeedback {
  lessonId: string;
  helpful: boolean;
  rating: number;       // 1-5
  comment?: string;
  userId: string;
  createdAt: string;
}
```

**Behavior:**
- Lessons with high scores (e.g., 92) are prioritized by Planner
- Lessons with low scores (e.g., 15) are suppressed over time
- Feedback persists across sessions and projects

---

### Phase 15 — Pattern Exchange

**Goal:** Enable sharing patterns across teams and workspaces.

Team A → Pattern Pack → Team B

**Package:** `@apex/patterns`

**Components:**
- `PatternExporter` — Serializes patterns to portable format
- `PatternImporter` — Validates and loads pattern packs
- `PatternValidator` — Schema and integrity checks
- `PatternSigner` — Optional signing for provenance

**Pack Format:**
```json
{
  "name": "react-enterprise-pack",
  "version": "1.0.0",
  "patterns": [...]
}
```

**Supports:**
- export — Serialize registered patterns to file
- import — Load and validate pattern packs
- validate — Schema checks, conflict detection
- sign — Optional cryptographic signing (future)
- version — Semver-compatible versioning

**Future Potential:**
- Community pattern marketplace (if scope expands)

---

## Priority Order

| Phase | What | Why This Order |
|-------|------|----------------|
| 11 | Retrospective Engine | Highest ROI — converts existing data into learning |
| 12 | Semantic Knowledge Layer | BM25 will hit limits; embeddings are the natural next step |
| 13 | Knowledge Consolidation | Semantic search without dedup becomes noisy |
| 14 | Feedback & Reinforcement | Ranking matters only after knowledge is accumulated |
| 15 | Pattern Exchange | Sharing is valuable only after patterns have matured |
