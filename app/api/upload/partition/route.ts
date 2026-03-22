import { StorageService } from "@/lib/services/storage";
import type { TypePartition } from "@prisma/client";

const VALID_TYPES: TypePartition[] = ["MELODIE", "SATB", "ACCOMPAGNEMENT"];

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const chantId = formData.get("chantId");
    const type = formData.get("type");
    const tonalite = formData.get("tonalite");
    const format = formData.get("format");

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
      !type ||
      typeof type !== "string" ||
      !VALID_TYPES.includes(type as TypePartition)
    ) {
      return Response.json(
        {
          error: `Le champ 'type' est requis et doit être l'un de: ${VALID_TYPES.join(", ")}`,
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

    const result = await StorageService.uploadPartition(file, {
      chantId,
      type: type as TypePartition,
      tonalite: tonalite && typeof tonalite === "string" ? tonalite : undefined,
      format,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur interne du serveur";
    return Response.json({ error: message }, { status: 400 });
  }
}
