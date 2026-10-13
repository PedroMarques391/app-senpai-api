import { MAX_STICKERS_PER_PACK, MIN_STICKERS_PER_PACK } from "@/constants";
import { AppError } from "./app.error";

export type PackRuleViolation = "min" | "max" | "type_mismatch";

export class PackRulesError extends AppError {
  constructor(type: PackRuleViolation, message?: string) {
    let resolvedMessage: string;
    let resolvedCode: string;

    switch (type) {
      case "min":
        resolvedMessage =
          message ??
          `Um pack precisa ter no mínimo ${MIN_STICKERS_PER_PACK} figurinhas. Para remover o conteúdo, exclua o pack inteiro.`;
        resolvedCode = "PACK_MIN_STICKERS";
        break;
      case "max":
        resolvedMessage =
          message ??
          `Um pacote pode conter no máximo ${MAX_STICKERS_PER_PACK} figurinhas.`;
        resolvedCode = "PACK_MAX_STICKERS";
        break;
      case "type_mismatch":
        resolvedMessage =
          message ??
          "Um pack não pode misturar figurinhas animadas e estáticas.";
        resolvedCode = "PACK_TYPE_MISMATCH";
        break;
      default:
        resolvedMessage = message ?? "Erro de validação do pack";
        resolvedCode = "PACK_RULES_ERROR";
        break;
    }

    super(resolvedMessage, 400, resolvedCode);
    this.name = "PackRulesError";
  }

  static min(message?: string): PackRulesError {
    return new PackRulesError("min", message);
  }

  static max(message?: string): PackRulesError {
    return new PackRulesError("max", message);
  }

  static typeMismatch(message?: string): PackRulesError {
    return new PackRulesError("type_mismatch", message);
  }
}
