import type { LevelInfo } from "@/models";

export class LevelUtils {
  static readonly MAX_LEVEL = 100;
  static xpForLevel(level: number): number {
    return 1000 + (level - 1) * 80;
  }

  static getLevelFromXp(totalXp: number): LevelInfo {
    let level = 1;
    let remainingXp = Math.max(0, totalXp);

    while (level < this.MAX_LEVEL) {
      const needed = this.xpForLevel(level);
      if (remainingXp < needed) break;
      remainingXp -= needed;
      level++;
    }

    const xpNeeded =
      level >= this.MAX_LEVEL ? 1 : this.xpForLevel(level);

    return {
      level,
      xpInLevel: level >= this.MAX_LEVEL ? 0 : remainingXp,
      xpNeeded,
      progress:
        level >= this.MAX_LEVEL
          ? 1
          : Number((remainingXp / xpNeeded).toFixed(4)),
    };
  }
}
