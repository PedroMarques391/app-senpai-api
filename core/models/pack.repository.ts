import type { ObjectId } from "mongodb";
import type { StickerPack } from "./sticker-pack.model";

export interface PackRepository {
    findAll(): Promise<StickerPack[]>;
    findById(id: ObjectId, userId: ObjectId): Promise<StickerPack | null>;
}