import { AppError } from "./app.error";

export class UploadError extends AppError {
  constructor(message: string, code: string, statusCode: number) {
    super(message, statusCode, code);
    this.name = "UploadError";
  }
}
