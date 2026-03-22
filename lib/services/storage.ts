import { uploadFile, getPresignedUrl, deleteFile } from "@/lib/storage";
import type { TypePartition, TypeVoix } from "@prisma/client";

const PARTITION_ALLOWED_FORMATS = ["pdf", "png", "jpg", "jpeg"];
const AUDIO_ALLOWED_FORMATS = ["mp3", "wav", "ogg", "flac", "m4a"];

const MAX_PARTITION_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB

const CONTENT_TYPE_MAP: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
  m4a: "audio/mp4",
};

function getFileSize(file: File | Buffer): number {
  if (Buffer.isBuffer(file)) {
    return file.length;
  }
  return file.size;
}

async function fileToBuffer(file: File | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(file)) {
    return file;
  }
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function generateKey(prefix: string, chantId: string, format: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}/${chantId}/${timestamp}-${random}.${format.toLowerCase()}`;
}

export const StorageService = {
  async uploadPartition(
    file: File | Buffer,
    metadata: {
      chantId: string;
      type: TypePartition;
      tonalite?: string;
      format: string;
    },
  ): Promise<{ key: string; url: string }> {
    const format = metadata.format.toLowerCase();

    if (!PARTITION_ALLOWED_FORMATS.includes(format)) {
      throw new Error(
        `Type de fichier non autorisé: ${format}. Formats acceptés: ${PARTITION_ALLOWED_FORMATS.join(", ")}`,
      );
    }

    const size = getFileSize(file);
    if (size > MAX_PARTITION_SIZE) {
      throw new Error(
        `La taille du fichier (${Math.round(size / 1024 / 1024)}MB) dépasse la taille maximale autorisée (20MB)`,
      );
    }

    const key = generateKey("partitions", metadata.chantId, format);
    const contentType = CONTENT_TYPE_MAP[format] ?? "application/octet-stream";
    const buffer = await fileToBuffer(file);

    await uploadFile("partitions", key, buffer, contentType);
    const url = await getPresignedUrl("partitions", key);

    return { key, url };
  },

  async uploadAudio(
    file: File | Buffer,
    metadata: {
      chantId: string;
      typeVoix: TypeVoix;
      format: string;
      duree?: number;
    },
  ): Promise<{ key: string; url: string }> {
    const format = metadata.format.toLowerCase();

    if (!AUDIO_ALLOWED_FORMATS.includes(format)) {
      throw new Error(
        `Type de fichier non autorisé: ${format}. Formats acceptés: ${AUDIO_ALLOWED_FORMATS.join(", ")}`,
      );
    }

    const size = getFileSize(file);
    if (size > MAX_AUDIO_SIZE) {
      throw new Error(
        `La taille du fichier (${Math.round(size / 1024 / 1024)}MB) dépasse la taille maximale autorisée (100MB)`,
      );
    }

    const key = generateKey("audio", metadata.chantId, format);
    const contentType = CONTENT_TYPE_MAP[format] ?? "application/octet-stream";
    const buffer = await fileToBuffer(file);

    await uploadFile("audio", key, buffer, contentType);
    const url = await getPresignedUrl("audio", key);

    return { key, url };
  },

  async getFileUrl(bucket: string, key: string): Promise<string> {
    return getPresignedUrl(bucket, key);
  },

  async deleteStorageFile(bucket: string, key: string): Promise<void> {
    await deleteFile(bucket, key);
  },
};
