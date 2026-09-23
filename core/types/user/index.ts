import type { ObjectId } from "mongodb";

export type UserId =
  | { _id: ObjectId }
  | { wa_id: string | { $in: string[] } };

export type UserIdentifier =
  | UserId
  | { email: string }
  | { userName: string };

export type PlanTier = "free" | "vip_pro" | "vip_master";
