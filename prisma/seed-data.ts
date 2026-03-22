// Seed data constants — exported for testability, used by seed.ts
// All IDs are deterministic for idempotent upserts.

export const PARISH_ID = "default-paroisse-saint-exemple";

export interface SeedUser {
  email: string;
  name: string;
  password: string;
  role: string;
}

export interface LyricsSection {
  type: "refrain" | "couplet";
  numero?: number;
  texte: string;
}

export interface SeedSong {
  id: string;
  titre: string;
  auteur?: string;
  compositeur?: string;
  cote?: string;
  annee?: number;
  statut: string;
  versionParoles: {
    id: string;
    label?: string;
    langue: string;
    estVersionPrincipale: boolean;
    sections: LyricsSection[];
    schemaExecution?: string;
  };
}

export interface SeedTag {
  id: string;
  chantId: string;
  tempsLiturgiques: string[];
  themes: string[];
  momentsCelebration: string[];
  source: string;
  statut: string;
}

export interface SeedCelebration {
  id: string;
  paroisseId: string;
  date: string;
  type: string;
  tempsLiturgique: string;
  statut: string;
}

export interface SeedFeuille {
  id: string;
  celebrationId: string;
  statut: string;
}

export interface SeedLigneFeuille {
  id: string;
  feuilleId: string;
  chantId: string;
  versionParolesId: string;
  moment: string;
  ordre: number;
  notes?: string;
}

// ──────────────────────────────────────────────
// Users
// ──────────────────────────────────────────────

export const SEED_USERS: SeedUser[] = [
  {
    email: "animateur@paroisse.local",
    name: "Marie Dupont",
    password: "animateur123",
    role: "ANIMATEUR",
  },
  {
    email: "choriste@paroisse.local",
    name: "Jean Martin",
    password: "choriste123",
    role: "CHORISTE",
  },
  {
    email: "organiste@paroisse.local",
    name: "Pierre Lefebvre",
    password: "organiste123",
    role: "ORGANISTE",
  },
  {
    email: "pretre@paroisse.local",
    name: "Pere Jacques Bernard",
    password: "pretre123",
    role: "PRETRE",
  },
];

// ──────────────────────────────────────────────
// Songs
// ──────────────────────────────────────────────

export const SEED_SONGS: SeedSong[] = [
  {
    id: "seed-chant-peuple-de-dieu",
    titre: "Peuple de Dieu, marche joyeux",
    auteur: "Georges Lefebvre",
    cote: "T 601",
    annee: 1975,
    statut: "VALIDE_GLOBAL",
    versionParoles: {
      id: "seed-vp-peuple-de-dieu",
      label: "Version originale",
      langue: "fr",
      estVersionPrincipale: true,
      sections: [
        {
          type: "refrain",
          texte:
            "Peuple de Dieu, marche joyeux,\nAlleluja, Alleluja !\nCar le Seigneur est avec toi,\nDe sa lumiere il guide tes pas.",
        },
        {
          type: "couplet",
          numero: 1,
          texte:
            "Ouvre les yeux, regarde autour de toi,\nLes merveilles de Dieu sont la.",
        },
        {
          type: "couplet",
          numero: 2,
          texte: 'Ecoute-le qui dit a chacun :\n"Je t\'appelle par ton nom."',
        },
      ],
      schemaExecution: "R C1 R C2 R",
    },
  },
  {
    id: "seed-chant-je-vous-salue-marie",
    titre: "Je vous salue Marie",
    auteur: "Traditionnel",
    statut: "VALIDE_GLOBAL",
    versionParoles: {
      id: "seed-vp-je-vous-salue-marie",
      label: "Version traditionnelle",
      langue: "fr",
      estVersionPrincipale: true,
      sections: [
        {
          type: "refrain",
          texte:
            "Je vous salue Marie, pleine de grace,\nLe Seigneur est avec vous.\nVous etes benie entre toutes les femmes\nEt Jesus, le fruit de vos entrailles, est beni.",
        },
        {
          type: "couplet",
          numero: 1,
          texte:
            "Sainte Marie, Mere de Dieu,\nPriez pour nous, pauvres pecheurs,\nMaintenant et a l'heure de notre mort.",
        },
      ],
      schemaExecution: "R C1 R",
    },
  },
  {
    id: "seed-chant-pain-veritable",
    titre: "Pain veritable, Corps et Sang de Jesus Christ",
    auteur: "Andre Gouzes",
    compositeur: "Andre Gouzes",
    cote: "D 44-72",
    annee: 1990,
    statut: "VALIDE_GLOBAL",
    versionParoles: {
      id: "seed-vp-pain-veritable",
      label: "Version originale",
      langue: "fr",
      estVersionPrincipale: true,
      sections: [
        {
          type: "refrain",
          texte:
            "Pain veritable, Corps et Sang de Jesus Christ,\nDonne en partage pour que le monde ait la vie.",
        },
        {
          type: "couplet",
          numero: 1,
          texte:
            "Voici le pain de Dieu\nServi a tous les convives.\nPrenez et mangez-en tous,\nCeci est mon corps.",
        },
        {
          type: "couplet",
          numero: 2,
          texte:
            "Voici la coupe du salut\nDonnee pour la multitude.\nPrenez et buvez-en tous,\nCeci est mon sang.",
        },
      ],
      schemaExecution: "R C1 R C2 R",
    },
  },
  {
    id: "seed-chant-ubi-caritas",
    titre: "Ubi Caritas",
    auteur: "Taize",
    compositeur: "Jacques Berthier",
    annee: 1978,
    statut: "VALIDE_GLOBAL",
    versionParoles: {
      id: "seed-vp-ubi-caritas",
      label: "Version latine",
      langue: "la",
      estVersionPrincipale: true,
      sections: [
        {
          type: "refrain",
          texte: "Ubi caritas et amor,\nUbi caritas, Deus ibi est.",
        },
        {
          type: "couplet",
          numero: 1,
          texte:
            "Congregavit nos in unum Christi amor.\nExultemus et in ipso jucundemur.",
        },
      ],
      schemaExecution: "R C1 R",
    },
  },
];

