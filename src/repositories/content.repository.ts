import type { ActiveContentParams, ContentFilterOptions } from "@/dtos";
import { MongoInitializer } from "@/init";
import {
  insertContentSchema,
  type Content,
  type CreateContentPayload,
  type ContentRepository as IContentRepository,
} from "@/models";
import type { PaginationOptions, RepositoryPaginatedResult } from "@/types";
import type { Filter, ObjectId } from "mongodb";

export class ContentRepository implements IContentRepository {
  private get collection() {
    return MongoInitializer.getDb().collection<Content>("contents");
  }

  async findById(id: ObjectId): Promise<Content | null> {
    return this.collection.findOne({ _id: id });
  }

  async findActive(params: ActiveContentParams): Promise<Content[]> {
    const query: Filter<Content> = {
      status: "active",
      start_at: { $lte: params.now },
      $or: [{ end_at: { $exists: false } }, { end_at: { $gte: params.now } }],
    };

    if (params.type) {
      query.type = params.type;
    }
    if (params.platform) {
      query.platform = { $in: [params.platform, "both", "all"] };
    }

    return this.collection.find(query).sort({ priority: -1 }).toArray();
  }

  async findAll(
    filters: ContentFilterOptions,
    pagination: PaginationOptions,
  ): Promise<RepositoryPaginatedResult<Content>> {
    const query: Filter<Content> = {};
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;

    const [data, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ priority: -1, created_at: -1 })
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .toArray(),
      this.collection.countDocuments(query),
    ]);

    return { data, total };
  }

  async create(
    createdBy: ObjectId,
    content: CreateContentPayload,
  ): Promise<Content | null> {
    const parsedData = insertContentSchema.parse({
      created_by: createdBy,
      ...content,
    });
    const result = await this.collection.insertOne(parsedData as Content);
    if (!result.insertedId) return null;
    return this.collection.findOne({ _id: result.insertedId });
  }

  async update(
    id: ObjectId,
    content: Partial<Content>,
  ): Promise<Content | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          ...content,
          updated_at: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    return result;
  }

  async delete(id: ObjectId): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }
}
