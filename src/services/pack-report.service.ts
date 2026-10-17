import {
  AUTO_PENDING_REPORT_REASONS,
  CRITICAL_REPORT_REASONS,
  EMAIL_REPLY_TO,
  EMAIL_SENDERS,
  MAX_STRIKES,
  MODERATOR_EMAIL,
  REPORT_REASONS_DICTIONARY,
  REPORT_THRESHOLD_TO_HIDE,
} from "@/constants";
import type {
  ListPacksAdminQueryDto,
  ModeratePackDto,
  PackRepositoryOptions,
  ReportPackBodyDto,
} from "@/dtos";
import {
  CannotReportOwnPackError,
  DuplicateReportError,
  ModerationActionForbiddenError,
  PackModerationConflictError,
  PackNotFoundError,
} from "@/errors";
import type {
  PackModerationAction,
  PackModerationStatus,
  PackReport,
  StickerPack,
  User,
} from "@/models";
import type {
  PackFavoriteRepository,
  PackModerationLogRepository,
  PackReportRepository,
  PackRepository,
  StickerRepository,
  UserRepository,
} from "@/repositories";
import {
  renderModerationOutcomeEmailTemplate,
  renderModerationOutcomeText,
  renderModerationPackReportTemplate,
  renderPackSecurityWarningTemplate,
  type ModerationOutcomeTemplateProps,
} from "@/templates";
import type { PaginatedResult, PaginationOptions } from "@/types";
import { MongoUtils, PackModerationUtils } from "@/utils";
import type { CacheService } from "./cache.service";
import type { MailService } from "./mail.service";
import type { PackService } from "./pack.service";

export interface ModeratePackResult {
  pack: StickerPack | null;
  action: PackModerationAction;
  deleted?: boolean;
}

export class PackReportService {
  constructor(
    private readonly packReportRepository: PackReportRepository,
    private readonly packRepository: PackRepository,
    private readonly userRepository: UserRepository,
    private readonly mailService: MailService,
    private readonly cacheService: CacheService,
    private readonly packModerationLogRepository?: PackModerationLogRepository,
    private readonly stickerRepository?: StickerRepository,
    private readonly packService?: PackService,
    private readonly packFavoriteRepository?: PackFavoriteRepository,
  ) {}

