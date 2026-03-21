# Projet : Application Chants Liturgiques

- **repo git**: https://github.com/phulot/assitant_preparation_messe
- **statut**: implementing


## Fonctionnalités principales

## 0. Page d'accueil / Dashboard

  - **Section "Derniers chants ajoutés" — fil des ajouts récents sur la plateforme**

  - Prochaines célébrations de la paroisse

  - Accès rapide aux actions principales (nouvelle célébration, recherche de chant, chat IA)

## 1. Suggestion de chants

  - Suggestions automatiques basées sur le temps liturgique (Avent, Carême, Temps ordinaire, etc.) (P0)

  - Filtrage par type de moment (entrée, offertoire, communion, envoi, méditation…) (P0)

  - Prise en compte des lectures du jour (P0)

  - Recherche par thème, mot-clé, titre ou cote (ex : SECLI, CNA) (P0)

## 2. Feuille de chants

  - Création d'une feuille de chants pour chaque célébration (P1)

  - Mise en page manuelle dans l’interface (P2)

  - Mise en page automatique prête à imprimer (PDF) (P3)

  - Possibilité d'ajouter les paroles directement sur la feuille

  - Historique des feuilles passées (P2)

## 3. Partitions

  - Accès aux partitions (mélodie, harmonisation, accompagnement) (P0)

  - Affichage en ligne et téléchargement PDF (P0)

  - Gestion des différentes tonalités / transposition (P3)

## 4. Paroles

  - Base de données des textes de chants (P0)

  - Affichage clair avec couplets et refrain (P1)

  - Projection possible (mode plein écran pour vidéoprojecteur) (P2)

## 5. Enregistrements audio

  - Écoute de l'enregistrement complet (toutes voix) (P0)

  - Écoute voix par voix (soprano, alto, ténor, basse) (P1)

  - Possibilité de mixer / isoler une voix pour répétition (P3)

  - Contrôle de vitesse de lecture (P2)

  ---

## 6. Collaboration & contributions

  - Ajout collaboratif de chants manquants (paroles, partitions, enregistrements)

  - Modération des contributions (validation/rejet)

  - Signalement d'erreurs sur les contenus existants

## 7. Organisation par paroisse

  - Configuration de la paroisse (nom, lieu, horaires de messes)

  - Gestion des équipes : prêtre en charge, équipe d'animateurs, choristes

  - Attribution des célébrations aux animateurs

  - Notifications (feuille de chants prête, modifications, chants à préparer)

  - Gestion des rôles et permissions par paroisse

## 8. Intelligence artificielle & recherche intelligente

  - Chat IA d'aide au choix de chants (dialogue en langage naturel pour trouver le bon chant selon le contexte)

  - Recherche sémantique sur les titres et les paroles (en plus de la recherche par tags/cotes)

  - Caractérisation automatique des chants par IA (temps liturgique, thèmes, moments, ambiance…)

  - Correction humaine collaborative : demande de modification des tags/caractéristiques, validation par un admin

  ---


## Stack technique

## Base de données

  - **PostgreSQL + extension pgvector**

  - Recherche sémantique via requêtes vectorielles SQL

  - ORM : Prisma (typage fort, migrations, support pgvector)

  - Hébergement BDD : Supabase (PostgreSQL managé + pgvector intégré) ou Neon

  ---

## Backend + Frontend

  - **Next.js (App Router, TypeScript)**

  - API routes intégrées, SSR, React Server Components

  - React + Tailwind CSS + shadcn/ui

  - Auth : NextAuth.js (email/password, OAuth)

  ---

## IA

  - **Claude API — chat assistant, caractérisation automatique des chants**

  - LLM : modèles locaux gratuits (Ollama + Llama, Mistral…) en dev/prod, possibilité de brancher un provider cloud plus tard

  - Embeddings : modèle local gratuit (via Ollama) stockés dans pgvector

  ---

## Stockage fichiers

  - MinIO auto-hébergé (S3-compatible, gratuit et open-source)

  - Partitions PDF, fichiers audio

  ---

## Audio

  - Player custom : Howler.js ou WaveSurfer.js (lecture voix par voix, vitesse)

  ---

## PDF

  - Affichage partitions : react-pdf

  - Génération feuilles de chants : @react-pdf/renderer

  ---

## Hébergement

  - App : Docker Compose auto-hébergé (VPS ou machine locale)

  - BDD : Supabase ou Neon

  - Fichiers : Cloudflare R2

  ---

## Notifications

  - Web push (service worker) — gratuit, natif navigateur

  - Email : solution self-hosted (Mailpit en dev, ou SMTP standard)

  ---

