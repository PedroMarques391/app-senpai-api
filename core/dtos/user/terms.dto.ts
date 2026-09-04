import { z } from "zod";

export const termsDtoSchema = z
  .object({
    termsAccepted: z.boolean().optional(),
    termsVersion: z.string().optional(),
    privacyAcknowledged: z.boolean().optional(),
    privacyVersion: z.string().optional(),
    legalAcceptedAt: z.string().optional(),
  })
  .optional();

export type TermsDto = z.infer<typeof termsDtoSchema>;
