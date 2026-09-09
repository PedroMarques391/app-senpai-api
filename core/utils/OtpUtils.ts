export class OtpUtils {
  static generate(length: number = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  static generateExpiresAt(minutes: number = 5): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  static getRemainingCooldown(
    createdAt: number,
    cooldownSeconds: number = 60,
  ): number {
    const timeSinceCreation = Date.now() - createdAt;
    const cooldownMs = cooldownSeconds * 1000;

    if (timeSinceCreation < cooldownMs) {
      return Math.ceil((cooldownMs - timeSinceCreation) / 1000);
    }

    return 0;
  }
}
