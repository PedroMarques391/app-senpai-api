import type { RedisClientType } from "redis";

export interface ICacheService {
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
}

export class CacheService implements ICacheService {
  constructor(private readonly redis: RedisClientType) {}

  async set<T>(
    key: string,
    value: T,
    ttl: number = 60 * 60 * 24,
  ): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.redis.set(key, serialized, { EX: ttl });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;

    const rawString = typeof value === "string" ? value : value.toString();
    return JSON.parse(rawString) as T;
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys: string[] = [];
    for await (const key of this.redis.scanIterator({ MATCH: pattern })) {
      const keyStr = typeof key === "string" ? key : key.toString();
      keys.push(keyStr);
    }

    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }
}
