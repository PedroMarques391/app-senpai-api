import { z } from "zod";

export const dailyMissionSchema = z.object({
  mission_key: z.string(),
  title: z.string(),
  current_progress: z.number().default(0),
  target_progress: z.number(),
  reward_petals: z.number(),
  completed: z.boolean().default(false),
  claimed: z.boolean().default(false),
});
