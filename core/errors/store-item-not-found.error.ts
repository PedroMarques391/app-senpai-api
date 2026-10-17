import { AppError } from "./app.error";

export class StoreItemNotFoundError extends AppError {
  constructor(message = "Item da loja não encontrado") {
    super(message, 404, "STORE_ITEM_NOT_FOUND");
    this.name = "StoreItemNotFoundError";
  }
}
