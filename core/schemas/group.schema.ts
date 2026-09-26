import { ObjectId } from "mongodb";
import z from "zod";

export const groupsSchema = z.object({
    _id: z.instanceof(ObjectId),
    user_id: z.instanceof(ObjectId),
    groups: z.array(
        z.object({
            title: z.string(),
            url: z.url(),
        })
    ).min(1).max(2),
    created_at: z.coerce.date().default(() => new Date()),
    updated_at: z.coerce.date().default(() => new Date()),
});

export const groupSchema = groupsSchema;