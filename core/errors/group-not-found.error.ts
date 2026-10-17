import { AppError } from "./app.error";

export class GroupNotFoundError extends AppError {
  constructor(message = "Grupo não encontrado") {
    super(message, 404, "GROUP_NOT_FOUND");
    this.name = "GroupNotFoundError";
  }
}
