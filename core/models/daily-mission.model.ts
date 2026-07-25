import { dailyMissionSchema } from "core/schemas";
import { z } from "zod";

export type DailyMission = z.infer<typeof dailyMissionSchema>;
