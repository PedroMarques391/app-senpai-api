import { ObjectId } from "mongodb";
import { z } from "zod";
import {
  packModerationActionEnum,
  packModerationStatusEnum,
} from "./packages.schema";
import { reportReasonEnum } from "./pack-report.schema";

export const packModerationLogSchema = z.object({
  _id: z.instanceof(ObjectId),
  pack_id: z.instanceof(ObjectId),
  pack_name: z.string(),
  owner_id: z.instanceof(ObjectId),
  action: packModerationActionEnum,
  previous_status: packModerationStatusEnum,
  new_status: z.union([packModerationStatusEnum, z.literal("deleted")]),
  reason: reportReasonEnum.optional(),
  notes: z.string().max(500).optional(),
  strike_applied: z.boolean().default(false),
  owner_strikes_after: z.number().int().nonnegative().optional(),
  reports_count: z.number().int().nonnegative().default(0),
  report_reasons: z.array(reportReasonEnum).default([]),
  stickers_count: z.number().int().nonnegative().default(0),
  cloudinary_ids: z.array(z.string()).default([]),
  moderator_id: z.instanceof(ObjectId),
  moderator_username: z.string(),
  created_at: z.coerce.date().default(() => new Date()),
});

export const insertPackModerationLogSchema = packModerationLogSchema.omit({
  _id: true,
});
