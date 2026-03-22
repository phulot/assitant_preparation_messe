import { ollamaChat } from "@/lib/ai/provider";
import type { ChatMessage } from "@/lib/ai/provider";

export interface CharacterizationResult {
  tempsLiturgiques: string[];
  themes: string[];
  momentsCelebration: string[];
  ambiance: string;
}

const SYSTEM_PROMPT = `Tu es un expert en liturgie catholique et en chants liturgiques francophones.
Ta tache est de caracteriser un chant liturgique en analysant son titre et ses paroles.

Tu dois repondre UNIQUEMENT avec un objet JSON valide, sans markdown, sans explication, sans texte supplementaire.

Le JSON doit avoir exactement cette structure :
{
  "tempsLiturgiques": [],
  "themes": [],
  "momentsCelebration": [],
  "ambiance": ""
}

Valeurs autorisees pour tempsLiturgiques : AVENT, NOEL, ORDINAIRE, CAREME, PAQUES, PENTECOTE
Valeurs autorisees pour momentsCelebration : ENTREE, OFFERTOIRE, COMMUNION, ENVOI, KYRIE, GLORIA, SANCTUS, AGNUS, PSAUME, MEDITATION

Pour themes, utilise des mots-cles libres en francais (ex: esperance, lumiere, paix, louange, penitence).
Pour ambiance, utilise un seul mot descriptif en francais (ex: joyeux, solennel, meditatif, recueilli, triomphal).`;

export async function characterizeSong(
  title: string,
  lyrics: string,
): Promise<CharacterizationResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Titre : ${title}\n\nParoles :\n${lyrics}`,
    },
  ];

  const response = await ollamaChat(messages, { temperature: 0.3 });

  let parsed: CharacterizationResult;
  try {
    parsed = JSON.parse(response) as CharacterizationResult;
  } catch {
    throw new Error(
      `Failed to parse LLM response as JSON. Response was: ${response.substring(0, 200)}`,
    );
  }

  return parsed;
}
