import { z } from 'zod';

export const GraphEntityKindEnum = z.enum([
  'PROJECT',
  'MANIFEST',
  'MILESTONE',
  'TASK',
  'AGENT',
  'ASSIGNMENT',
  'CONSTRAINT',
  'ARCHIVE_ENTRY',
  'ARTIFACT',
  'MODEL',
]);

export type GraphEntityKind = z.infer<typeof GraphEntityKindEnum>;

export const GraphRelationshipTypeEnum = z.enum([
  'DEPENDS_ON',
  'ASSIGNED_TO',
  'CONTAINS',
  'PRODUCES',
  'BLOCKS',
  'PRECEDES',
  'REVIEWED_BY',
  'RELATES_TO',
  'USES_MODEL',
  'EXECUTED_BY',
  'GENERATED_FROM',
  'BELONGS_TO',
]);

export type GraphRelationshipType = z.infer<typeof GraphRelationshipTypeEnum>;

export const GraphEntitySchema = z.object({
  id: z.string(),
  kind: GraphEntityKindEnum,
  properties: z.record(z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type GraphEntity = z.infer<typeof GraphEntitySchema>;

export const GraphRelationshipSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  type: GraphRelationshipTypeEnum,
  properties: z.record(z.unknown()).optional(),
  weight: z.number().optional(),
  createdAt: z.string().datetime(),
});

export type GraphRelationship = z.infer<typeof GraphRelationshipSchema>;

export const GraphSnapshotSchema = z.object({
  entities: z.array(GraphEntitySchema),
  relationships: z.array(GraphRelationshipSchema),
  createdAt: z.string().datetime(),
});

export type GraphSnapshot = z.infer<typeof GraphSnapshotSchema>;

export const GraphQuerySchema = z.object({
  kinds: z.array(GraphEntityKindEnum).optional(),
  relationshipTypes: z.array(GraphRelationshipTypeEnum).optional(),
  maxDepth: z.number().min(1).max(10).default(3),
  fromId: z.string(),
  toId: z.string().optional(),
});

export type GraphQuery = z.infer<typeof GraphQuerySchema>;
