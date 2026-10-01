import { z } from "zod";

export const chatMessageDtoSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().trim().min(1, "O conteúdo da mensagem não pode ser vazio"),
});

export const chatBodyDtoSchema = z.object({
  messages: z
    .array(chatMessageDtoSchema)
    .min(1, "A lista de mensagens deve conter ao menos 1 mensagem"),
});

export type ChatMessageDto = z.infer<typeof chatMessageDtoSchema>;
export type ChatBodyDto = z.infer<typeof chatBodyDtoSchema>;

