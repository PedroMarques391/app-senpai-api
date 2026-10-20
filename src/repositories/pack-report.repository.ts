import { MongoInitializer } from "@/init";
import {
  insertPackReportSchema,
  type CreatePackReportPayload,
  type PackReport,
  type PackReportRepository as IPackReportRepository,
} from "@/models";
import type { PaginationOptions, RepositoryPaginatedResult } from "@/types";
import type { ObjectId } from "mongodb";

export class PackReportRepository implements IPackReportRepository {
  private get collection() {
    return MongoInitializer.getDb().collection<PackReport>("pack_reports");
  }

  async create(data: CreatePackReportPayload): Promise<PackReport> {
    const parsedData = insertPackReportSchema.parse(data);
    const result = await this.collection.insertOne(parsedData as PackReport);
    const created = await this.collection.findOne({ _id: result.insertedId });
    if (!created) {
      throw new Error("Falha ao registrar denúncia do pacote");
    }
    return created;
  }

  async findAll(
    pagination: PaginationOptions,
  ): Promise<RepositoryPaginatedResult<PackReport>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.collection
        .find({})
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments({}),
    ]);

    return { data, total };
  }

  async findByPackAndReporter(
    packId: ObjectId,
    reporterId: ObjectId,
  ): Promise<PackReport | null> {
    return this.collection.findOne({ pack_id: packId, reporter_id: reporterId });
  }

  async findManyByPackId(packId: ObjectId): Promise<PackReport[]> {
    return this.collection
      .aggregate<PackReport>([
        { $match: { pack_id: packId } },
        { $sort: { created_at: -1 } },
        {
          $lookup: {
            from: "customers",
            localField: "reporter_id",
            foreignField: "_id",
            as: "reporter",
          },
        },
        {
          $addFields: {
            reporter_username: { $arrayElemAt: ["$reporter.userName", 0] },
            userName: { $arrayElemAt: ["$reporter.userName", 0] },
          },
        },
        {
          $project: {
            reporter: 0,
          },
        },
      ])
      .toArray();
  }

  async deleteManyByPackId(packId: ObjectId): Promise<number> {
    const result = await this.collection.deleteMany({ pack_id: packId });
    return result.deletedCount;
  }
}
