import { z } from "zod";

export const claimMissionParamsDtoSchema = z.object({
  id: z.string().trim().min(1),
});

export const claimAchievementParamsDtoSchema = z.object({
  id: z.string().trim().min(1),
});

export const syncAchievementsDtoSchema = z.object({
  achievement_ids: z.array(z.string().trim().min(1)).max(50).default([]),
});

export type ClaimMissionParamsDto = z.infer<typeof claimMissionParamsDtoSchema>;
export type ClaimAchievementParamsDto = z.infer<
  typeof claimAchievementParamsDtoSchema
>;
export type SyncAchievementsDto = z.infer<typeof syncAchievementsDtoSchema>;
