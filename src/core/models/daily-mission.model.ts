import { z } from "zod";
import { dailyMissionSchema } from "@core/schemas";

export type DailyMission = z.infer<typeof dailyMissionSchema>;
