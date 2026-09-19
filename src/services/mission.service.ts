import { STATIC_MISSIONS } from "@/constants";
import type { Mission } from "@/models";


export class MissionService {
  static getMissions(): Mission[] {
    return STATIC_MISSIONS.filter((mission) => mission.active) as Mission[];
  }

  static getMissionById(id: string): Mission | undefined {
    return STATIC_MISSIONS.find(
      (mission) => mission.id === id && mission.active,
    ) as Mission | undefined;
  }
}
