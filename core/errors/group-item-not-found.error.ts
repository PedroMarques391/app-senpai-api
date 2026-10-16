import { AppError } from "./app.error";

export class GroupItemNotFoundError extends AppError {
  constructor(
    message = "Item do grupo não encontrado ou removido pelo usuário.",
  ) {
    super(message, 404, "GROUP_ITEM_NOT_FOUND");
    this.name = "GroupItemNotFoundError";
  }
}
