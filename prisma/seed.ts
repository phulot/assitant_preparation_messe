import type { Prisma } from "@prisma/client";
import {
  PrismaClient,
  RoleType,
  StatutChant,
  SourceTag,
  StatutTag,
  TypeCelebration,
  TempsLiturgique,
  StatutCelebration,
  StatutFeuille,
  MomentLiturgique,
} from "@prisma/client";
import bcryptjs from "bcryptjs";
import {
  PARISH_ID,
  SEED_USERS,
  SEED_SONGS,
  SEED_TAGS,
  SEED_CELEBRATION,
  SEED_FEUILLE,
  SEED_LIGNES_FEUILLE,
} from "./seed-data";

const prisma = new PrismaClient();

async function main() {
  // Hash the default admin password
  const passwordHash = await bcryptjs.hash("admin123", 10);

  // Upsert the default admin user
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@paroisse.local" },
    update: {
      name: "Administrateur",
      passwordHash,
    },
    create: {
      email: "admin@paroisse.local",
      name: "Administrateur",
      passwordHash,
    },
  });

  console.log(`Admin user upserted: ${adminUser.id} (${adminUser.email})`);

  // Upsert the default parish
  const paroisse = await prisma.paroisse.upsert({
    where: { id: PARISH_ID },
    update: {
      nom: "Paroisse Saint-Exemple",
    },
    create: {
      id: PARISH_ID,
      nom: "Paroisse Saint-Exemple",
    },
  });

  console.log(`Parish upserted: ${paroisse.id} (${paroisse.nom})`);

  // Upsert the ADMIN roleParoisse linking the admin user to the parish
  const roleParoisse = await prisma.roleParoisse.upsert({
    where: {
      userId_paroisseId_role: {
        userId: adminUser.id,
        paroisseId: paroisse.id,
        role: "ADMIN",
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      paroisseId: paroisse.id,
      role: "ADMIN",
    },
  });

  console.log(
    `RoleParoisse upserted: ${roleParoisse.id} (ADMIN for ${adminUser.email} in ${paroisse.nom})`,
  );

  // ──────────────────────────────────────────────
  // Additional users with different roles
  // ──────────────────────────────────────────────

  const userMap: Record<string, string> = {};

  for (const seedUser of SEED_USERS) {
    const hash = await bcryptjs.hash(seedUser.password, 10);

    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: { name: seedUser.name, passwordHash: hash },
      create: {
        email: seedUser.email,
        name: seedUser.name,
        passwordHash: hash,
      },
    });

    userMap[seedUser.role] = user.id;

    // Link user to parish with their role
    await prisma.roleParoisse.upsert({
      where: {
        userId_paroisseId_role: {
          userId: user.id,
          paroisseId: paroisse.id,
          role: seedUser.role as RoleType,
        },
      },
      update: {},
      create: {
        userId: user.id,
        paroisseId: paroisse.id,
        role: seedUser.role as RoleType,
      },
    });

    console.log(
      `User upserted: ${user.id} (${seedUser.email} - ${seedUser.role})`,
    );
  }

  // ──────────────────────────────────────────────
  // Songs with VersionParoles
  // ──────────────────────────────────────────────

  for (const song of SEED_SONGS) {
    const chant = await prisma.chant.upsert({
      where: { id: song.id },
      update: {
        titre: song.titre,
        auteur: song.auteur,
        compositeur: song.compositeur,
        cote: song.cote,
        annee: song.annee,
        statut: song.statut as StatutChant,
      },
      create: {
        id: song.id,
        titre: song.titre,
        auteur: song.auteur,
        compositeur: song.compositeur,
        cote: song.cote,
        annee: song.annee,
        statut: song.statut as StatutChant,
        createurId: adminUser.id,
      },
    });

    const vp = song.versionParoles;
    await prisma.versionParoles.upsert({
      where: { id: vp.id },
      update: {
        label: vp.label,
        langue: vp.langue,
        estVersionPrincipale: vp.estVersionPrincipale,
        sections: vp.sections as unknown as Prisma.InputJsonValue,
        schemaExecution: vp.schemaExecution,
      },
      create: {
        id: vp.id,
        chantId: chant.id,
        label: vp.label,
        langue: vp.langue,
        estVersionPrincipale: vp.estVersionPrincipale,
        sections: vp.sections as unknown as Prisma.InputJsonValue,
        schemaExecution: vp.schemaExecution,
        auteurModificationId: adminUser.id,
      },
    });

    console.log(`Song upserted: ${chant.id} (${chant.titre})`);
  }

  // ──────────────────────────────────────────────
  // Tags
  // ──────────────────────────────────────────────

  for (const tag of SEED_TAGS) {
    await prisma.tag.upsert({
      where: { id: tag.id },
      update: {
        tempsLiturgiques: tag.tempsLiturgiques,
        themes: tag.themes,
        momentsCelebration: tag.momentsCelebration,
        source: tag.source as SourceTag,
        statut: tag.statut as StatutTag,
      },
      create: {
        id: tag.id,
        chantId: tag.chantId,
        tempsLiturgiques: tag.tempsLiturgiques,
        themes: tag.themes,
        momentsCelebration: tag.momentsCelebration,
        source: tag.source as SourceTag,
        statut: tag.statut as StatutTag,
      },
    });

    console.log(`Tag upserted: ${tag.id}`);
  }

  // ──────────────────────────────────────────────
  // Celebration
  // ──────────────────────────────────────────────

  const celebration = await prisma.celebration.upsert({
    where: { id: SEED_CELEBRATION.id },
    update: {
      date: new Date(SEED_CELEBRATION.date),
      type: SEED_CELEBRATION.type as TypeCelebration,
      tempsLiturgique: SEED_CELEBRATION.tempsLiturgique as TempsLiturgique,
      statut: SEED_CELEBRATION.statut as StatutCelebration,
    },
    create: {
      id: SEED_CELEBRATION.id,
      paroisseId: SEED_CELEBRATION.paroisseId,
      date: new Date(SEED_CELEBRATION.date),
      type: SEED_CELEBRATION.type as TypeCelebration,
      tempsLiturgique: SEED_CELEBRATION.tempsLiturgique as TempsLiturgique,
      statut: SEED_CELEBRATION.statut as StatutCelebration,
      animateurId: userMap["ANIMATEUR"],
      pretreId: userMap["PRETRE"],
    },
  });

  console.log(`Celebration upserted: ${celebration.id}`);

  // ──────────────────────────────────────────────
  // FeuilleDeChants
  // ──────────────────────────────────────────────

  const feuille = await prisma.feuilleDeChants.upsert({
    where: { id: SEED_FEUILLE.id },
    update: {
      statut: SEED_FEUILLE.statut as StatutFeuille,
    },
    create: {
      id: SEED_FEUILLE.id,
      celebrationId: SEED_FEUILLE.celebrationId,
      statut: SEED_FEUILLE.statut as StatutFeuille,
    },
  });

  console.log(`Feuille upserted: ${feuille.id}`);

  // ──────────────────────────────────────────────
  // LigneFeuille entries
  // ──────────────────────────────────────────────

  for (const ligne of SEED_LIGNES_FEUILLE) {
    await prisma.ligneFeuille.upsert({
      where: { id: ligne.id },
      update: {
        moment: ligne.moment as MomentLiturgique,
        ordre: ligne.ordre,
        notes: ligne.notes,
      },
      create: {
        id: ligne.id,
        feuilleId: ligne.feuilleId,
        chantId: ligne.chantId,
        versionParolesId: ligne.versionParolesId,
        moment: ligne.moment as MomentLiturgique,
        ordre: ligne.ordre,
        notes: ligne.notes,
      },
    });

    console.log(
      `LigneFeuille upserted: ${ligne.id} (${ligne.moment} #${ligne.ordre})`,
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
