export type EventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "PRODUCT_CHANGE"
  | "CANCELLATION"
  | "UNCANCELLATION"
  | "EXPIRATION"
  | "SUBSCRIPTION_EXTENDED"
  | "SUBSCRIPTION_PAUSED"
  | "BILLING_ISSUE"
  | "TRANSFER"
  | "NON_RENEWING_PURCHASE"
  | "TEST";

export type EventProductId =
  | "vip_mestre:basic-vip-mestre"
  | "senpai_vip_pro:basic-vip-pro";

export type EventEntitlementId = "vip-mestre-basic" | "vip-pro-basic";

export type EventStore =
  | "APP_STORE"
  | "MAC_APP_STORE"
  | "PLAY_STORE"
  | "STRIPE"
  | "PROMOTIONAL"
  | "AMAZON";

export type EventPeriodType = "TRIAL" | "INTRO" | "NORMAL" | "PROMOTIONAL";

export type EventEnvironment = "SANDBOX" | "PRODUCTION";

export type EventCancelReasons =
  | "UNSUBSCRIBE"
  | "BILLING_ERROR"
  | "DEVELOPER_INITIATED"
  | "PRICE_INCREASE"
  | "CUSTOMER_SUPPORT"
  | "UNKNOWN";

export interface IRevenueCatEvent {
  id?: string;
  type: EventType;
  app_id?: string;
  app_user_id: string;
  original_app_user_id?: string;
  product_id: EventProductId;
  entitlement_id?: string | null;
  entitlement_ids?: EventEntitlementId[] | null;
  environment?: EventEnvironment;
  store?: EventStore;
  event_timestamp_ms?: number;
  purchased_at_ms: number;
  expiration_at_ms: number | null;
  transaction_id?: string;
  original_transaction_id?: string;
  period_type?: EventPeriodType;
  cancel_reason?: EventCancelReasons;
  currency?: string;
  price?: number;
}

export interface IRevenuePayload {
  api_version?: string;
  event: IRevenueCatEvent;
}
