export interface IBillingService {
  handleRevenueCatWebhook(payload: any): Promise<void>;
}

export interface ICacheService {
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
}
