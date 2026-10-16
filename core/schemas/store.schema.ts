import { ObjectId } from "mongodb";
import z from "zod";

export const storeItemTypeEnum = z.enum(
  [
    "wallpaper",
    "gift",
    "badge",
    "border",
    "profile_frame",
    "profile_picture",
    "premium_subscription",
    "effect",
    "other",
  ],
  { message: "Tipo de item inválido." },
);
export type StoreItemType = z.infer<typeof storeItemTypeEnum>;

export const storeItemStatusEnum = z.enum(
  ["active", "inactive", "archived"],
  { message: "Status do item inválido." },
);
export type StoreItemStatus = z.infer<typeof storeItemStatusEnum>;

export const storeCodeSchema = z
  .string()
  .trim()
  .min(3, "Código do item inválido.")
  .regex(/^[a-z0-9_]+$/, "Código do item inválido.");

export const storeItemSchema = z.object({
  _id: z.instanceof(ObjectId),
  code: storeCodeSchema,
  name: z.string().trim().min(1),
  description: z.string().default(""),
  type: storeItemTypeEnum,
  price_in_petals: z.number().int().nonnegative(),
  purchases_count: z.number().int().default(0),
  thumbnail_cloudinary_id: z.string().optional(),
  thumbnail_url: z.string().optional(),
  file_cloudinary_id: z.string().optional(),
  file_url: z.string().optional(),
  status: storeItemStatusEnum.default("active"),
  created_at: z.coerce.date().default(() => new Date()),
  updated_at: z.coerce.date().default(() => new Date()),
});

export const StoreItemSchema = storeItemSchema;
