import { AppError } from "./app.error";

export class ItemAlreadyOwnedError extends AppError {
  constructor(message = "Você já comprou este item anteriormente.") {
    super(message, 400, "ITEM_ALREADY_OWNED");
    this.name = "ItemAlreadyOwnedError";
  }
}
