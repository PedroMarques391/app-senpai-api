export class VerifyOwnershipError extends Error {
  readonly statusCode = 403;
  readonly code = "VERIFY_OWNERSHIP_ERROR";

  constructor(
    message = "Operação não permitida: você não é o proprietário deste recurso",
  ) {
    super(message);
    this.name = "VerifyOwnershipError";
  }
}
