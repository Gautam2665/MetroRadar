import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';
import { GraphBuilderService } from './graph-builder.service';
import { TransitGraph } from './graph.types';

/**
 * GraphProviderService — the single entry point for obtaining a transit graph.
 *
 * JourneyService always calls graphProvider.get(systemId) and never cares
 * whether the graph came from Redis cache or was freshly built from PostgreSQL.
 *
 * Cache key format: graph:v1:system:<systemCode>
 * Using a version prefix means bumping to v2 instantly invalidates all v1 graphs
 * without a manual cache flush.
 *
 * TTL: 4 hours (metro schedules are static data, not realtime)
 */
@Injectable()
export class GraphProviderService {
  private readonly logger = new Logger(GraphProviderService.name);
  private readonly GRAPH_VERSION = 'v2';
  private readonly GRAPH_TTL_SECONDS = 4 * 60 * 60; // 4 hours

  constructor(
    private readonly redis: RedisService,
    private readonly graphBuilder: GraphBuilderService,
  ) {}

  /**
   * Get the transit graph for a system.
   * Checks Redis first; builds from DB on cache miss and stores result.
   */
  async get(systemId: string, systemCode: string): Promise<TransitGraph> {
    const cacheKey = this.buildCacheKey(systemCode);

    const cached = await this.redis.get<SerializableGraph>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT for graph:${cacheKey}`);
      return this.deserialize(cached);
    }

    this.logger.log(`Cache MISS for graph:${cacheKey} — building from DB`);
    const graph = await this.graphBuilder.build(systemId);
    await this.redis.set(cacheKey, this.serialize(graph), this.GRAPH_TTL_SECONDS);
    return graph;
  }

  /** Invalidate a specific system's graph (e.g., after GTFS import) */
  async invalidate(systemCode: string): Promise<void> {
    const cacheKey = this.buildCacheKey(systemCode);
    await this.redis.del(cacheKey);
    this.logger.log(`Invalidated graph cache: ${cacheKey}`);
  }

  /** Invalidate ALL versioned graph caches (e.g., schema migration) */
  async invalidateAll(): Promise<void> {
    await this.redis.delByPattern(`graph:${this.GRAPH_VERSION}:system:*`);
    this.logger.log(`Invalidated all graph:${this.GRAPH_VERSION} caches`);
  }

  private buildCacheKey(systemCode: string): string {
    return `graph:${this.GRAPH_VERSION}:system:${systemCode}`;
  }

  /**
   * Serialize TransitGraph for Redis storage.
   * Maps cannot be JSON-serialized directly so we convert to arrays.
   */
  private serialize(graph: TransitGraph): SerializableGraph {
    return {
      systemId: graph.systemId,
      systemCode: graph.systemCode,
      builtAt: graph.builtAt,
      nodes: [...graph.nodes.entries()],
      edges: [...graph.edges.entries()],
    };
  }

  /** Deserialize from Redis back into a TransitGraph with proper Maps */
  private deserialize(raw: SerializableGraph): TransitGraph {
    return {
      systemId: raw.systemId,
      systemCode: raw.systemCode,
      builtAt: raw.builtAt,
      nodes: new Map(raw.nodes),
      edges: new Map(raw.edges),
    };
  }
}

/** Intermediate type used for JSON-safe Redis serialization */
interface SerializableGraph {
  systemId: string;
  systemCode: string;
  builtAt: number;
  nodes: [string, any][];
  edges: [string, any[]][];
}