## Principes

  - Zero lock-in cloud : 100% auto-hébergeable, zéro coût cloud

  - **Abstraction fournisseur IA : provider LLM et embeddings interchangeables via config**

  - Conteneurisée (Docker) — auto-hébergé sur VPS ou machine locale


## Modèle de données

## Chant

  - id, titre, auteur, compositeur, cote (SECLI/CNA), année

  - statut : brouillon / visible_créateur / validé_global

  - créateur_id, date_création, date_modification

  - indicateur_complétude (paroles, partition, enregistrement)

  - embedding (vecteur pour recherche sémantique)

  *→ Chant 1→N VersionParoles, Partitions, Enregistrements, Tags*

  ---

## VersionParoles

  - id, chant_id

  - label (ex: "Version CNA", "Variante diocèse de Lyon")

  - langue, est_version_principale (bool), auteur_modification, date

  - **sections : liste ordonnée, chaque section :**

  -   → type : refrain / couplet / coda / pont / intro / contrechant / récitation / acclamation / autre

  -   → numéro (optionnel), texte, voix (tous/S/A/T/B), indications

  - schéma_execution : enchaînement par défaut (ex: R → C1 → R → C2 → Coda)

  ---

## Partition

  - id, chant_id

  - fichier (PDF/image), type : mélodie / SATB / accompagnement

  - tonalité, format

  ---

## Enregistrement

  - id, chant_id

  - fichier_audio, durée, format

  - type_voix : toutes / soprano / alto / ténor / basse

  ---

## Tag / Caractérisation

  - id, chant_id

  - temps_liturgiques [], thèmes [], moments_celebration []

  - source : IA / humain

  - statut : auto / validé / en_révision

  ---

## DemandeCorrection

  - id, chant_id, tag_id

  - auteur_id, commentaire

  - ancien_valeur, nouvelle_valeur

  - statut : en_attente / approuvé / rejeté

  - admin_id, date_traitement

  ---

## Celebration

  - id, paroisse_id, date

  - type : messe dominicale / fête / obligation / mariage / baptême / funérailles

  - temps_liturgique, fête_éventuelle

  - lectures (1ère lecture, psaume, 2ème lecture, évangile)

  - animateur_id, prêtre_id

  - statut : en_préparation / soumise / validée / publiée

  ---

## FeuilleDeChants

  - id, celebration_id

  - statut : brouillon / publiée

  - pdf_url

  ---

## LigneFeuille

  - id, feuille_id, chant_id, version_paroles_id

  - moment : entrée / offertoire / communion / envoi / kyrie / gloria / sanctus / agnus / psaume / méditation

  - ordre, notes

  ---

## Paroisse

  - id, nom, lieu, adresse

  - horaires_messes_habituels (JSON)

  ---

## Utilisateur

  - id, nom, email, mot_de_passe_hash

  ---

## RoleParoisse

  - utilisateur_id, paroisse_id

  - rôle : admin / animateur / choriste / organiste / prêtre

  ---

## PreferenceAnimateur

  - utilisateur_id, chant_id

  - type : exclusion / coup_de_coeur

  ---

## Notification

  - id, utilisateur_id, type, contenu

  - celebration_id (nullable), lue (bool), date

  ---

## HistoriqueChant

  - id, chant_id, paroisse_id, celebration_id, date_utilisation

  ---

## Relations clés

  - Chant 1→N VersionParoles (une version principale)

  - Chant 1→N Partitions, Enregistrements, Tags

  - Celebration 1→1 FeuilleDeChants 1→N LigneFeuille

  - LigneFeuille → Chant + VersionParoles

  - Paroisse 1→N Utilisateur (via RoleParoisse, multi-rôles)

  - Utilisateur N→N Chant (via PreferenceAnimateur)

  - HistoriqueChant : trace les chants utilisés par paroisse/célébration


## Sources de donnees

