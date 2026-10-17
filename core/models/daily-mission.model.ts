import { dailyMissionSchema } from "@/schemas";
import { z } from "zod";

export type DailyMission = z.infer<typeof dailyMissionSchema>;
