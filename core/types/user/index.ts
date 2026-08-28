import type { ObjectId } from "mongodb";

export type UserId = { _id: ObjectId } | { wa_id: string };

export type UserIdentifier =
  | UserId
  | { email: string }
  | { userName: string };
