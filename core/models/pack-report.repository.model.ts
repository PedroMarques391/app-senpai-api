import type { CreatePackReportPayload, PackReport } from "@/models";
import type { PaginationOptions, RepositoryPaginatedResult } from "@/types";
import type { ObjectId } from "mongodb";

export interface PackReportRepository {
  create(data: CreatePackReportPayload): Promise<PackReport>;
  findAll(
    pagination: PaginationOptions,
  ): Promise<RepositoryPaginatedResult<PackReport>>;
  findByPackAndReporter(
    packId: ObjectId,
    reporterId: ObjectId,
  ): Promise<PackReport | null>;
  findManyByPackId(packId: ObjectId): Promise<PackReport[]>;
  deleteManyByPackId(packId: ObjectId): Promise<number>;
}
