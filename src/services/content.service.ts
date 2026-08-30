import type {
  CreateAnnouncementDto,
  CreateBannerDto,
  CreateNotificationDto,
} from "@/dtos";
import type { ContentRepository } from "@/models";
import { MongoUtils } from "@/utils";

export class ContentService {
  constructor(private readonly contentRepository: ContentRepository) {}

  async createBanner(adminId: string, data: CreateBannerDto) {
    const adminIdToObject = MongoUtils.toObjectId(
      adminId,
      "ID de usuário inválido",
    );
    return this.contentRepository.create(adminIdToObject, data);
  }

  async createNotification(adminId: string, data: CreateNotificationDto) {
    const adminIdToObject = MongoUtils.toObjectId(
      adminId,
      "ID de usuário inválido",
    );
    return this.contentRepository.create(adminIdToObject, data);
  }

  async createAnnouncement(adminId: string, data: CreateAnnouncementDto) {
    const adminIdToObject = MongoUtils.toObjectId(
      adminId,
      "ID de usuário inválido",
    );
    return this.contentRepository.create(adminIdToObject, data);
  }
}
