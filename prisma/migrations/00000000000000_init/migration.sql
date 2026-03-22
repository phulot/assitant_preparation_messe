-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('ADMIN', 'ANIMATEUR', 'CHORISTE', 'ORGANISTE', 'PRETRE');
CREATE TYPE "StatutChant" AS ENUM ('BROUILLON', 'VISIBLE_CREATEUR', 'VALIDE_GLOBAL');
CREATE TYPE "TypePartition" AS ENUM ('MELODIE', 'SATB', 'ACCOMPAGNEMENT');
CREATE TYPE "FormatPartition" AS ENUM ('PDF', 'MUSICXML', 'MIDI');
CREATE TYPE "TypeVoix" AS ENUM ('TOUTES', 'SOPRANO', 'ALTO', 'TENOR', 'BASSE');
CREATE TYPE "SourceTag" AS ENUM ('IA', 'HUMAIN');
CREATE TYPE "StatutTag" AS ENUM ('AUTO', 'VALIDE', 'EN_REVISION');
CREATE TYPE "StatutCorrection" AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE');
CREATE TYPE "TypeCelebration" AS ENUM ('DOMINICALE', 'FETE', 'OBLIGATION', 'MARIAGE', 'BAPTEME', 'FUNERAILLES');
CREATE TYPE "TempsLiturgique" AS ENUM ('AVENT', 'NOEL', 'ORDINAIRE', 'CAREME', 'PAQUES', 'PENTECOTE');
CREATE TYPE "StatutCelebration" AS ENUM ('EN_PREPARATION', 'SOUMISE', 'VALIDEE', 'PUBLIEE');
CREATE TYPE "StatutFeuille" AS ENUM ('BROUILLON', 'PUBLIEE');
CREATE TYPE "MomentLiturgique" AS ENUM ('ENTREE', 'OFFERTOIRE', 'COMMUNION', 'ENVOI', 'KYRIE', 'GLORIA', 'SANCTUS', 'AGNUS', 'PSAUME', 'MEDITATION');
CREATE TYPE "TypePreference" AS ENUM ('EXCLUSION', 'COUP_DE_COEUR');

-- CreateTable: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable: Account
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateTable: Session
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateTable: VerificationToken
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateTable: Paroisse
CREATE TABLE "Paroisse" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "lieu" TEXT,
    "adresse" TEXT,
    "horairesMessesHabituels" JSONB,
    CONSTRAINT "Paroisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RoleParoisse
CREATE TABLE "RoleParoisse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paroisseId" TEXT NOT NULL,
    "role" "RoleType" NOT NULL,
    CONSTRAINT "RoleParoisse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RoleParoisse_userId_paroisseId_role_key" ON "RoleParoisse"("userId", "paroisseId", "role");

-- CreateTable: Chant
CREATE TABLE "Chant" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "auteur" TEXT,
    "compositeur" TEXT,
    "cote" TEXT,
    "annee" INTEGER,
    "statut" "StatutChant" NOT NULL DEFAULT 'BROUILLON',
    "createurId" TEXT NOT NULL,
    "indicateurCompletude" DOUBLE PRECISION,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Chant_pkey" PRIMARY KEY ("id")
);

