import { MAX_STICKERS_PER_PACK, MIN_STICKERS_PER_PACK } from "@/constants";

export type PackRuleViolation = "min" | "max" | "type_mismatch";

export class PackRulesError extends Error {
  readonly statusCode = 400;
  readonly code: string;

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
        resolvedMessage = message;
        resolvedCode = message ?? "PACK_RULES_ERROR";
        break;
    }

    super(resolvedMessage);
    this.name = "PackRulesError";
    this.code = resolvedCode;
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
