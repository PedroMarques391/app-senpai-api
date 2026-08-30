import type { CreateContentDto } from "@/dtos";
import type { ContentRepository } from "@/models";
import { MongoUtils } from "@/utils";

export class ContentService {
  constructor(private readonly contentRepository: ContentRepository) {}

  async create(createdBy: string, data: CreateContentDto) {
    const createdByObjectId = MongoUtils.toObjectId(
      createdBy,
      "ID de usuário inválido",
    );
    return this.contentRepository.create(createdByObjectId, data);
  }
}