-- CreateTable: VersionParoles
CREATE TABLE "VersionParoles" (
    "id" TEXT NOT NULL,
    "chantId" TEXT NOT NULL,
    "label" TEXT,
    "langue" TEXT NOT NULL DEFAULT 'fr',
    "estVersionPrincipale" BOOLEAN NOT NULL DEFAULT false,
    "auteurModificationId" TEXT,
    "sections" JSONB NOT NULL,
    "schemaExecution" TEXT,
    CONSTRAINT "VersionParoles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Partition
CREATE TABLE "Partition" (
    "id" TEXT NOT NULL,
    "chantId" TEXT NOT NULL,
    "fichierUrl" TEXT NOT NULL,
    "type" "TypePartition" NOT NULL,
    "tonalite" TEXT,
    "format" "FormatPartition",
    CONSTRAINT "Partition_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Enregistrement
CREATE TABLE "Enregistrement" (
    "id" TEXT NOT NULL,
    "chantId" TEXT NOT NULL,
    "fichierUrl" TEXT NOT NULL,
    "duree" INTEGER,
    "format" TEXT,
    "typeVoix" "TypeVoix" NOT NULL DEFAULT 'TOUTES',
    CONSTRAINT "Enregistrement_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Tag
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "chantId" TEXT NOT NULL,
    "tempsLiturgiques" TEXT[],
    "themes" TEXT[],
    "momentsCelebration" TEXT[],
    "source" "SourceTag" NOT NULL DEFAULT 'IA',
    "statut" "StatutTag" NOT NULL DEFAULT 'AUTO',
    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DemandeCorrection
CREATE TABLE "DemandeCorrection" (
    "id" TEXT NOT NULL,
    "chantId" TEXT NOT NULL,
    "tagId" TEXT,
    "auteurId" TEXT NOT NULL,
    "commentaire" TEXT,
    "ancienneValeur" TEXT,
    "nouvelleValeur" TEXT,
    "statut" "StatutCorrection" NOT NULL DEFAULT 'EN_ATTENTE',
    "adminId" TEXT,
    "dateTraitement" TIMESTAMP(3),
    CONSTRAINT "DemandeCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Celebration
CREATE TABLE "Celebration" (
    "id" TEXT NOT NULL,
    "paroisseId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "TypeCelebration" NOT NULL,
    "tempsLiturgique" "TempsLiturgique",
    "feteEventuelle" TEXT,
    "lectures" JSONB,
    "animateurId" TEXT,
    "pretreId" TEXT,
    "statut" "StatutCelebration" NOT NULL DEFAULT 'EN_PREPARATION',
    CONSTRAINT "Celebration_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FeuilleDeChants
CREATE TABLE "FeuilleDeChants" (
    "id" TEXT NOT NULL,
    "celebrationId" TEXT NOT NULL,
    "statut" "StatutFeuille" NOT NULL DEFAULT 'BROUILLON',
    "pdfUrl" TEXT,
    CONSTRAINT "FeuilleDeChants_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LigneFeuille
CREATE TABLE "LigneFeuille" (
    "id" TEXT NOT NULL,
    "feuilleId" TEXT NOT NULL,
    "chantId" TEXT NOT NULL,
    "versionParolesId" TEXT,
    "moment" "MomentLiturgique" NOT NULL,
    "ordre" INTEGER NOT NULL,
    "notes" TEXT,
    CONSTRAINT "LigneFeuille_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "celebrationId" TEXT,
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HistoriqueChant
CREATE TABLE "HistoriqueChant" (
    "id" TEXT NOT NULL,
    "chantId" TEXT NOT NULL,
    "paroisseId" TEXT NOT NULL,
    "celebrationId" TEXT,
    "dateUtilisation" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HistoriqueChant_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PreferenceAnimateur
CREATE TABLE "PreferenceAnimateur" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chantId" TEXT NOT NULL,
    "type" "TypePreference" NOT NULL,
    CONSTRAINT "PreferenceAnimateur_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PreferenceAnimateur_userId_chantId_key" ON "PreferenceAnimateur"("userId", "chantId");

-- AddForeignKey constraints
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleParoisse" ADD CONSTRAINT "RoleParoisse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleParoisse" ADD CONSTRAINT "RoleParoisse_paroisseId_fkey" FOREIGN KEY ("paroisseId") REFERENCES "Paroisse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chant" ADD CONSTRAINT "Chant_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "VersionParoles" ADD CONSTRAINT "VersionParoles_chantId_fkey" FOREIGN KEY ("chantId") REFERENCES "Chant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VersionParoles" ADD CONSTRAINT "VersionParoles_auteurModificationId_fkey" FOREIGN KEY ("auteurModificationId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "Partition" ADD CONSTRAINT "Partition_chantId_fkey" FOREIGN KEY ("chantId") REFERENCES "Chant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Enregistrement" ADD CONSTRAINT "Enregistrement_chantId_fkey" FOREIGN KEY ("chantId") REFERENCES "Chant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_chantId_fkey" FOREIGN KEY ("chantId") REFERENCES "Chant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DemandeCorrection" ADD CONSTRAINT "DemandeCorrection_chantId_fkey" FOREIGN KEY ("chantId") REFERENCES "Chant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DemandeCorrection" ADD CONSTRAINT "DemandeCorrection_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON UPDATE CASCADE;
ALTER TABLE "DemandeCorrection" ADD CONSTRAINT "DemandeCorrection_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "DemandeCorrection" ADD CONSTRAINT "DemandeCorrection_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "Celebration" ADD CONSTRAINT "Celebration_paroisseId_fkey" FOREIGN KEY ("paroisseId") REFERENCES "Paroisse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Celebration" ADD CONSTRAINT "Celebration_animateurId_fkey" FOREIGN KEY ("animateurId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "Celebration" ADD CONSTRAINT "Celebration_pretreId_fkey" FOREIGN KEY ("pretreId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "FeuilleDeChants" ADD CONSTRAINT "FeuilleDeChants_celebrationId_fkey" FOREIGN KEY ("celebrationId") REFERENCES "Celebration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LigneFeuille" ADD CONSTRAINT "LigneFeuille_feuilleId_fkey" FOREIGN KEY ("feuilleId") REFERENCES "FeuilleDeChants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LigneFeuille" ADD CONSTRAINT "LigneFeuille_chantId_fkey" FOREIGN KEY ("chantId") REFERENCES "Chant"("id") ON UPDATE CASCADE;
ALTER TABLE "LigneFeuille" ADD CONSTRAINT "LigneFeuille_versionParolesId_fkey" FOREIGN KEY ("versionParolesId") REFERENCES "VersionParoles"("id") ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_celebrationId_fkey" FOREIGN KEY ("celebrationId") REFERENCES "Celebration"("id") ON UPDATE CASCADE;
ALTER TABLE "HistoriqueChant" ADD CONSTRAINT "HistoriqueChant_chantId_fkey" FOREIGN KEY ("chantId") REFERENCES "Chant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HistoriqueChant" ADD CONSTRAINT "HistoriqueChant_paroisseId_fkey" FOREIGN KEY ("paroisseId") REFERENCES "Paroisse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HistoriqueChant" ADD CONSTRAINT "HistoriqueChant_celebrationId_fkey" FOREIGN KEY ("celebrationId") REFERENCES "Celebration"("id") ON UPDATE CASCADE;
ALTER TABLE "PreferenceAnimateur" ADD CONSTRAINT "PreferenceAnimateur_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PreferenceAnimateur" ADD CONSTRAINT "PreferenceAnimateur_chantId_fkey" FOREIGN KEY ("chantId") REFERENCES "Chant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
