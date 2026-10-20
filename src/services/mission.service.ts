import { STATIC_ACHIEVEMENTS, STATIC_MISSIONS } from "@/constants";
import type { Achievement, Mission, MissionMetric } from "@/models";
import { DateUtils } from "@/utils";

const ROTATING_METRICS: readonly MissionMetric[] = [
  "app_checkin",
  "stickers_created",
  "packs_favorited",
];

export class MissionService {
  static getMissions(cycleDate?: string): Mission[] {
    const activeMissions = STATIC_MISSIONS.filter(
      (mission) => mission.active,
    ) as Mission[];

    if (!cycleDate) {
      return activeMissions;
    }

    const dayIndex = DateUtils.resolveCycleIndex(cycleDate);
    const selected: Mission[] = [];

    for (const metric of ROTATING_METRICS) {
      const bucket = activeMissions.filter(
        (mission) => mission.metric === metric,
      );
      if (bucket.length === 0) continue;
      const index = ((dayIndex % bucket.length) + bucket.length) % bucket.length;
      const picked = bucket[index];
      if (picked) {
        selected.push(picked);
      }
    }

    return selected;
  }

  static getMissionById(id: string): Mission | undefined {
    return STATIC_MISSIONS.find(
      (mission) => mission.id === id && mission.active,
    ) as Mission | undefined;
  }

  static getAchievements(): Achievement[] {
    return STATIC_ACHIEVEMENTS.filter(
      (achievement) => achievement.active,
    ) as Achievement[];
  }

  static getAchievementById(id: string): Achievement | undefined {
    const normalizedId = id.trim();
    return STATIC_ACHIEVEMENTS.find(
      (achievement) => achievement.id === normalizedId && achievement.active,
    ) as Achievement | undefined;
  }
}
