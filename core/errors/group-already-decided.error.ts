import { AppError } from "./app.error";

export class GroupAlreadyDecidedError extends AppError {
  constructor(
    message = "Esta solicitação de grupo já foi analisada por outro moderador.",
  ) {
    super(message, 409, "GROUP_ALREADY_DECIDED");
    this.name = "GroupAlreadyDecidedError";
  }
}
