import { Orchestrator } from '@apex/orchestration';
import { Brainstorm } from '@apex/brain';
import { TaskDecomposer } from '@apex/planner';
import { PlanCompiler } from '@apex/compiler';
import { Executor } from '@apex/engine';
import { ContextCompressor, ActiveMemory, WorkingMemory, ArchiveMemory } from '@apex/context';
import { StaticAnalyzer, RuntimeGuard, InjectionDetector, PolicyEngine } from '@apex/sentinel';
import { TypedEventBus } from '@apex/events';
import { AgentRegistry } from '@apex/registry';
import { ManifestStore, getMemoryConnection as getManifestMemoryConnection, runMigrations as runManifestMigrations } from '@apex/manifest';
import { AssignmentStore, getMemoryConnection as getRegistryMemoryConnection, runMigrations as runRegistryMigrations } from '@apex/registry';
import { AgentScheduler } from '@apex/scheduler';
import { ModelRegistry, ModelConfigService, ModelResolver, CommandParser, FileConfigStore } from '@apex/model-router';
import { MemoryGraph } from '@apex/memory-graph';
import { KnowledgeBase } from '@apex/knowledge';
import type { SimilarityProvider, LessonProvider, KnowledgeEntry } from '@apex/knowledge';
import { RetrospectiveGenerator, LessonExtractor, LessonConsolidator, LessonScorer } from '@apex/retrospective';
import type { RetrospectiveEvents } from '@apex/retrospective';

export type { OrchestratorStatus } from '@apex/orchestration';
export type { ExecutionPlan, ProjectSpec, Task, TaskGraph } from '@apex/types';
export type { AnalysisResult, GuardEvent, InjectionResult } from '@apex/sentinel';

export class ApexFramework {
  readonly orchestrator: Orchestrator;
  readonly brain: Brainstorm;
  readonly taskDecomposer: TaskDecomposer;
  readonly compiler: PlanCompiler;
  readonly executor: Executor;
  readonly activeMemory: ActiveMemory;
  readonly workingMemory: WorkingMemory;
  readonly archiveMemory: ArchiveMemory;
  readonly compressor: ContextCompressor;
  readonly staticAnalyzer: StaticAnalyzer;
  readonly runtimeGuard: RuntimeGuard;
  readonly injectionDetector: InjectionDetector;
  readonly policyEngine: PolicyEngine;
  readonly agentRegistry: AgentRegistry;
  readonly manifestStore: ManifestStore;
  readonly assignmentStore: AssignmentStore;
  readonly scheduler: AgentScheduler;
  readonly modelRegistry: ModelRegistry;
  readonly modelConfigService: ModelConfigService;
  readonly modelResolver: ModelResolver;
  readonly commandParser: CommandParser;
  readonly configStore: FileConfigStore;
  readonly memoryGraph: MemoryGraph;
  readonly knowledgeBase: KnowledgeBase;
  readonly retrospectiveGenerator: RetrospectiveGenerator;
  readonly eventBus: TypedEventBus;

  private eventStore: Map<string, RetrospectiveEvents> = new Map();
  private retrospectiveExtractor = new LessonExtractor();
  private retrospectiveConsolidator = new LessonConsolidator();
  private retrospectiveScorer = new LessonScorer();

