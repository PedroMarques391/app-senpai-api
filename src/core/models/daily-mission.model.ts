import { z } from "zod";
import { dailyMissionSchema } from "../schemas";

export type DailyMission = z.infer<typeof dailyMissionSchema>;
