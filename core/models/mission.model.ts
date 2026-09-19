export type MissionMetric =
  | "app_checkin"
  | "stickers_created"
  | "packs_favorited";

export interface MissionReward {
  xp: number;
  petals: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  goal: number;
  metric: MissionMetric;
  reward: MissionReward;
  active: boolean;
}

export interface UserMissionProgressDto extends Mission {
  current_progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface LevelInfo {
  level: number;
  xpInLevel: number;
  xpNeeded: number;
  progress: number;
}

export interface DailyMissionOverview {
  cycle_date: string;
  level_info: LevelInfo;
  activity: {
    current_streak: number;
    weekly_active_days: string[];
    week_cycle: string;
  };
  missions: UserMissionProgressDto[];
}

export interface ClaimMissionResult {
  petals_balance: number;
  total_xp: number;
  level_info: LevelInfo;
}
