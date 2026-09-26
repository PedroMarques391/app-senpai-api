import { ObjectId } from "mongodb";
import z from "zod";

export const groupSchema = z.object({
    _id: z.instanceof(ObjectId),
    title: z.string().min(3).max(50),
    link: z.array(z.url()).max(2),
    created_at: z.coerce.date().default(() => new Date()),
    updated_at: z.coerce.date().default(() => new Date()),
}); 