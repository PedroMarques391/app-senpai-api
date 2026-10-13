export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(
    message: string,
    statusCode = 400,
    code = "BAD_REQUEST",
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }

  static badRequest(message: string, code = "BAD_REQUEST"): AppError {
    return new AppError(message, 400, code);
  }

  static unauthorized(message = "Não autorizado", code = "UNAUTHORIZED"): AppError {
    return new AppError(message, 401, code);
  }

  static forbidden(message = "Acesso negado", code = "FORBIDDEN"): AppError {
    return new AppError(message, 403, code);
  }

  static notFound(message = "Recurso não encontrado", code = "NOT_FOUND"): AppError {
    return new AppError(message, 404, code);
  }

  static conflict(message: string, code = "CONFLICT"): AppError {
    return new AppError(message, 409, code);
  }

  static internal(
    message = "Erro interno do servidor",
    code = "INTERNAL_SERVER_ERROR",
  ): AppError {
    return new AppError(message, 500, code);
  }
}