  constructor() {
    this.eventBus = new TypedEventBus();
    this.agentRegistry = new AgentRegistry(this.eventBus);
    this.agentRegistry.registerDefaults();

    const manifestDb = getManifestMemoryConnection();
    runManifestMigrations(manifestDb);
    this.manifestStore = new ManifestStore(manifestDb);

    const registryDb = getRegistryMemoryConnection();
    runRegistryMigrations(registryDb);
    this.assignmentStore = new AssignmentStore(registryDb);

    this.modelRegistry = new ModelRegistry();
    this.configStore = new FileConfigStore();
    this.modelConfigService = new ModelConfigService(this.modelRegistry, {
      configStore: this.configStore,
      eventBus: this.eventBus,
    });
    this.modelResolver = new ModelResolver(this.modelRegistry, this.modelConfigService, this.agentRegistry, {
      eventBus: this.eventBus,
    });
    this.commandParser = new CommandParser(this.modelConfigService);

    this.scheduler = new AgentScheduler(
      this.agentRegistry,
      this.manifestStore,
      this.assignmentStore,
      {
        eventBus: this.eventBus,
        modelResolver: this.modelResolver,
      },
    );

    this.orchestrator = new Orchestrator(this.eventBus);
    this.compiler = new PlanCompiler();
    this.executor = new Executor();
    this.memoryGraph = new MemoryGraph();
    this.knowledgeBase = new KnowledgeBase(this.memoryGraph.store);
    this.retrospectiveGenerator = new RetrospectiveGenerator(
      this.manifestStore,
      this.memoryGraph.store,
    );

    const similarity: SimilarityProvider = this.knowledgeBase;
    const lessons: LessonProvider = this.knowledgeBase;

    this.taskDecomposer = new TaskDecomposer(similarity);
    this.brain = new Brainstorm(lessons);

    this.activeMemory = new ActiveMemory();
    this.workingMemory = new WorkingMemory();
    this.workingMemory.attachGraphStore(this.memoryGraph.store);
    this.archiveMemory = new ArchiveMemory();
    this.compressor = new ContextCompressor(this.activeMemory, this.workingMemory, this.archiveMemory);
    this.staticAnalyzer = new StaticAnalyzer();
    this.runtimeGuard = new RuntimeGuard();
    this.injectionDetector = new InjectionDetector();
    this.policyEngine = new PolicyEngine();

    this.eventBus.on('TaskCompleted', async (_event) => {
      this.compressor['completedTasks'] = (this.compressor['completedTasks'] ?? 0) + 1;
    });

    this.eventBus.on('TaskFailed', async (event) => {
      for (const mid of this.eventStore.keys()) {
        this.eventStore.get(mid)!.taskFailed.push(event);
      }
    });

    this.eventBus.on('ReviewFailed', async (event) => {
      for (const ev of this.eventStore.values()) {
        ev.reviewFailed.push(event);
      }
    });

    this.eventBus.on('ReviewPassed', async (event) => {
      for (const ev of this.eventStore.values()) {
        ev.reviewPassed.push(event);
      }
    });

    this.eventBus.on('SecurityIssueDetected', async (event) => {
      for (const ev of this.eventStore.values()) {
        ev.securityIssues.push(event);
      }
    });

    this.eventBus.on('PolicyViolationDetected', async (event) => {
      for (const ev of this.eventStore.values()) {
        ev.policyViolations.push(event);
      }
    });

    this.eventBus.on('PhaseTransitioned', async (event) => {
      for (const ev of this.eventStore.values()) {
        ev.phaseTransitions.push(event);
      }
      if (event.to === 'ROLLBACK' && event.projectId) {
        const manifestId = event.projectId;
        const stored = this.eventStore.get(manifestId);
        if (stored) {
          this.generateRetrospective(manifestId, stored);
          this.eventStore.delete(manifestId);
        }
      }
    });

    this.eventBus.on('ScheduleCompleted', async (event: any) => {
      if (event.manifestId) {
        const manifest =         this.manifestStore.load(event.manifestId);
        if (manifest) {
          this.memoryGraph.builder.ingestManifest(manifest);
          this.knowledgeBase.ingestManifestKnowledge(manifest);
          const stored = this.eventStore.get(event.manifestId) ?? {
            taskFailed: [], reviewFailed: [], reviewPassed: [],
            securityIssues: [], policyViolations: [], phaseTransitions: [],
          };
          this.generateRetrospective(event.manifestId, stored);
          this.eventStore.delete(event.manifestId);
        }
      }
    });

    this.eventBus.on('ScheduleCreated', async (event: any) => {
      if (event.manifestId) {
        this.eventStore.set(event.manifestId, {
          taskFailed: [], reviewFailed: [], reviewPassed: [],
          securityIssues: [], policyViolations: [], phaseTransitions: [],
        });
      }
    });
  }

  private generateRetrospective(manifestId: string, events: RetrospectiveEvents): void {
    const retro = this.retrospectiveGenerator.generate({ manifestId, events });
    if (!retro) return;

    const lessons = this.retrospectiveExtractor.extract(retro);
    const consolidated = this.retrospectiveConsolidator.consolidate(lessons);
    const scored = this.retrospectiveScorer.score(consolidated);

    for (const lesson of scored) {
      this.knowledgeBase.lessonsStore.addEntry({
        summary: lesson.text.slice(0, 120),
        detail: lesson.text,
        tags: [lesson.category, ...lesson.impactFlags],
        source: 'retrospective',
        projectId: retro.projectId,
        manifestId: retro.manifestId,
      });
    }
  }

  getStatus() {
    const orchestratorStatus = this.orchestrator.getStatus();
    const contextUsage = this.archiveMemory.getUsage();
    const blockedCount = this.runtimeGuard.getBlockedCount();

    return {
      phase: orchestratorStatus.phase,
      profile: orchestratorStatus.profile,
      interactiveAllowed: orchestratorStatus.interactiveAllowed,
      context: {
        archive: contextUsage,
        completedTasks: this.compressor['completedTasks'] ?? 0,
      },
      security: {
        blockedCommands: blockedCount,
      },
      agents: this.agentRegistry.getStats(),
      scheduler: this.scheduler.getStatus(),
      model: {
        default: this.modelConfigService.getConfig().defaultModel,
        overrides: this.modelConfigService.getConfig().roleOverrides,
        agentOverrides: this.modelConfigService.getConfig().agentOverrides,
      },
    };
  }
}

const apexPlugin = async ({ client, directory }: { client: unknown; directory: string }) => {
  return {
    config: async (config: Record<string, unknown>) => {
      config.skills = config.skills || {};
      (config.skills as Record<string, unknown>).paths = [
        ...((config.skills as Record<string, unknown>)?.paths as string[] ?? []),
        '../skills',
      ];
    },
  };
};

export default apexPlugin;
export { ApexFramework as Apex };