  async reportPack(
    packId: string,
    reporterUserId: string,
    payload: ReportPackBodyDto,
  ): Promise<{ success: boolean; message: string; packId: string }> {
    const packObjectId = MongoUtils.toObjectId(packId, "ID do pacote inválido");
    const reporterObjectId = MongoUtils.toObjectId(
      reporterUserId,
      "ID do usuário inválido",
    );

    const pack = await this.packRepository.findById(packObjectId);
    if (!pack) {
      throw new PackNotFoundError();
    }

    if (pack.user_id.equals(reporterObjectId)) {
      throw new CannotReportOwnPackError();
    }

    const existingReport =
      await this.packReportRepository.findByPackAndReporter(
        packObjectId,
        reporterObjectId,
      );
    if (existingReport) {
      throw new DuplicateReportError();
    }

    await this.packReportRepository.create({
      pack_id: packObjectId,
      reporter_id: reporterObjectId,
      reason: payload.reason,
      description: payload.description,
      created_at: new Date(),
    });

    const isCritical = CRITICAL_REPORT_REASONS.includes(payload.reason);
    const isAutoPending = AUTO_PENDING_REPORT_REASONS.includes(payload.reason);
    const newReportsCount = pack.reports_count + 1;
    const shouldHide =
      (isCritical ||
        isAutoPending ||
        newReportsCount >= REPORT_THRESHOLD_TO_HIDE) &&
      pack.moderation_status !== "banned";

    const previousPack = await this.packRepository.incrementReportsCount(
      packObjectId,
      shouldHide,
    );

    await Promise.all([
      this.cacheService.del(`pack:${packId}`),
      this.cacheService.del(`pack:user:${pack.user_id}`),
      this.cacheService.delPattern("pack:list:*"),
    ]);

    const [owner, reporter] = await Promise.all([
      this.userRepository.find({ _id: pack.user_id }),
      this.userRepository.find({ _id: reporterObjectId }),
    ]);

    const reasonInfo = REPORT_REASONS_DICTIONARY[payload.reason] ?? {
      label: payload.reason,
      description: "Infração reportada",
      isCritical,
    };

    const actionTaken = shouldHide
      ? "Pacote ocultado da visualização pública (is_public: false) e aguardando moderação."
      : `Denúncia registrada. Pacote mantido público enquanto não atinge o limiar de ${REPORT_THRESHOLD_TO_HIDE} denúncias.`;

    const nowFormatted = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "America/Sao_Paulo",
    }).format(new Date());

    const moderatorEmail = MODERATOR_EMAIL;

    const moderatorHtml = renderModerationPackReportTemplate({
      packName: pack.pack_name,
      packId: pack._id.toString(),
      publisher: pack.publisher,
      stickersCount: pack.stickers_count,
      reportsCount: newReportsCount,
      ownerName: owner?.name ?? "Criador Desconhecido",
      ownerUsername: owner?.userName ?? "sem_username",
      ownerWaId: owner?.wa_id ?? "N/A",
      ownerEmail: owner?.email,
      reasonLabel: reasonInfo.label,
      reasonDescription: reasonInfo.description,
      isCritical,
      reporterUsername: reporter?.userName ?? "denunciante",
      reporterId: reporterObjectId.toString(),
      description: payload.description,
      reportedAtFormatted: nowFormatted,
      actionTaken,
    });

    await this.mailService.sendMail({
      from: EMAIL_SENDERS.SECURITY,
      to: moderatorEmail,
      subject: `[Moderação] Pack Denunciado: "${pack.pack_name}"`,
      html: moderatorHtml,
    });

    const wasJustHidden = previousPack?.is_public === true && shouldHide;
    if (wasJustHidden && owner?.email) {
      const ownerHtml = renderPackSecurityWarningTemplate({
        ownerName: owner.name ?? "Criador",
        packName: pack.pack_name,
        reasonLabel: reasonInfo.label,
        supportEmail: EMAIL_REPLY_TO,
      });

      await this.mailService.sendMail({
        from: EMAIL_SENDERS.SECURITY,
        to: owner.email,
        subject: `Aviso de Segurança: Seu pacote "${pack.pack_name}" foi ocultado`,
        html: ownerHtml,
      });
    }

    return {
      success: true,
      message:
        "Denúncia registrada com sucesso. O pacote foi encaminhado para análise da moderação.",
      packId,
    };
  }

  async findManyPacksForModeration(
    options: ListPacksAdminQueryDto,
  ): Promise<PaginatedResult<StickerPack>> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    const moderationStatus: PackModerationStatus | PackModerationStatus[] =
      options.status ?? ["pending", "banned", "restricted"];

    const repositoryOptions: PackRepositoryOptions = {
      moderation_status: moderationStatus,
      search: options.search,
      sort: "recent",
      order: "desc",
    };

    const { data, total } = await this.packRepository.findAll(
      repositoryOptions,
      { page, limit },
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findManyReports(
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<PackReport>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const { data, total } = await this.packReportRepository.findAll({
      page,
      limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findPackWithReports(
    packId: string,
  ): Promise<{ pack: StickerPack; reports: PackReport[] }> {
    const packObjectId = MongoUtils.toObjectId(packId, "ID do pacote inválido");
    const pack = await this.packRepository.findById(packObjectId);
    if (!pack) {
      throw new PackNotFoundError();
    }

    const reports =
      await this.packReportRepository.findManyByPackId(packObjectId);
    return { pack, reports };
  }

  async moderatePack(
    packId: string,
    data: ModeratePackDto,
    actorUser?: { _id: string; userName: string; role: string },
  ): Promise<ModeratePackResult> {
    const packObjectId = MongoUtils.toObjectId(packId, "ID do pacote inválido");
    const action = data.action;

    if (PackModerationUtils.isDeleteAction(action)) {
      if (actorUser && actorUser.role !== "admin") {
        throw new ModerationActionForbiddenError(
          "Apenas administradores podem excluir pacotes.",
        );
      }
    }

    const currentPack = await this.packRepository.findById(packObjectId);
    if (!currentPack) {
      throw new PackNotFoundError();
    }

    const currentStatus = currentPack.moderation_status;


    const existingReports =
      await this.packReportRepository.findManyByPackId(packObjectId);

    const shouldStrike = PackModerationUtils.shouldApplyStrike(
      currentStatus,
      action,
    );

    let owner: User | null = null;
    let updatedUser: User | null = null;

    if (shouldStrike) {
      owner = await this.userRepository.find({ _id: currentPack.user_id });
      updatedUser = await this.userRepository.incrementStrikes(
        currentPack.user_id,
      );
    } else {
      owner = await this.userRepository.find({ _id: currentPack.user_id });
    }

    const isDelete = PackModerationUtils.isDeleteAction(action);

    if (isDelete) {
      const stickers = this.stickerRepository
        ? await this.stickerRepository.findByPackId(packObjectId)
        : [];

      const deleted = await this.packRepository.deleteByModerationStatus(
        packObjectId,
        currentStatus,
      );

      if (!deleted) {
        throw new PackModerationConflictError();
      }

      let cloudinaryIds: string[] = [];
      if (this.packService) {
        cloudinaryIds = await this.packService.releasePackResources(
          currentPack.user_id,
          stickers,
        );
      }

      if (this.packFavoriteRepository) {
        await this.packFavoriteRepository.deleteManyByPackId(packObjectId);
      }

      await this.packReportRepository.deleteManyByPackId(packObjectId);

      await Promise.all([
        this.cacheService.del(`pack:${packId}`),
        this.cacheService.del(`pack:user:${currentPack.user_id}`),
        this.cacheService.del(`profile:${currentPack.user_id}`),
        this.cacheService.delPattern("pack:list:*"),
        this.cacheService.delPattern(`stickers:pack:${packId}*`),
      ]);

      if (this.packModerationLogRepository && actorUser) {
        await this.packModerationLogRepository.create({
          pack_id: packObjectId,
          pack_name: currentPack.pack_name,
          owner_id: currentPack.user_id,
          action,
          previous_status: currentStatus,
          new_status: "deleted",
          reason: data.reason,
          notes: data.notes,
          strike_applied: shouldStrike,
          owner_strikes_after: updatedUser?.strikes,
          reports_count: currentPack.reports_count,
          report_reasons: existingReports.map((r) => r.reason),
          stickers_count: stickers.length,
          cloudinary_ids: cloudinaryIds,
          moderator_id: MongoUtils.toObjectId(
            actorUser._id,
            "ID do moderador inválido",
          ),
          moderator_username: actorUser.userName,
          created_at: new Date(),
        });
      }

      if (action === "DELETE_WITH_STRIKE" && owner) {
        await this.sendDeleteWithStrikeEmail(
          currentPack,
          owner,
          updatedUser,
          existingReports,
          data.notes,
        );
      }

      return { pack: null, action, deleted: true };
    }

    const targetStatus = PackModerationUtils.resolveTargetStatus(action)!;
    const isPublic = targetStatus === "approved";
    const resetReports = data.reset_reports ?? true;

    const previousPack = await this.packRepository.updateModerationStatus(
      packObjectId,
      currentStatus,
      targetStatus,
      isPublic,
      resetReports,
    );

    if (!previousPack) {
      throw new PackModerationConflictError();
    }

    if (resetReports) {
      await this.packReportRepository.deleteManyByPackId(packObjectId);
    }

    await Promise.all([
      this.cacheService.del(`pack:${packId}`),
      this.cacheService.del(`pack:user:${previousPack.user_id}`),
      this.cacheService.del(`profile:${previousPack.user_id}`),
      this.cacheService.delPattern("pack:list:*"),
    ]);

    if (this.packModerationLogRepository && actorUser) {
      await this.packModerationLogRepository.create({
        pack_id: packObjectId,
        pack_name: currentPack.pack_name,
        owner_id: currentPack.user_id,
        action,
        previous_status: currentStatus,
        new_status: targetStatus,
        reason: data.reason,
        notes: data.notes,
        strike_applied: shouldStrike,
        owner_strikes_after: updatedUser?.strikes,
        reports_count: currentPack.reports_count,
        report_reasons: existingReports.map((r) => r.reason),
        stickers_count: currentPack.stickers_count,
        cloudinary_ids: [],
        moderator_id: MongoUtils.toObjectId(
          actorUser._id,
          "ID do moderador inválido",
        ),
        moderator_username: actorUser.userName,
        created_at: new Date(),
      });
    }

    if (action === "BAN" && owner) {
      await this.sendBanEmail(
        currentPack,
        owner,
        updatedUser,
        existingReports,
        data.notes,
      );
    } else if (action === "APPROVE" && owner) {
      await this.sendApprovalEmail(currentPack, owner, data.notes);
    } else if (action === "RESTRICT" && owner) {
      await this.sendRestrictedEmail(
        currentPack,
        owner,
        existingReports,
        data.notes,
      );
    }

    const updated: StickerPack = {
      ...previousPack,
      moderation_status: targetStatus,
      is_public: isPublic,
      reports_count: resetReports ? 0 : previousPack.reports_count,
      updated_at: new Date(),
    };

    return { pack: updated, action, deleted: false };
  }

  private async sendBanEmail(
    pack: StickerPack,
    owner: User,
    updatedUser: User | null,
    reports: PackReport[],
    notes?: string,
  ): Promise<void> {
    if (!owner.email || !owner.isEmailVerified) {
      return;
    }

    const hasCrossedToRestricted =
      owner.status !== "restricted" && updatedUser?.status === "restricted";

    let eventType: ModerationOutcomeTemplateProps["eventType"] = "BANNED";
    let subject = `Notificação de Moderação: O pacote "${pack.pack_name}" foi removido da plataforma`;

    if (hasCrossedToRestricted) {
      eventType = "BANNED_AND_RESTRICTED";
      subject = `Notificação de Moderação: Pacote "${pack.pack_name}" removido e restrição de perfil aplicada`;
    }

    const reasonInfo = this.resolveReportReason(reports);
    const currentStrikes = updatedUser?.strikes ?? owner.strikes + 1;

    const templateProps: ModerationOutcomeTemplateProps = {
      eventType,
      userName: owner.name ?? "Criador",
      userHandle: owner.userName,
      packName: pack.pack_name,
      packId: pack._id.toString(),
      reasonLabel: reasonInfo.label,
      reasonDescription: reasonInfo.description,
      currentStrikes,
      maxStrikes: MAX_STRIKES,
      moderatorNotes: notes,
    };

    const html = renderModerationOutcomeEmailTemplate(templateProps);
    const text = renderModerationOutcomeText(templateProps);

    await this.mailService.sendMail({
      from: EMAIL_SENDERS.SECURITY,
      to: owner.email,
      subject,
      html,
      text,
    });
  }

  private async sendDeleteWithStrikeEmail(
    pack: StickerPack,
    owner: User,
    updatedUser: User | null,
    reports: PackReport[],
    notes?: string,
  ): Promise<void> {
    if (!owner.email || !owner.isEmailVerified) {
      return;
    }

    const hasCrossedToRestricted =
      owner.status !== "restricted" && updatedUser?.status === "restricted";

    let eventType: ModerationOutcomeTemplateProps["eventType"] =
      "PACK_DELETED_WITH_STRIKE";
    let subject = `[Senpai] Aviso de Moderação: O pacote "${pack.pack_name}" foi removido definitivamente`;

    if (hasCrossedToRestricted) {
      eventType = "PACK_DELETED_WITH_STRIKE_RESTRICTED";
      subject = `[Senpai] Pacote "${pack.pack_name}" removido definitivamente e restrição de perfil aplicada`;
    }

    const reasonInfo = this.resolveReportReason(reports);
    const currentStrikes = updatedUser?.strikes ?? owner.strikes + 1;

    const templateProps: ModerationOutcomeTemplateProps = {
      eventType,
      userName: owner.name ?? "Criador",
      userHandle: owner.userName,
      packName: pack.pack_name,
      packId: pack._id.toString(),
      reasonLabel: reasonInfo.label,
      reasonDescription: reasonInfo.description,
      currentStrikes,
      maxStrikes: MAX_STRIKES,
      moderatorNotes: notes,
    };

    const html = renderModerationOutcomeEmailTemplate(templateProps);
    const text = renderModerationOutcomeText(templateProps);

    await this.mailService.sendMail({
      from: EMAIL_SENDERS.SECURITY,
      to: owner.email,
      subject,
      html,
      text,
    });
  }

  private async sendRestrictedEmail(
    pack: StickerPack,
    owner: User,
    reports: PackReport[],
    notes?: string,
  ): Promise<void> {
    if (!owner.email || !owner.isEmailVerified) {
      return;
    }

    const reasonInfo = this.resolveReportReason(reports);

    const templateProps: ModerationOutcomeTemplateProps = {
      eventType: "PACK_RESTRICTED",
      userName: owner.name ?? "Criador",
      userHandle: owner.userName,
      packName: pack.pack_name,
      packId: pack._id.toString(),
      reasonLabel: reasonInfo.label,
      reasonDescription: reasonInfo.description,
      moderatorNotes: notes,
    };

    const html = renderModerationOutcomeEmailTemplate(templateProps);
    const text = renderModerationOutcomeText(templateProps);

    await this.mailService.sendMail({
      from: EMAIL_SENDERS.SECURITY,
      to: owner.email,
      subject: `[Senpai] Atualização importante sobre o pacote "${pack.pack_name}"`,
      html,
      text,
    });
  }

  private async sendApprovalEmail(
    pack: StickerPack,
    owner: User,
    notes?: string,
  ): Promise<void> {
    if (!owner.email || !owner.isEmailVerified) {
      return;
    }

    const templateProps: ModerationOutcomeTemplateProps = {
      eventType: "RELEASED",
      userName: owner.name ?? "Criador",
      userHandle: owner.userName,
      packName: pack.pack_name,
      packId: pack._id.toString(),
      moderatorNotes: notes,
    };

    const html = renderModerationOutcomeEmailTemplate(templateProps);
    const text = renderModerationOutcomeText(templateProps);

    await this.mailService.sendMail({
      from: EMAIL_SENDERS.SECURITY,
      to: owner.email,
      subject: `Moderação Concluída: Seu pacote "${pack.pack_name}" foi liberado`,
      html,
      text,
    });
  }

  private resolveReportReason(reports: PackReport[]) {
    const critical = reports.find((r) =>
      CRITICAL_REPORT_REASONS.includes(r.reason),
    );
    const reason = critical?.reason ?? reports[0]?.reason ?? "other";
    return REPORT_REASONS_DICTIONARY[reason] ?? REPORT_REASONS_DICTIONARY.other;
  }
}
