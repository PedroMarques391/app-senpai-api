export class UploadError extends Error {
  public code: string;

  constructor(
    message: string,
    code: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "UploadError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
