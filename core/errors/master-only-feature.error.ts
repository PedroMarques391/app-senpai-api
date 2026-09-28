export class MasterOnlyFeatureError extends Error {
  readonly statusCode = 403;
  readonly code = "MESTRE_ONLY_FEATURE";

  constructor(
    message = "A funcionalidade de grupos é exclusiva para usuários com plano VIP Mestre.",
  ) {
    super(message);
    this.name = "MasterOnlyFeatureError";
  }
}