## Calendrier liturgique

  - Romcal (npm, open-source) : calendrier liturgique catholique romain (temps, fêtes, solennités, messes d'obligation)

  - Alternative : API Liturgical Calendar (Catholic API, open-source)

  ---

## Lectures du jour

  - AELF (Association Épiscopale Liturgique Francophone) : lectures du jour en français, API ou scraping

  - Evangelizo.org : lectures quotidiennes, multilingue

  ---

## Répertoire de chants

  - Pas de base ouverte existante → construction collaborative par les utilisateurs

  - Amorçage initial via l'agent IA : scraping de sites publics (Chantons en Église, SECLI, sites diocésains) pour pré-remplir titres + métadonnées

  - Paroles et partitions ajoutées par les contributeurs

  ---

## Enregistrements / Audio / Vidéo

  - La plateforme n'héberge PAS d'audio/vidéo à court terme

  - Liens vers des sources externes : YouTube, SoundCloud, sites paroissiaux

  - Lecteur intégré via embed (iframe YouTube, player SoundCloud)

  - Évolution future : hébergement audio direct quand le besoin se confirme

  ---

## Partitions

  - Upload par les contributeurs (PDF/images)

  - L'agent peut chercher sur le web des partitions libres de droits


## Utilisateurs cibles

  - Animateurs liturgiques / chefs de chœur

  - Organistes et musiciens

  - Prêtres et équipes liturgiques

  - Choristes (accès aux enregistrements voix par voix)

  - Administrateurs / Contributeurs (maintenance de la base, modération)

  ---


## Personas & User Stories

## Personas

  1. **Animateur liturgique** — prépare les célébrations, choisit les chants, crée les feuilles

  1. **Choriste** — répète les chants, écoute les voix séparées, accède aux partitions

  1. **Organiste / Musicien** — accède aux partitions d'accompagnement, transpose

  1. **Prêtre / Équipe liturgique** — valide la sélection, consulte le programme

  1. **Administrateur / Contributeur** — maintient la base de chants, modère les contributions, gère la paroisse

## User Stories — Animateur liturgique

  - En tant qu'animateur, je veux recevoir des suggestions de chants adaptées au dimanche/fête que je prépare, pour gagner du temps

  - En tant qu'animateur, je veux créer une feuille de chants et l'imprimer en PDF

  - En tant qu'animateur, je veux inclure les partitions dans la feuille de chants

  - En tant qu'animateur, je veux consulter l'historique des chants déjà utilisés pour varier le répertoire

  - En tant qu'animateur, je veux rechercher un chant par titre, cote ou thème

## User Stories — Choriste

  - En tant que choriste, je veux écouter ma voix isolée (soprano/alto/ténor/basse) pour la répéter

  - En tant que choriste, je veux accéder aux paroles des chants de la prochaine célébration

  - En tant que choriste, je veux accéder à la partition (mélodie/SATB) d'un chant pour le répéter

  - En tant que choriste, je veux ralentir la lecture d'un enregistrement pour mieux apprendre

## User Stories — Organiste / Musicien

  - En tant qu'organiste, je veux accéder à la partition d'accompagnement d'un chant

  - En tant qu'organiste, je veux transposer une partition dans une autre tonalité

## User Stories — Prêtre / Équipe liturgique

  - En tant que prêtre, je veux consulter les chants prévus pour une célébration

  - En tant que prêtre, je veux valider ou proposer des modifications à la sélection

## User Stories — Administrateur / Contributeur

  - En tant que contributeur, je veux ajouter un chant manquant (paroles, partition, enregistrement) pour enrichir la base

  - En tant qu'administrateur, je veux modérer les contributions (valider/rejeter un ajout de chant)

  - En tant que contributeur, je veux signaler une erreur dans les paroles ou une partition pour améliorer la qualité

  - En tant qu'administrateur, je veux gérer les utilisateurs et les rôles au sein de ma paroisse

## User Stories — Collaboration & Organisation paroissiale

  - En tant que prêtre, je veux être associé aux messes dont je suis en charge, pour suivre la préparation

  - En tant qu'animateur, je veux appartenir à une équipe d'animateurs de ma paroisse, pour collaborer sur la préparation

  - En tant que membre d'une paroisse, je veux recevoir des notifications quand la feuille de chants est prête ou modifiée

  - En tant qu'animateur, je veux assigner une célébration à un autre animateur de l'équipe

  - En tant que choriste, je veux être notifié des chants à préparer pour la prochaine célébration

  - En tant qu'administrateur paroissial, je veux configurer ma paroisse (nom, lieu, équipes, horaires de messes habituels)

## User Stories — IA & Recherche intelligente

  - En tant qu'animateur, je veux discuter avec un chat IA pour m'aider à choisir des chants adaptés à ma célébration

  - En tant qu'animateur, je veux rechercher un chant par sens/intention (recherche sémantique) et pas seulement par mots-clés exacts

  - En tant que choriste, je veux trouver un chant en décrivant son contenu ou son ambiance, même si je ne connais pas le titre

  - En tant qu'utilisateur, je veux que la recherche sémantique porte sur les titres ET les paroles des chants

  - En tant qu'utilisateur, je veux que les chants soient automatiquement caractérisés (thèmes, temps liturgique, moments) par l'IA à l'import

  - En tant que contributeur, je veux proposer une correction sur la caractérisation IA d'un chant (demande de changement)

  - En tant qu'administrateur, je veux valider ou rejeter les demandes de correction sur les caractéristiques d'un chant

  - En tant qu'animateur, je veux demander à l'IA de créer directement une feuille de chants complète pour une célébration donnée

  - En tant qu'utilisateur, je veux que l'IA puisse effectuer toutes les actions à ma place via le chat (ajouter/supprimer des chants, modifier une feuille, assigner une célébration, etc.)

  - En tant que choriste, je veux demander à l'IA de me trouver la partition et l'enregistrement de ma voix pour un chant donné

  - En tant qu'animateur, je veux que l'IA génère le PDF de la feuille de chants quand je le lui demande

  ---


## Parcours utilisateurs (UX Flows)

## Parcours 1 : Préparer les chants d'une célébration (Animateur)

  1. Se connecter → arriver sur le dashboard paroisse

  1. Cliquer 'Nouvelle célébration' ou sélectionner une date dans le calendrier

  1. Choisir le type : messe dominicale, fête liturgique, messe d'obligation, mariage, baptême, funérailles…

  1. Le système affiche automatiquement : temps liturgique, fête éventuelle, lectures du jour

  1. **La page affiche des suggestions de chants par moment (entrée, offertoire, communion, envoi…), basées sur les lectures, le temps liturgique et la fête**

  1. **Pour chaque suggestion : prévisualiser les paroles, la partition et écouter l'enregistrement AVANT de sélectionner**

  1. Compléter/modifier la sélection — 2 chemins :

  - Manuel : rechercher par titre/cote/tag/recherche sémantique

  - IA : ouvrir le chat et demander des ajustements → l'IA propose des alternatives

  1. Valider la sélection → la feuille de chants est générée

  1. Optionnel : partager avec le prêtre pour validation

  1. Publier → notification envoyée aux choristes et musiciens

  1. Exporter en PDF si besoin

## Parcours 2 : Préparer un chant (Choriste)

  1. Recevoir une notification 'Chants à préparer pour dimanche'

  1. Ouvrir l'app → voir la liste des chants de la prochaine célébration

  1. **Cliquer sur un chant à travailler → ouverture de la vue du chant avec partition et enregistrements affichés ensemble**

  1. Écouter l'enregistrement (toutes voix ou voix isolée) tout en suivant la partition

  1. Écouter l'enregistrement (toutes voix ou voix isolée) tout en suivant la partition et les paroles

  1. Ajuster la vitesse de lecture pour travailler un passage

## Parcours 3 : Préparer l'accompagnement (Organiste)

  1. Recevoir notification / consulter la prochaine célébration

  1. Voir la liste des chants

  1. Accéder à la partition d'accompagnement pour chaque chant

  1. Transposer si nécessaire

  1. Télécharger les partitions en PDF

## Parcours 4 : Valider une célébration (Prêtre)

  1. Recevoir notification 'Feuille de chants soumise pour validation'

  1. Consulter la sélection proposée

  1. Valider, ou commenter/demander des modifications

  1. L'animateur est notifié du retour

## Parcours 5 : Ajouter un chant manquant (Contributeur)

  1. Constater qu'un chant n'existe pas dans la base

  1. Cliquer "Ajouter un chant" → saisir le titre (et éventuellement l'auteur)

  1. **L'agent vérifie automatiquement si le chant existe déjà dans la base (recherche par titre, auteur, cote) pour éviter les doublons → si trouvé, propose le chant existant**

  1. **Un agent IA lance automatiquement une recherche internet pour récupérer : paroles, partitions, enregistrements disponibles**

  1. **L'agent propose un formulaire pré-rempli avec les résultats trouvés (paroles, liens partitions, enregistrements)**

  1. **Le contributeur peut :**

  - Accepter la proposition et ajuster manuellement

  - **Demander à l'agent de revoir sa proposition avec un commentaire (ex : "mauvaises paroles", "enregistrement pas le bon", "partition incorrecte")**

  - **Interrompre l'agent et tout remplir manuellement**

  1. L'IA caractérise automatiquement le chant (thèmes, temps liturgiques, moments) → le contributeur peut ajuster

  1. **Soumission (titre + paroles obligatoires) :**

  - **Immédiatement disponible pour le créateur et les personnes qui accèdent à ses programmes/célébrations**

  - **Doit être validé par un admin pour être visible par tous les utilisateurs de la plateforme**

  - Le reste (partitions, enregistrements) peut être complété après publication

  1. **Les contributeurs peuvent compléter le chant au fur et à mesure (ajouter partitions, enregistrements, corriger les paroles) — le chant affiche un indicateur de complétude**

## Parcours 6 : Chat IA (tout utilisateur)

  1. Ouvrir le chat depuis n'importe quel écran

  1. Poser une question ou donner une instruction en langage naturel

  1. L'IA exécute l'action (recherche, création feuille, suggestion…) ou répond

  1. L'utilisateur valide ou ajuste

  1. L'IA applique les modifications

  ---


## Règles métier — Suggestions de chants

## Critères de suggestion (par ordre de poids)

  1. **Lectures du jour** — analyse sémantique des textes (1ère lecture, psaume, 2ème lecture, évangile) pour trouver des chants dont les paroles résonnent avec les thèmes

  1. **Fête / Solennité** — si fête spécifique (Toussaint, Ascension, Assomption…), les chants liés à cette fête priment

  1. **Temps liturgique** — Avent, Noël, Carême, Pâques, Temps ordinaire, etc.

  1. **Moment de la célébration** — chaque chant est tagué pour un ou plusieurs moments (entrée, offertoire, communion, envoi, méditation…)

  1. **Historique paroisse (activable/désactivable)** — éviter de reproposer un chant utilisé récemment, favoriser la variété. L'animateur peut activer ou désactiver ce critère.

  1. **Popularité / fréquence d'utilisation** — les chants les plus utilisés globalement remontent (signal de qualité)

  1. **Répertoire connu de la paroisse** — favoriser les chants que la chorale/assemblée connaît déjà

## Fonctionnement

  - Pour chaque moment de la messe, le système propose 3-5 chants triés par pertinence

  - Le scoring combine tous les critères ci-dessus

  - L'IA peut expliquer pourquoi un chant est suggéré ("Ce chant parle de la lumière, en lien avec l'évangile du jour")

  - L'animateur peut filtrer/affiner (exclure les chants inconnus, forcer un thème…)

  - **Liste d'exclusion personnelle : l'animateur peut exclure globalement des chants des suggestions (chants qu'il ne souhaite pas utiliser). Ce filtre est désactivable à tout moment.**

  - **Coups de cœur : l'animateur peut marquer des chants comme favoris, ceux-ci sont mis en avant dans les suggestions.**

## Cas particuliers

  - **Ordinaire de la messe (Kyrie, Gloria, Sanctus, Agnus) : proposer un choix global pour l'ensemble de l'ordinaire, avec possibilité de choisir chaque pièce individuellement**

  - Psaume : proposer le psaume du jour mis en musique (si disponible)

  - Messes spéciales (mariage, funérailles, baptême) : répertoire dédié

# Vision du projet

Application web dédiée à la préparation musicale des célébrations liturgiques (messes, mariages, baptêmes, funérailles, etc.).

## Validation

le projet doit être lancé en local et validé après chaque modification 

un pre commit hook doit être mis en place pour s’assurer du bon fonctionnement des tests / format /lint … et bloquer les commit si ça ne passe pas

aucune erreur dans l’execution n’est tolérable - dès qu’une erreur est identifiée elle doit être corrigée, meme si pas en rapport avec les changements actuels

---

# Backlog de spécification

Liste des sujets restant à spécifier pour compléter la spec du projet.

- [x] **User stories & cadrage projet**

- [x] **Parcours utilisateur (UX flows)**

- [x] **Règles métier pour les suggestions de chants**

- [x] **Modèle de données détaillé & schéma de BDD**

- [x] **Choix de la stack technique (frontend, backend, BDD, hébergement)**

- [ ] Gestion des droits d'auteur & licences sur les contenus — REPORTÉ

- [x] Sources de données (calendrier liturgique, lectionnaire, répertoires)

- [x] Gestion des fichiers audio (liens externes, pas d'hébergement à court terme)

- [x] Gestion des utilisateurs & droits (multi-paroisse, rôles)

- [x] Maquettes / wireframes des écrans principaux

- [x] Stratégie de déploiement (app web d'abord, mobile plus tard)

- [x] Plan de tests & critères d'acceptation


## Maquettes / Wireframes

## 0. Login / Inscription

  ```plain text
┌──────────────────────────────────────────┐
│                                          │
│            🎵 ChantLit                   │
│                                          │
│     Préparez vos célébrations            │
│     en musique                           │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Email: [________________________] │  │
│  │ Mot de passe: [_________________] │  │
│  │                                    │  │
│  │ [Se connecter]                     │  │
│  │                                    │  │
│  │ Pas encore de compte ?             │  │
│  │ [Créer un compte]                  │  │
│  │                                    │  │
│  │ [Mot de passe oublié ?]            │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
  ```

  ---

## 1. Dashboard / Accueil

  ```plain text
┌──────────────────────────────────────────┐
│  🎵 ChantLit            [Ma paroisse ▼] │
│                                    [👤]  │
├──────────────────────────────────────────┤
│                                          │
│  📅 Prochaines célébrations              │
│  ┌────────────────────────────────────┐  │
│  │ Dim 30 mars - Messe dominicale     │  │
│  │ Animateur: Jean  [En préparation]  │  │
│  ├────────────────────────────────────┤  │
│  │ Dim 6 avril - 5e dim. Carême       │  │
│  │ Animateur: —     [+ Préparer]      │  │
│  └────────────────────────────────────┘  │
│                                          │
│  🆕 Derniers chants ajoutés              │
│  • Peuple de Dieu, marche joyeux        │
│  • Tu nous appelles par notre nom       │
│  • Grain de blé                         │
│                                          │
│  [+ Nouvelle célébration]  [🔍 Chercher] │
│                                          │
│  💬 Chat IA (flottant en bas à droite)   │
└──────────────────────────────────────────┘
  ```

  ---

## 2. Préparation célébration (Animateur)

  ```plain text
┌──────────────────────────────────────────┐
│  ← Dim 30 mars - Messe dominicale       │
│  4e dim. Carême | Lectures: Jn 9,1-41   │
├──────────────────────────────────────────┤
│                                          │
│  🎼 ORDINAIRE        [Messe de St-Jean ▼]│
│  Kyrie / Gloria / Sanctus / Agnus       │
│  [Choisir individuellement]              │
│                                          │
│  ─── ENTRÉE ─────────────────────────── │
│  Suggestions:                            │
│  ┌──────────────────────────────────┐    │
│  │ ♪ Peuple de Dieu     [👁️][▶️][✓] │    │
│  │ ♪ Ouvrons l'évangile [👁️][▶️][✓] │    │
│  │ ♪ Entrons dans...    [👁️][▶️][✓] │    │
│  └──────────────────────────────────┘    │
│  [🔍 Autre chant]                        │
│                                          │
│  ─── OFFERTOIRE ─────────────────────── │
│  Suggestions: ...                        │
│                                          │
│  ─── COMMUNION ──────────────────────── │
│  Suggestions: ...                        │
│                                          │
│  ─── ENVOI ──────────────────────────── │
│  Suggestions: ...                        │
│                                          │
│  [Soumettre au prêtre] [Publier] [PDF]   │
│                                   💬     │
└──────────────────────────────────────────┘

👁️ = prévisualisation (paroles + partition)
▶️ = écouter
✓  = sélectionner
  ```

  ---

## 3. Prévisualisation chant (modale)

  ```plain text
┌──────────────────────────────────────────┐
│  ♪ Peuple de Dieu, marche joyeux    [×] │
│  Auteur: J. Berthier | CNA 721          │
├──────────────────────────────────────────┤
│                                          │
│  [Paroles] [Partition] [Les deux]        │
│                                          │
│  R/ Peuple de Dieu, marche joyeux,      │
│     Alléluia, Alléluia !                │
│                                          │
│  1. Dieu nous a tous aimés              │
│     Dans le Christ bien-aimé...         │
│                                          │
│  📎 Partition: mélodie | SATB | acc.     │
│  🔗 YouTube | SoundCloud                 │
│                                          │
│         [Sélectionner pour Entrée]       │
└──────────────────────────────────────────┘
  ```

  ---

## 4. Vue chant - Choriste (partition + audio)

  ```plain text
┌──────────────────────────────────────────────────────┐
│  ← Peuple de Dieu, marche joyeux                     │
├──────────────────────────────────────────────────────┤
│                          │                           │
│  Version: [CNA ▼]       │  ┌─────────────────────┐  │
│                          │  │                     │  │
│  R/ Peuple de Dieu,     │  │   PARTITION         │  │
│     marche joyeux,      │  │   (mélodie ou SATB) │  │
│     Alléluia !          │  │                     │  │
│                          │  │                     │  │
│  1. Dieu nous a tous    │  │                     │  │
│     aimés dans le       │  │                     │  │
│     Christ bien-aimé... │  │                     │  │
│                          │  │                     │  │
│  2. Il nous a choisis   │  └─────────────────────┘  │
│     dans le Christ...   │                           │
│                          │                           │
├──────────────────────────┴───────────────────────────┤
│  ▶ ━━━━━━━━━━━━━━━●━━━━━━━━  3:42                    │
│  [Toutes] [Soprano] [Alto] [Ténor] [Basse]          │
│  Vitesse: [0.5x] [0.75x] [1x] [1.25x]              │
└──────────────────────────────────────────────────────┘
  ```

  ---

## 6. Recherche (sémantique + tags)

  ```plain text
┌──────────────────────────────────────────┐
│  🔍 [un chant sur la lumière qui gui...] │
│  [Par tags ▼] [Sémantique ●]            │
│                                          │
│  Résultats:                              │
│  ┌────────────────────────────────────┐  │
│  │ ♪ Lumière du monde     ⭐ 92%      │  │
│  │   Temps pascal | Envoi            │  │
│  │   [👁️] [▶️]                        │  │
│  ├────────────────────────────────────┤  │
│  │ ♪ Tu es la lumière     ⭐ 87%      │  │
│  │   Temps ordinaire | Communion     │  │
│  │   [👁️] [▶️]                        │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
  ```

  ---

## 7. Chat IA (panneau flottant)

  ```plain text
┌─────────────────────────────┐
│  💬 Assistant           [×] │
├─────────────────────────────┤
│                             │
│  🤖 Bonjour ! Comment      │
│  puis-je vous aider ?       │
│                             │
│  👤 Propose-moi des chants  │
│  pour le 4e dimanche de     │
│  Carême, messe du matin     │
│                             │
│  🤖 Voici ma proposition :  │
│  Entrée: Peuple de Dieu     │
│  Offertoire: Grain de blé   │
│  Communion: Tu nous appelles│
│  Envoi: Allez par toute...  │
│  [Appliquer à la feuille]   │
│                             │
│  [____________________][➤]  │
└─────────────────────────────┘
  ```

## 5. Ajout de chant (Contributeur)

  ```plain text
+---------------------------------------------------------+
|  AJOUTER UN CHANT                              [X]     |
+---------------------------------------------------------+
| Titre *          [________________________]             |
| Auteur/Comp.     [________________________]             |
| Recueil          [________] N° [____]                   |
| Tags             [liturgique] [entrée] [+]              |
+---------------------------------------------------------+
| PAROLES *                        | PARTITION            |
| [Section: Refrain  v]            | [Glisser un fichier] |
| +-----------------------------+  | ou [Parcourir...]    |
| | Refrain :                   |  |                      |
| | Nous chantons pour toi,     |  | Aperçu :             |
| | Seigneur de gloire...       |  | +------------------+ |
| +-----------------------------+  | |  ♪  (partition)   | |
| [+ Ajouter section]             | +------------------+ |
|                                  |                      |
| [Section: Couplet 1 v]          | ENREGISTREMENTS      |
| +-----------------------------+  | [+ Lien audio/vidéo] |
| | 1. Dans la nuit se lève...  |  | ▶ Toutes voix  [url] |
| |                             |  | ▶ Soprano       [url] |
| +-----------------------------+  | ▶ Alto           [url] |
| [+ Ajouter section]             |                      |
+---------------------------------------------------------+
| ☐ Variations de paroles connues                        |
|   [+ Ajouter une variante]                              |
+---------------------------------------------------------+
| [🤖 Compléter avec l'IA]  [Brouillon] [Soumettre]    |
+---------------------------------------------------------+
Note: Titre + Paroles = obligatoires. Reste optionnel.
Le chant est visible immédiatement par le créateur,
validation admin requise pour visibilité globale.
  ```


## Stratégie de déploiement

## Philosophie

  - 100% auto-hébergé, zéro lock-in cloud

  - Stack entièrement gratuite et open-source

  - App web d'abord, mobile plus tard

## Infrastructure

### Docker Compose (déploiement unique)

  ```yaml
services:
  app:           # Next.js (frontend + API)
  db:            # PostgreSQL + pgvector
  minio:         # Stockage fichiers (partitions PDF)
  ollama:        # LLM local (Llama/Mistral)
  redis:         # Cache & sessions (optionnel)
  ```

### Pré-requis serveur

  - Linux (Ubuntu/Debian recommandé)

  - Docker + Docker Compose v2

  - 8 Go RAM minimum (16 Go recommandé pour Ollama)

  - 20 Go stockage minimum (+ espace modèles LLM ~5-10 Go)

  - GPU optionnel mais recommandé pour l'inférence LLM

## Phases de déploiement

### Phase 1 — MVP (app web)

  - Next.js servi en SSR derrière un reverse proxy (Caddy ou Nginx)

  - HTTPS via Let's Encrypt (Caddy auto-TLS recommandé)

  - PostgreSQL + pgvector dans Docker

  - MinIO pour les partitions PDF

  - Ollama pour l'IA (suggestions, agent, chat)

  - Auth : NextAuth.js (credentials + OAuth optionnel)

### Phase 2 — PWA

  - Ajouter le manifest PWA + service worker pour usage mobile

  - Mode hors-ligne partiel (consultation des programmes préparés)

  - Notifications push pour les collaborations

### Phase 3 — App mobile native (optionnel, à évaluer)

  - React Native ou Expo si la PWA ne suffit pas

  - Réutilisation de la logique métier et de l'API existante

## Sauvegarde & maintenance

  - Backup PostgreSQL automatisé (pg_dump quotidien + rotation)

  - Backup MinIO (réplication ou rsync)

  - Watchtower ou script pour mise à jour des images Docker

  - Monitoring basique : uptime + logs Docker

## CI/CD

  - Git (GitHub/Gitea) comme source de vérité

  - GitHub Actions ou Gitea Actions pour build + tests

  - Déploiement : docker compose pull && docker compose up -d

  - Migrations Prisma appliquées au déploiement


## Plan de tests & critères d'acceptation

## Stratégie de tests

  - Tests unitaires : logique métier (suggestions, règles, modèles)

  - Tests d'intégration : API routes, interactions BDD, services externes (AELF, Romcal)

  - Tests E2E : parcours utilisateurs critiques (Playwright)

  - Outils : Vitest (unit/intégration), Playwright (E2E), Testing Library (composants React)

## Tests unitaires

### Moteur de suggestions

  - [ ] Les lectures du jour retournées par AELF génèrent des embeddings valides

  - [ ] Les suggestions sont ordonnées : lectures > fêtes > temps liturgique

  - [ ] Les chants exclus par l'animateur sont filtrés

  - [ ] Les coups de cœur apparaissent en priorité quand pertinents

  - [ ] Le filtre historique (désactivable) exclut les chants récents

  - [ ] L'ordinaire de messe propose un choix global + override par célébration

### Modèle de données

  - [ ] Un chant requiert titre + paroles minimum pour être soumis

  - [ ] Les sections de paroles supportent des formes libres (refrain, couplet, coda, contrechant...)

  - [ ] Les variantes de paroles (VersionParoles) sont associées au bon chant

  - [ ] Un chant incomplet peut être publié et complété plus tard

### Visibilité & droits

  - [ ] Un chant soumis est visible immédiatement par son créateur

  - [ ] Un chant soumis est visible dans les programmes du créateur

  - [ ] Un chant nécessite validation admin pour visibilité globale

  - [ ] Les rôles (animateur, choriste, prêtre, admin) ont les bonnes permissions

## Tests d'intégration

  - [ ] API AELF : récupération des lectures du jour avec fallback en cas d'indisponibilité

  - [ ] Romcal : calendrier liturgique correct (fêtes, temps, messes d'obligation)

  - [ ] pgvector : recherche sémantique retourne des résultats pertinents

  - [ ] Ollama : génération d'embeddings et réponses chat fonctionnelles

  - [ ] MinIO : upload et récupération de partitions PDF

  - [ ] Agent IA : scraping web + déduplication + soumission de chant

  - [ ] Auth NextAuth : inscription, connexion, sessions, rôles

## Tests E2E (parcours critiques)

  - [ ] Parcours 1 : Préparation célébration — sélectionner date → voir suggestions → prévisualiser → choisir → générer feuille PDF

  - [ ] Parcours 2 : Travail sur un chant — ouvrir chant → partition + enregistrements affichés ensemble

  - [ ] Parcours 3 : Recherche — recherche sémantique par titre/paroles → résultats pertinents

  - [ ] Parcours 4 : Chat IA — poser question → réponse cohérente + actions possibles

  - [ ] Parcours 5 : Ajout de chant — saisie titre → agent complète → review → soumission

  - [ ] Parcours 6 : Admin — valider un chant soumis → visible globalement

  - [ ] Login / Inscription — créer un compte → se connecter → accéder au dashboard

## Critères d'acceptation globaux

  - [ ] L'application fonctionne entièrement en auto-hébergé (docker compose up)

  - [ ] Aucune dépendance à un service cloud payant

  - [ ] Temps de chargement < 3s sur les pages principales

  - [ ] Responsive : utilisable sur mobile via navigateur

  - [ ] Multi-paroisse : données isolées entre paroisses

  - [ ] Suggestions pertinentes dès 50+ chants en base