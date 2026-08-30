import type { ActiveContentParams, ContentFilterOptions } from "@/dtos";
import type { Content } from "@/schemas";
import type { PaginationOptions, RepositoryPaginatedResult } from "@/types";
import type { ObjectId } from "mongodb";
import type { CreateContentPayload } from "./content.model";

export interface ContentRepository {
  findById(id: ObjectId): Promise<Content | null>;
  findActive(params: ActiveContentParams): Promise<Content[]>;
  findAll(
    filters: ContentFilterOptions,
    pagination: PaginationOptions,
  ): Promise<RepositoryPaginatedResult<Content>>;
  create(
    createdBy: ObjectId,
    content: CreateContentPayload,
  ): Promise<Content | null>;
  update(id: ObjectId, content: Partial<Content>): Promise<Content | null>;
  delete(id: ObjectId): Promise<boolean>;
}
