import {
  PackFavoriteRepository,
  StickerRepository,
  UserRepository,
} from "@/repositories";
import type {
  ClaimMissionResult,
  DailyMissionOverview,
  UserMissionProgressDto,
} from "@/models";
import { DateUtils, LevelUtils, QuotaUtils } from "@/utils";
import { MissionService } from "./mission.service";
import { ObjectId } from "mongodb";

export class DailyMissionService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly stickerRepository: StickerRepository,
    private readonly packFavoriteRepository: PackFavoriteRepository,
  ) { }


  async getDailyOverview(userId: string): Promise<DailyMissionOverview> {
    const userObjectId = new ObjectId(userId);
    const { cycleDate, cycleStart } = QuotaUtils.getCycleInfo();
    const user = await this.userRepository.find({ _id: userObjectId });
    if (!user) throw new Error("Usuário não encontrado.");


    await this.userRepository.ensureDailyCycle(userObjectId, cycleDate);


    const brasiliaDate = DateUtils.toBrasiliaDate();
    const currentWeek = DateUtils.getIsoWeekIdentifier(brasiliaDate);

    const activity = user.activity ?? {
      current_streak: 0,
      last_active_date: undefined,
      week_cycle: undefined,
      weekly_active_days: [],
    };

    const lastActive = activity.last_active_date;

    const yesterday = QuotaUtils.getCycleInfo(
      new Date(Date.now() - 24 * 60 * 60 * 1000),
    ).cycleDate;

    const newStreak = this.calculateStreak(
      lastActive,
      cycleDate,
      yesterday,
      activity.current_streak,
    );

    const weeklyActiveDays = this.resolveWeeklyActiveDays(
      activity.week_cycle,
      currentWeek,
      cycleDate,
      activity.weekly_active_days,
    );

    await this.userRepository.updateActivity(
      userObjectId,
      cycleDate,
      newStreak,
      currentWeek,
      weeklyActiveDays,
    );

    const freshUser = await this.userRepository.find({ _id: userObjectId });
    const claimedKeys =
      freshUser?.daily_missions?.cycle_date === cycleDate
        ? (freshUser.daily_missions?.claimed_keys ?? [])
        : [];

    const missions = MissionService.getMissions();
    const [stickersCount, favoritesCount] = await Promise.all([
      this.stickerRepository.countByUserSince(userObjectId, cycleStart),
      this.packFavoriteRepository.countByUserSince(userObjectId, cycleStart),
    ]);

    const missionProgress: UserMissionProgressDto[] = missions.map(
      (mission) => {
        let currentProgress = 0;
        switch (mission.metric) {
          case "app_checkin":
            currentProgress = 1;
            break;
          case "stickers_created":
            currentProgress = stickersCount;
            break;
          case "packs_favorited":
            currentProgress = favoritesCount;
            break;
        }

        const completed = currentProgress >= mission.goal;
        const claimed = claimedKeys.includes(mission.id);

        return { ...mission, current_progress: currentProgress, completed, claimed };
      },
    );

    const totalXp = freshUser?.total_xp ?? 0;
    const levelInfo = LevelUtils.getLevelFromXp(totalXp);

    return {
      cycle_date: cycleDate,
      level_info: levelInfo,
      activity: {
        current_streak: newStreak,
        weekly_active_days: weeklyActiveDays,
        week_cycle: currentWeek,
      },
      missions: missionProgress,
    };
  }

  async claimMissionReward(
    userId: string,
    missionId: string,
  ): Promise<ClaimMissionResult> {
    const userObjectId = new ObjectId(userId);
    const { cycleDate, cycleStart } = QuotaUtils.getCycleInfo();

    const mission = MissionService.getMissionById(missionId);
    if (!mission) throw new Error("Missão não encontrada.");

    let currentProgress = 0;
    switch (mission.metric) {
      case "app_checkin":
        currentProgress = 1;
        break;
      case "stickers_created":
        currentProgress = await this.stickerRepository.countByUserSince(
          userObjectId,
          cycleStart,
        );
        break;
      case "packs_favorited":
        currentProgress = await this.packFavoriteRepository.countByUserSince(
          userObjectId,
          cycleStart,
        );
        break;
    }

    if (currentProgress < mission.goal) {
      throw new Error("Missão ainda não foi concluída.");
    }

    const updatedUser = await this.userRepository.claimDailyMission(
      userObjectId,
      cycleDate,
      missionId,
      mission.reward.xp,
      mission.reward.petals,
    );

    if (!updatedUser) {
      throw new Error("Recompensa já foi resgatada ou ciclo expirou.");
    }

    const levelInfo = LevelUtils.getLevelFromXp(updatedUser.total_xp ?? 0);

    return {
      petals_balance: updatedUser.petals_balance,
      total_xp: updatedUser.total_xp ?? 0,
      level_info: levelInfo,
    };
  }

  private calculateStreak(
    lastActive: string | undefined,
    cycleDate: string,
    yesterday: string,
    currentStreak: number,
  ): number {
    switch (lastActive) {
      case cycleDate:
        return currentStreak;
      case yesterday:
        return currentStreak + 1;
      default:
        return 1;
    }
  }

  private resolveWeeklyActiveDays(
    weekCycle: string | undefined,
    currentWeek: string,
    cycleDate: string,
    weeklyActiveDays: string[],
  ): string[] {
    if (weekCycle !== currentWeek) return [cycleDate];
    if (weeklyActiveDays.includes(cycleDate)) return weeklyActiveDays;
    return [...weeklyActiveDays, cycleDate];
  }
}
