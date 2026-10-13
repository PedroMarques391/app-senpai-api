import { AppError } from "./app.error";

export class PackNotFoundError extends AppError {
  constructor(message = "Pacote não encontrado") {
    super(message, 404, "PACK_NOT_FOUND");
    this.name = "PackNotFoundError";
  }
}
