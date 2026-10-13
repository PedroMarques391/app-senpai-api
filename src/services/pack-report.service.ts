import {
  CRITICAL_REPORT_REASONS,
  EMAIL_REPLY_TO,
  EMAIL_SENDERS,
  MAX_STRIKES,
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
  PackNotFoundError,
} from "@/errors";
import type {
  PackModerationStatus,
  PackReport,
  StickerPack,
  User,
} from "@/models";
import type {
  PackReportRepository,
  PackRepository,
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
import { MongoUtils } from "@/utils";
import type { CacheService } from "./cache.service";
import type { MailService } from "./mail.service";

export class PackReportService {
  constructor(
    private readonly packReportRepository: PackReportRepository,
    private readonly packRepository: PackRepository,
    private readonly userRepository: UserRepository,
    private readonly mailService: MailService,
    private readonly cacheService: CacheService,
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
    const newReportsCount = pack.reports_count + 1;
    const shouldHide =
      isCritical || newReportsCount >= REPORT_THRESHOLD_TO_HIDE;

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

    const moderatorEmail =
      process.env.MODERATOR_EMAIL ||
      EMAIL_REPLY_TO ||
      "botdosenpaicontato@gmail.com";

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
      options.status ?? ["pending", "banned"];

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
  ): Promise<StickerPack> {
    const packObjectId = MongoUtils.toObjectId(packId, "ID do pacote inválido");
    const isPublic = data.status === "approved";
    const resetReports = data.reset_reports ?? true;

    const existingReports =
      await this.packReportRepository.findManyByPackId(packObjectId);

    const previousPack = await this.packRepository.updateModerationStatus(
      packObjectId,
      data.status,
      isPublic,
      resetReports,
    );

    if (!previousPack) {
      throw new PackNotFoundError();
    }

    const isNewBan =
      previousPack.moderation_status !== "banned" && data.status === "banned";
    const isNewApproval =
      previousPack.moderation_status !== "approved" &&
      data.status === "approved";

    let owner: User | null = null;
    let updatedUser: User | null = null;

    if (isNewBan) {
      owner = await this.userRepository.find({ _id: previousPack.user_id });
      updatedUser = await this.userRepository.incrementStrikes(
        previousPack.user_id,
      );
    }
    if (isNewApproval) {
      owner = await this.userRepository.find({ _id: previousPack.user_id });
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

    if (isNewBan && owner) {
      await this.sendBanEmail(
        previousPack,
        owner,
        updatedUser,
        existingReports,
        data.notes,
      );
    }

    if (isNewApproval && owner) {
      await this.sendApprovalEmail(previousPack, owner, data.notes);
    }

    const updated: StickerPack = {
      ...previousPack,
      moderation_status: data.status,
      is_public: isPublic,
      reports_count: resetReports ? 0 : previousPack.reports_count,
      updated_at: new Date(),
    };

    return updated;
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

    await this.mailService.sendMail(
      {
        from: EMAIL_SENDERS.SECURITY,
        to: owner.email,
        subject,
        html,
        text,
      },
      {
        jobId: `email:pack-banned:${pack._id.toString()}:${Date.now()}`,
      },
    );
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

    await this.mailService.sendMail(
      {
        from: EMAIL_SENDERS.SECURITY,
        to: owner.email,
        subject: `Moderação Concluída: Seu pacote "${pack.pack_name}" foi liberado`,
        html,
        text,
      },
      {
        jobId: `email:pack-released:${pack._id.toString()}:${Date.now()}`,
      },
    );
  }

  private resolveReportReason(reports: PackReport[]) {
    const critical = reports.find((r) =>
      CRITICAL_REPORT_REASONS.includes(r.reason),
    );
    const reason = critical?.reason ?? reports[0]?.reason ?? "other";
    return REPORT_REASONS_DICTIONARY[reason] ?? REPORT_REASONS_DICTIONARY.other;
  }
}