// ──────────────────────────────────────────────
// Tags
// ──────────────────────────────────────────────

export const SEED_TAGS: SeedTag[] = [
  {
    id: "seed-tag-peuple-de-dieu",
    chantId: "seed-chant-peuple-de-dieu",
    tempsLiturgiques: ["ORDINAIRE", "PAQUES"],
    themes: ["joie", "marche", "lumiere"],
    momentsCelebration: ["ENTREE", "ENVOI"],
    source: "HUMAIN",
    statut: "VALIDE",
  },
  {
    id: "seed-tag-je-vous-salue-marie",
    chantId: "seed-chant-je-vous-salue-marie",
    tempsLiturgiques: ["ORDINAIRE", "AVENT"],
    themes: ["Marie", "priere", "intercession"],
    momentsCelebration: ["MEDITATION", "OFFERTOIRE"],
    source: "HUMAIN",
    statut: "VALIDE",
  },
  {
    id: "seed-tag-pain-veritable",
    chantId: "seed-chant-pain-veritable",
    tempsLiturgiques: ["ORDINAIRE"],
    themes: ["eucharistie", "communion", "partage"],
    momentsCelebration: ["COMMUNION"],
    source: "HUMAIN",
    statut: "VALIDE",
  },
  {
    id: "seed-tag-ubi-caritas",
    chantId: "seed-chant-ubi-caritas",
    tempsLiturgiques: ["CAREME", "ORDINAIRE"],
    themes: ["amour", "charite", "unite"],
    momentsCelebration: ["OFFERTOIRE", "MEDITATION"],
    source: "HUMAIN",
    statut: "VALIDE",
  },
];

// ──────────────────────────────────────────────
// Celebration, Feuille, Lignes
// ──────────────────────────────────────────────

export const SEED_CELEBRATION: SeedCelebration = {
  id: "seed-celebration-dimanche",
  paroisseId: PARISH_ID,
  date: "2026-04-05T10:30:00.000Z",
  type: "DOMINICALE",
  tempsLiturgique: "ORDINAIRE",
  statut: "EN_PREPARATION",
};

export const SEED_FEUILLE: SeedFeuille = {
  id: "seed-feuille-dimanche",
  celebrationId: SEED_CELEBRATION.id,
  statut: "BROUILLON",
};

export const SEED_LIGNES_FEUILLE: SeedLigneFeuille[] = [
  {
    id: "seed-ligne-1-entree",
    feuilleId: SEED_FEUILLE.id,
    chantId: "seed-chant-peuple-de-dieu",
    versionParolesId: "seed-vp-peuple-de-dieu",
    moment: "ENTREE",
    ordre: 1,
    notes: "Chant d'entree principal",
  },
  {
    id: "seed-ligne-2-offertoire",
    feuilleId: SEED_FEUILLE.id,
    chantId: "seed-chant-ubi-caritas",
    versionParolesId: "seed-vp-ubi-caritas",
    moment: "OFFERTOIRE",
    ordre: 2,
  },
  {
    id: "seed-ligne-3-communion",
    feuilleId: SEED_FEUILLE.id,
    chantId: "seed-chant-pain-veritable",
    versionParolesId: "seed-vp-pain-veritable",
    moment: "COMMUNION",
    ordre: 3,
  },
  {
    id: "seed-ligne-4-envoi",
    feuilleId: SEED_FEUILLE.id,
    chantId: "seed-chant-je-vous-salue-marie",
    versionParolesId: "seed-vp-je-vous-salue-marie",
    moment: "ENVOI",
    ordre: 4,
    notes: "Chant de sortie marial",
  },
];
