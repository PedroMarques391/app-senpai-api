import type { ReportReason } from "@/schemas";

export const REPORT_THRESHOLD_TO_HIDE = 3;
export const MAX_STRIKES = 3;

export const CRITICAL_REPORT_REASONS: readonly ReportReason[] = [
  "child_exploitation",
  "adult_content",
] as const;

export interface ReportReasonInfo {
  label: string;
  description: string;
  isCritical: boolean;
}

export const REPORT_REASONS_DICTIONARY: Record<ReportReason, ReportReasonInfo> = {
  child_exploitation: {
    label: "Exploração ou abuso de menores",
    description: "Conteúdo envolvendo menores de idade. Prioridade crítica de segurança.",
    isCritical: true,
  },
  adult_content: {
    label: "Conteúdo adulto ou sexual (+18)",
    description: "Nudez explícita, pornografia ou atos sexuais.",
    isCritical: true,
  },
  violence_gore: {
    label: "Violência extrema ou gore",
    description: "Imagens com mutilação, ferimentos graves ou crueldade.",
    isCritical: false,
  },
  hate_speech: {
    label: "Discurso de ódio ou preconceito",
    description: "Ataques motivados por raça, etnia, gênero, religião ou orientação sexual.",
    isCritical: false,
  },
  harassment: {
    label: "Assédio ou perseguição",
    description: "Exposição não consensual, humilhação ou intimidação direcionada.",
    isCritical: false,
  },
  copyright: {
    label: "Violação de direitos autorais",
    description: "Uso não autorizado de marcas, artes ou direitos de imagem de terceiros.",
    isCritical: false,
  },
  spam_misleading: {
    label: "Spam ou conteúdo enganoso",
    description: "Divulgação de golpes, fraudes ou propaganda excessiva e irrelevante.",
    isCritical: false,
  },
  other: {
    label: "Outro motivo",
    description: "Violação das Diretrizes da Comunidade não listada acima.",
    isCritical: false,
  },
};
