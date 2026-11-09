import type { ObjectId } from "mongodb";

export type UserId =
  | { _id: ObjectId }
  | { wa_id: string };

export type UserIdentifier =
  | UserId
  | { wa_id: string | { $in: string[] } }
  | { email: string }
  | { userName: string };

export type PlanTier = "free" | "vip_pro" | "vip_master";
