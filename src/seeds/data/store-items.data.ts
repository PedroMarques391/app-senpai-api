export interface SeedStoreItem {
  code: string;
  name: string;
  description: string;
  type: "wallpaper" | "gift" | "badge" | "border" | "profile_frame" | "profile_picture" | "premium_subscription" | "effect" | "other";
  price_in_petals: number;
  status: "active" | "inactive" | "archived";
}

export const OFFICIAL_STORE_ITEMS: SeedStoreItem[] = [
  {
    "name": "Aura Rosa",
    "description": "Brilho sutil ao redor dos elementos do perfil.",
    "price_in_petals": 220,
    "status": "active",
    "type": "effect",
    "code": "effect_glow"
  },
  {
    "name": "Aurora Boreal",
    "description": "Ondas de luz suave no topo do perfil.",
    "price_in_petals": 1000,
    "status": "active",
    "type": "effect",
    "code": "effect_aurora"
  },
  {
    "name": "Bolhas Celestes",
    "description": "Bolhas translúcidas sobem com brilho holográfico.",
    "price_in_petals": 780,
    "status": "active",
    "type": "effect",
    "code": "effect_bubbles"
  },
  {
    "name": "Bolhas de Pérola",
    "description": "Bolhas e pequenas pérolas sobem lentamente pelo perfil.",
    "price_in_petals": 780,
    "status": "active",
    "type": "effect",
    "code": "effect_oceano_perolas"
  },
  {
    "name": "Borboletas",
    "description": "Borboletas de luz voam suavemente pelo perfil.",
    "price_in_petals": 900,
    "status": "active",
    "type": "effect",
    "code": "effect_butterflies"
  },
  {
    "name": "Chuva de Luz",
    "description": "Gotas de luz néon descem suavemente.",
    "price_in_petals": 1050,
    "status": "active",
    "type": "effect",
    "code": "effect_rain"
  },
  {
    "name": "Chuva de Morangos",
    "description": "Morangos e brilhinhos descem suavemente pelo perfil.",
    "price_in_petals": 680,
    "status": "active",
    "type": "effect",
    "code": "effect_ursinho_morango"
  },
  {
    "name": "Confeitos Mágicos",
    "description": "Docinhos, corações e confeitos flutuam com brilho suave.",
    "price_in_petals": 740,
    "status": "active",
    "type": "effect",
    "code": "effect_macaron_docinho"
  },
  {
    "name": "Confete de Festa",
    "description": "Chuva festiva de confetes coloridos e estrelinhas.",
    "price_in_petals": 850,
    "status": "active",
    "type": "effect",
    "code": "effect_confetti"
  },
  {
    "name": "Constelação",
    "description": "Estrelas e linhas brilhantes se movem no perfil.",
    "price_in_petals": 1200,
    "status": "active",
    "type": "effect",
    "code": "effect_constellation"
  },
  {
    "name": "Corações Neon",
    "description": "Corações luminosos flutuam ao redor do perfil.",
    "price_in_petals": 900,
    "status": "active",
    "type": "effect",
    "code": "effect_hearts"
  },
  {
    "name": "Corações de Coelhinha",
    "description": "Corações e estrelinhas leves flutuam pelo perfil.",
    "price_in_petals": 640,
    "status": "active",
    "type": "effect",
    "code": "effect_coelhinha_nuvem"
  },
  {
    "name": "Espíritos Kawaii",
    "description": "Fantasminhas fofos flutuam timidamente ao redor.",
    "price_in_petals": 980,
    "status": "active",
    "type": "effect",
    "code": "effect_ghosts"
  },
  {
    "name": "Fogo Imperial",
    "description": "Chamas mágicas douradas e rubras sobem pelo perfil.",
    "price_in_petals": 1500,
    "status": "active",
    "type": "effect",
    "code": "effect_fire"
  },
  {
    "name": "Folhas Místicas",
    "description": "Folhas de outono douradas e esmeralda girando ao vento.",
    "price_in_petals": 820,
    "status": "active",
    "type": "effect",
    "code": "effect_leaves"
  },
  {
    "name": "Folhinhas da Raposa",
    "description": "Folhas e flores pequenas dançam nas bordas do perfil.",
    "price_in_petals": 700,
    "status": "active",
    "type": "effect",
    "code": "effect_raposinha_sakura"
  },
  {
    "name": "Galáxia Viva",
    "description": "Nebulosas e poeira estelar em rotação hipnótica.",
    "price_in_petals": 1350,
    "status": "active",
    "type": "effect",
    "code": "effect_galaxy"
  },
  {
    "name": "Luz Neon",
    "description": "Bordas luminosas pulsantes em tons rosa e ciano.",
    "price_in_petals": 480,
    "status": "active",
    "type": "effect",
    "code": "effect_neon"
  },
  {
    "name": "Neve Encantada",
    "description": "Flocos de neve brilhantes caem suavemente.",
    "price_in_petals": 1300,
    "status": "active",
    "type": "effect",
    "code": "effect_snow"
  },
  {
    "name": "Patinhas Rosé",
    "description": "Patinhas brilhantes caminham suavemente pelas bordas do perfil.",
    "price_in_petals": 620,
    "status": "active",
    "type": "effect",
    "code": "effect_gatinho_rose"
  },
  {
    "name": "Patinhas de Panda",
    "description": "Patinhas escuras e corações rosa aparecem de forma delicada.",
    "price_in_petals": 720,
    "status": "active",
    "type": "effect",
    "code": "effect_panda_algodao"
  },
  {
    "name": "Poeira de Estrelas",
    "description": "Estrelinhas claras cintilam por todo o perfil.",
    "price_in_petals": 760,
    "status": "active",
    "type": "effect",
    "code": "effect_estrelas_pastel"
  },
  {
    "name": "Pétalas Mágicas",
    "description": "Pétalas com brilho suave e partículas flutuantes.",
    "price_in_petals": 380,
    "status": "active",
    "type": "effect",
    "code": "effect_sparkles"
  },
  {
    "name": "Pétalas de Tulipa",
    "description": "Pétalas e folhinhas passeiam pelo perfil.",
    "price_in_petals": 800,
    "status": "active",
    "type": "effect",
    "code": "effect_jardim_tulipas"
  },
  {
    "name": "Raios Violeta",
    "description": "Pequenos arcos elétricos violeta percorrem o card.",
    "price_in_petals": 1250,
    "status": "active",
    "type": "effect",
    "code": "effect_lightning"
  },
  {
    "name": "Sakura Real",
    "description": "Pétalas animadas caem suavemente pelo perfil.",
    "price_in_petals": 1500,
    "status": "active",
    "type": "effect",
    "code": "effect_sakura_real"
  },
  {
    "name": "Sonhos Flutuantes",
    "description": "Nuvens e estrelinhas deslizam devagar pelo perfil.",
    "price_in_petals": 820,
    "status": "active",
    "type": "effect",
    "code": "effect_nuvem_sonhadora"
  },
  {
    "name": "Arcade Galáctico",
    "description": "Naves, planetas e neon em pixel art com clima de fliperama espacial clássico.",
    "price_in_petals": 1575,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_arcade_galactico"
  },
  {
    "name": "Borboletas Encantadas",
    "description": "Moldura lilás e menta com pequenas borboletas iluminadas.",
    "price_in_petals": 920,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_borboletas_encantadas"
  },
  {
    "name": "Cerejeira Dourada",
    "description": "Bordas elegantes em ouro nobre com flores de sakura clássicas.",
    "price_in_petals": 1080,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_cerejeira_dourada"
  },
  {
    "name": "Cidade Cyber Pixel",
    "description": "Prédios altos, neon e skyline futurista em pixel art para um perfil gamer e urbano.",
    "price_in_petals": 1680,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_cidade_cyber_pixel"
  },
  {
    "name": "Coelhinha Nuvem",
    "description": "Card suave com orelhas longas de coelhinha e nuvens fofas.",
    "price_in_petals": 1020,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_coelhinha_nuvem"
  },
  {
    "name": "Coelhinho Presente",
    "description": "Coelhinhos, presentes, flores e lacinhos em rosa suave com cantos pequenos e delicados.",
    "price_in_petals": 1470,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_coelhinho_presente"
  },
  {
    "name": "Corações Brilhantes",
    "description": "Moldura com brilho suave e corações rosa delicados.",
    "price_in_petals": 780,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_coracoes_brilhantes"
  },
  {
    "name": "Cosmos Dourado",
    "description": "Estrelas, luas e constelações azul-marinho com detalhes dourados e acabamento celestial.",
    "price_in_petals": 1680,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_cosmos_dourado"
  },
  {
    "name": "Estrelas Pastel",
    "description": "Card celestial fofo com lua, estrelas douradas e lilás.",
    "price_in_petals": 1220,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_estrelas_pastel"
  },
  {
    "name": "Fênix Carmesim",
    "description": "Chamas, asas e rubis em uma moldura intensa, limpa e elegante para quem curte fogo.",
    "price_in_petals": 1575,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_fenix_carmesim"
  },
  {
    "name": "Gatinho Rosé",
    "description": "Card fofo com orelhinhas de gatinho e detalhes rosé delicados.",
    "price_in_petals": 980,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_gatinho_rose"
  },
  {
    "name": "Jardim Sakura",
    "description": "Flores de cerejeira, pérolas e laços rosados em uma decoração leve e romântica.",
    "price_in_petals": 1365,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_jardim_sakura"
  },
  {
    "name": "Jardim de Tulipas",
    "description": "Card florido com tulipas rosa, folhas verdes e luz suave.",
    "price_in_petals": 1280,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_jardim_tulipas"
  },
  {
    "name": "Laços Marinho",
    "description": "Design sofisticado com laços delicados e tons azuis nobres.",
    "price_in_petals": 1420,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_lacos_marinho"
  },
  {
    "name": "Lua dos Sonhos",
    "description": "Lua, nuvens e estrelas em lavanda pastel para um perfil calmo, fofo e sonhador.",
    "price_in_petals": 1365,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_lua_dos_sonhos"
  },
  {
    "name": "Macaron Docinho",
    "description": "Card confeitado com macarons pastel, creme e mini corações.",
    "price_in_petals": 1180,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_macaron_docinho"
  },
  {
    "name": "Natal Encantado",
    "description": "Laços, azevinho, neve e mascotes natalinos em uma moldura fina, alegre e delicada.",
    "price_in_petals": 1260,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_natal_encantado"
  },
  {
    "name": "Nuvem Sonhadora",
    "description": "Card macio com nuvens brancas, estrelas rosa e azul bebê.",
    "price_in_petals": 1320,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_nuvem_sonhadora"
  },
  {
    "name": "Oceano de Pérolas",
    "description": "Card azul água com conchinhas, bolhas e pérolas rosadas.",
    "price_in_petals": 1260,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_oceano_perolas"
  },
  {
    "name": "Panda Algodão",
    "description": "Card branco e cinza com orelhinhas de panda e detalhes rosa.",
    "price_in_petals": 1150,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_panda_algodao"
  },
  {
    "name": "Quartzo Celestial",
    "description": "Brilho cristalino azul e lavanda com acabamento prismático.",
    "price_in_petals": 1260,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_quartzo_celestial"
  },
  {
    "name": "Raposinha Sakura",
    "description": "Card com orelhinhas de raposa, flores rosas e tons de pôr do sol.",
    "price_in_petals": 1120,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_raposinha_sakura"
  },
  {
    "name": "Raposinha de Outono",
    "description": "Raposinhas, folhas quentes e pequenos cogumelos em uma moldura aconchegante e fina.",
    "price_in_petals": 1470,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_raposinha_outono"
  },
  {
    "name": "Templo Samurai",
    "description": "Arquitetura japonesa, lanternas, sakura vermelha e detalhes samurai em uma moldura nobre.",
    "price_in_petals": 1785,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_templo_samurai"
  },
  {
    "name": "Ursinho Morango",
    "description": "Card quentinho com orelhinhas de ursinho e moranguinhos delicados.",
    "price_in_petals": 1080,
    "status": "active",
    "type": "profile_frame",
    "code": "card_style_ursinho_morango"
  },
  {
    "name": "Fundo Coelhinha Nuvem",
    "description": "Nuvens brancas, rosa bebê e lilás bem clarinho.",
    "price_in_petals": 540,
    "status": "active",
    "type": "wallpaper",
    "code": "background_coelhinha_nuvem"
  },
  {
    "name": "Fundo Estrelas Pastel",
    "description": "Céu pastel azul, lilás e amarelo estrelado.",
    "price_in_petals": 630,
    "status": "active",
    "type": "wallpaper",
    "code": "background_estrelas_pastel"
  },
  {
    "name": "Fundo Gatinho Rosé",
    "description": "Rosa leitoso, pêssego suave e creme aconchegante.",
    "price_in_petals": 520,
    "status": "active",
    "type": "wallpaper",
    "code": "background_gatinho_rose"
  },
  {
    "name": "Fundo Jardim de Tulipas",
    "description": "Verde clarinho, rosa floral e creme de primavera.",
    "price_in_petals": 670,
    "status": "active",
    "type": "wallpaper",
    "code": "background_jardim_tulipas"
  },
  {
    "name": "Fundo Macaron Docinho",
    "description": "Rosa confeitado, baunilha e lilás cremoso.",
    "price_in_petals": 610,
    "status": "active",
    "type": "wallpaper",
    "code": "background_macaron_docinho"
  },
  {
    "name": "Fundo Nuvem Sonhadora",
    "description": "Céu azul bebê, nuvens brancas e rosa de sonho.",
    "price_in_petals": 690,
    "status": "active",
    "type": "wallpaper",
    "code": "background_nuvem_sonhadora"
  },
  {
    "name": "Fundo Oceano de Pérolas",
    "description": "Água cristalina, turquesa pastel e brilho de pérola.",
    "price_in_petals": 650,
    "status": "active",
    "type": "wallpaper",
    "code": "background_oceano_perolas"
  },
  {
    "name": "Fundo Panda Algodão",
    "description": "Branco algodão, cinza azulado e rosa bem suave.",
    "price_in_petals": 590,
    "status": "active",
    "type": "wallpaper",
    "code": "background_panda_algodao"
  },
  {
    "name": "Fundo Raposinha Sakura",
    "description": "Laranja pastel, rosa sakura e creme luminoso.",
    "price_in_petals": 580,
    "status": "active",
    "type": "wallpaper",
    "code": "background_raposinha_sakura"
  },
  {
    "name": "Fundo Ursinho Morango",
    "description": "Creme, morango e pêssego em um gradiente docinho.",
    "price_in_petals": 560,
    "status": "active",
    "type": "wallpaper",
    "code": "background_ursinho_morango"
  },
  {
    "name": "Jardim Real",
    "description": "Tons escuros e dourados nobres para destacar seu perfil.",
    "price_in_petals": 720,
    "status": "active",
    "type": "wallpaper",
    "code": "background_royal"
  },
  {
    "name": "Noite Rosa",
    "description": "Degradê escuro com iluminação rosa e magenta.",
    "price_in_petals": 520,
    "status": "active",
    "type": "wallpaper",
    "code": "background_neon"
  },
  {
    "name": "Sakura Luminoso",
    "description": "Fundo suave com pétalas iluminadas em degradê rosado.",
    "price_in_petals": 450,
    "status": "active",
    "type": "wallpaper",
    "code": "background_sakura"
  }
];
