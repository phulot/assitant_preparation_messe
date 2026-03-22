import { StorageService } from "@/lib/services/storage";
import type { TypeVoix } from "@prisma/client";

const VALID_TYPES_VOIX: TypeVoix[] = [
  "TOUTES",
  "SOPRANO",
  "ALTO",
  "TENOR",
  "BASSE",
];

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const chantId = formData.get("chantId");
    const typeVoix = formData.get("typeVoix");
    const format = formData.get("format");
    const dureeStr = formData.get("duree");

    if (!file || !(file instanceof File)) {
      return Response.json(
        { error: "Le champ 'file' est requis et doit être un fichier" },
        { status: 400 },
      );
    }

    if (!chantId || typeof chantId !== "string") {
      return Response.json(
        { error: "Le champ 'chantId' est requis" },
        { status: 400 },
      );
    }

    if (
      !typeVoix ||
      typeof typeVoix !== "string" ||
      !VALID_TYPES_VOIX.includes(typeVoix as TypeVoix)
    ) {
      return Response.json(
        {
          error: `Le champ 'typeVoix' est requis et doit être l'un de: ${VALID_TYPES_VOIX.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (!format || typeof format !== "string") {
      return Response.json(
        { error: "Le champ 'format' est requis" },
        { status: 400 },
      );
    }

    const duree =
      dureeStr && typeof dureeStr === "string"
        ? parseFloat(dureeStr)
        : undefined;

    const result = await StorageService.uploadAudio(file, {
      chantId,
      typeVoix: typeVoix as TypeVoix,
      format,
      duree: duree && !isNaN(duree) ? duree : undefined,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur interne du serveur";
    return Response.json({ error: message }, { status: 400 });
  }
}
