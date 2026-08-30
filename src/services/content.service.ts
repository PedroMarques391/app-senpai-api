import type {
  CreateContentDto,
  GetActiveContentQueryDto,
  ListContentAdminQueryDto,
  UpdateContentDto,
} from "@/dtos";
import type { Content, ContentRepository } from "@/models";
import type { PaginatedResult } from "@/types";
import { MongoUtils } from "@/utils";

export class ContentService {
  constructor(private readonly contentRepository: ContentRepository) {}

  async create(createdBy: string, data: CreateContentDto): Promise<Content> {
    const createdByObjectId = MongoUtils.toObjectId(
      createdBy,
      "ID de usuário inválido",
    );
    const content = await this.contentRepository.create(
      createdByObjectId,
      data,
    );
    if (!content) {
      throw new Error("Falha ao criar conteúdo");
    }
    return content;
  }

  async findActive(query: GetActiveContentQueryDto): Promise<Content[]> {
    return this.contentRepository.findActive({
      now: new Date(),
      type: query.type ?? "banner",
      platform: query.platform ?? "all",
    });
  }

  async findAllAdmin(
    query: ListContentAdminQueryDto,
  ): Promise<PaginatedResult<Content>> {
    const { data, total } = await this.contentRepository.findAll(
      {
        type: query.type,
        status: query.status,
      },
      {
        page: query.page,
        limit: query.limit,
      },
    );

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 1,
    };
  }

  async findById(id: string): Promise<Content> {
    const objectId = MongoUtils.toObjectId(id, "ID de conteúdo inválido");
    const content = await this.contentRepository.findById(objectId);
    if (!content) {
      throw new Error("Conteúdo não encontrado");
    }
    return content;
  }

  async update(id: string, data: UpdateContentDto): Promise<Content> {
    const objectId = MongoUtils.toObjectId(id, "ID de conteúdo inválido");
    const existing = await this.contentRepository.findById(objectId);
    if (!existing) {
      throw new Error("Conteúdo não encontrado");
    }

    const updated = await this.contentRepository.update(objectId, data);
    if (!updated) {
      throw new Error("Falha ao atualizar conteúdo");
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const objectId = MongoUtils.toObjectId(id, "ID de conteúdo inválido");
    const existing = await this.contentRepository.findById(objectId);
    if (!existing) {
      throw new Error("Conteúdo não encontrado");
    }

    const deleted = await this.contentRepository.delete(objectId);
    if (!deleted) {
      throw new Error("Falha ao remover conteúdo");
    }
    return deleted;
  }
}
