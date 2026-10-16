import type { User } from "@/models";

export type SeedUserData = Omit<
  User,
  | "_id"
  | "password"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "last_login"
  | "storage_used_bytes"
  | "total_xp"
  | "strikes"
  | "stickers_count"
  | "activity"
  | "achievements"
> & {
  anime?: string;
  gender?: "female" | "male";
};

export const ANIME_USERS_DATA: SeedUserData[] = [
  {
    wa_id: "5511999990001",
    name: "Frieren",
    userName: "frieren",
    email: "frieren@senpai.app",
    bio: "Maga elfa colecionando feitiços comuns e flores de lótus azul há mais de mil anos.",
    gender: "female",
    anime: "Frieren: Beyond Journey's End",
    role: "senpai",
    status: "active",
    premium: true,
    isEmailVerified: true,
    isNumberVerified: true,
    isVerifiedCreator: true,
    termsAccepted: true,
    petals_balance: 10000,
    avatar_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400",
    equipped_cosmetics: {
      card_style: "card_style_sakura",
      effect: "effect_sakura_real",
      background: "background_sakura",
    },
    subscription: {
      type: "MESTRE",
      plan: "VIP_MESTRE",
    },
  },
  {
    wa_id: "5511999990002",
    name: "Makima",
    userName: "makima",
    email: "makima@senpai.app",
    bio: "Líder da Divisão Especial de Segurança Pública. Apenas cães obedientes por aqui.",
    gender: "female",
    anime: "Chainsaw Man",
    role: "admin",
    status: "active",
    premium: true,
    isEmailVerified: true,
    isNumberVerified: true,
    isVerifiedCreator: true,
    termsAccepted: true,
    petals_balance: 15000,
    avatar_url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400",
    equipped_cosmetics: {
      card_style: "card_style_neon",
      effect: "effect_hearts",
      background: "background_neon",
    },
    subscription: {
      type: "MESTRE",
      plan: "VIP_MESTRE",
    },
  },
  {
    wa_id: "5511999990003",
    name: "Yor Forger",
    userName: "yor_forger",
    email: "yor.forger@senpai.app",
    bio: "Funcionária da prefeitura de Berlint e mãe da Anya. Cuidado com o abraço forte.",
    gender: "female",
    anime: "Spy x Family",
    role: "verified_creator",
    status: "active",
    premium: true,
    isEmailVerified: true,
    isNumberVerified: true,
    isVerifiedCreator: true,
    termsAccepted: true,
    petals_balance: 6000,
    avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
    equipped_cosmetics: {
      card_style: "card_style_coracoes_brilhantes",
      effect: "effect_glow",
      background: "background_default",
    },
    subscription: {
      type: "PRO",
      plan: "VIP_PRO",
    },
  },
  {
    wa_id: "5511999990004",
    name: "Satoru Gojo",
    userName: "gojo_satoru",
    email: "gojo.satoru@senpai.app",
    bio: "O feiticeiro jujutsu mais forte. Entre o céu e a terra, eu sou o único honrado.",
    gender: "male",
    anime: "Jujutsu Kaisen",
    role: "admin",
    status: "active",
    premium: true,
    isEmailVerified: true,
    isNumberVerified: true,
    isVerifiedCreator: true,
    termsAccepted: true,
    petals_balance: 50000,
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    equipped_cosmetics: {
      card_style: "card_style_cyberpunk",
      effect: "effect_aurora",
      background: "background_cyberpunk",
    },
    subscription: {
      type: "MESTRE",
      plan: "VIP_MESTRE",
    },
  },
  {
    wa_id: "5511999990005",
    name: "Roronoa Zoro",
    userName: "roronoa_zoro",
    email: "zoro@senpai.app",
    bio: "Espadachim dos Mugiwaras. Alguém sabe onde fica a saída desse perfil?",
    gender: "male",
    anime: "One Piece",
    role: "user",
    status: "active",
    premium: false,
    isEmailVerified: true,
    isNumberVerified: true,
    isVerifiedCreator: false,
    termsAccepted: true,
    petals_balance: 1500,
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
    equipped_cosmetics: {
      card_style: "card_style_templo_samurai",
      effect: "effect_none",
      background: "background_templo_samurai",
    },
    subscription: {
      type: "FREE",
      plan: null,
    },
  },
];
