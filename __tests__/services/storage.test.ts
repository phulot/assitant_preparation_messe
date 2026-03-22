import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUploadFile, mockGetPresignedUrl, mockDeleteFile } = vi.hoisted(
  () => ({
    mockUploadFile: vi.fn(),
    mockGetPresignedUrl: vi.fn(),
    mockDeleteFile: vi.fn(),
  }),
);

vi.mock("@/lib/storage", () => ({
  uploadFile: mockUploadFile,
  getPresignedUrl: mockGetPresignedUrl,
  deleteFile: mockDeleteFile,
}));

import { StorageService } from "@/lib/services/storage";

describe("StorageService", () => {
  beforeEach(() => {
    mockUploadFile.mockReset();
    mockGetPresignedUrl.mockReset();
    mockDeleteFile.mockReset();
  });

  describe("uploadPartition", () => {
    it("uploads a valid PDF partition and returns key and url", async () => {
      mockUploadFile.mockResolvedValueOnce("partitions/chant-1/abc123.pdf");
      mockGetPresignedUrl.mockResolvedValueOnce(
        "https://minio:9000/partitions/chant-1/abc123.pdf?signed=true",
      );

      const buffer = Buffer.alloc(1024); // 1KB file
      const result = await StorageService.uploadPartition(buffer, {
        chantId: "chant-1",
        type: "MELODIE",
        tonalite: "Do majeur",
        format: "pdf",
      });

      expect(result).toHaveProperty("key");
      expect(result).toHaveProperty("url");
      expect(result.key).toContain("chant-1");
      expect(result.url).toContain("signed=true");
      expect(mockUploadFile).toHaveBeenCalledWith(
        "partitions",
        expect.stringContaining("chant-1"),
        buffer,
        expect.stringContaining("application/pdf"),
      );
      expect(mockGetPresignedUrl).toHaveBeenCalledWith(
        "partitions",
        expect.stringContaining("chant-1"),
      );
    });

    it("uploads a valid PNG partition", async () => {
      mockUploadFile.mockResolvedValueOnce("partitions/chant-2/abc123.png");
      mockGetPresignedUrl.mockResolvedValueOnce(
        "https://minio:9000/partitions/chant-2/abc123.png?signed=true",
      );

      const buffer = Buffer.alloc(1024);
      const result = await StorageService.uploadPartition(buffer, {
        chantId: "chant-2",
        type: "SATB",
        format: "png",
      });

      expect(result).toHaveProperty("key");
      expect(result).toHaveProperty("url");
      expect(mockUploadFile).toHaveBeenCalledWith(
        "partitions",
        expect.stringContaining("chant-2"),
        expect.any(Buffer),
        "image/png",
      );
    });

    it("rejects an invalid file type", async () => {
      const buffer = Buffer.alloc(1024);
      await expect(
        StorageService.uploadPartition(buffer, {
          chantId: "chant-1",
          type: "MELODIE",
          format: "exe",
        }),
      ).rejects.toThrow(/type de fichier/i);
    });

    it("rejects a file exceeding 20MB", async () => {
      const buffer = Buffer.alloc(21 * 1024 * 1024); // 21MB
      await expect(
        StorageService.uploadPartition(buffer, {
          chantId: "chant-1",
          type: "MELODIE",
          format: "pdf",
        }),
      ).rejects.toThrow(/taille/i);
    });
  });

  describe("uploadAudio", () => {
    it("uploads a valid MP3 audio file and returns key and url", async () => {
      mockUploadFile.mockResolvedValueOnce("audio/chant-1/abc123.mp3");
      mockGetPresignedUrl.mockResolvedValueOnce(
        "https://minio:9000/audio/chant-1/abc123.mp3?signed=true",
      );

      const buffer = Buffer.alloc(2048);
      const result = await StorageService.uploadAudio(buffer, {
        chantId: "chant-1",
        typeVoix: "TOUTES",
        format: "mp3",
        duree: 180,
      });

      expect(result).toHaveProperty("key");
      expect(result).toHaveProperty("url");
      expect(result.key).toContain("chant-1");
      expect(result.url).toContain("signed=true");
      expect(mockUploadFile).toHaveBeenCalledWith(
        "audio",
        expect.stringContaining("chant-1"),
        buffer,
        "audio/mpeg",
      );
      expect(mockGetPresignedUrl).toHaveBeenCalledWith(
        "audio",
        expect.stringContaining("chant-1"),
      );
    });

    it("uploads a valid WAV audio file", async () => {
      mockUploadFile.mockResolvedValueOnce("audio/chant-3/abc123.wav");
      mockGetPresignedUrl.mockResolvedValueOnce(
        "https://minio:9000/audio/chant-3/abc123.wav?signed=true",
      );

      const buffer = Buffer.alloc(2048);
      const result = await StorageService.uploadAudio(buffer, {
        chantId: "chant-3",
        typeVoix: "SOPRANO",
        format: "wav",
      });

      expect(result).toHaveProperty("key");
      expect(result).toHaveProperty("url");
      expect(mockUploadFile).toHaveBeenCalledWith(
        "audio",
        expect.stringContaining("chant-3"),
        expect.any(Buffer),
        "audio/wav",
      );
    });

    it("rejects an invalid audio file type", async () => {
      const buffer = Buffer.alloc(1024);
      await expect(
        StorageService.uploadAudio(buffer, {
          chantId: "chant-1",
          typeVoix: "TOUTES",
          format: "avi",
        }),
      ).rejects.toThrow(/type de fichier/i);
    });

    it("rejects an audio file exceeding 100MB", async () => {
      const buffer = Buffer.alloc(101 * 1024 * 1024); // 101MB
      await expect(
        StorageService.uploadAudio(buffer, {
          chantId: "chant-1",
          typeVoix: "TOUTES",
          format: "mp3",
        }),
      ).rejects.toThrow(/taille/i);
    });
  });

  describe("getFileUrl", () => {
    it("returns a presigned download URL", async () => {
      mockGetPresignedUrl.mockResolvedValueOnce(
        "https://minio:9000/partitions/key123?signed=true",
      );

      const url = await StorageService.getFileUrl("partitions", "key123");

      expect(url).toBe("https://minio:9000/partitions/key123?signed=true");
      expect(mockGetPresignedUrl).toHaveBeenCalledWith("partitions", "key123");
    });
  });

  describe("deleteStorageFile", () => {
    it("deletes a file from the specified bucket", async () => {
      mockDeleteFile.mockResolvedValueOnce(undefined);

      await StorageService.deleteStorageFile("audio", "key456");

      expect(mockDeleteFile).toHaveBeenCalledWith("audio", "key456");
    });
  });
});
