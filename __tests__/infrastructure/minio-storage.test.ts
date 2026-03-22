import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSend, mockGetSignedUrl } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGetSignedUrl: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => {
  class MockS3Client {
    send = mockSend;
    constructor(public config: Record<string, unknown>) {}
  }
  class MockPutObjectCommand {
    constructor(public input: Record<string, unknown>) {}
  }
  class MockDeleteObjectCommand {
    constructor(public input: Record<string, unknown>) {}
  }
  class MockGetObjectCommand {
    constructor(public input: Record<string, unknown>) {}
  }
  return {
    S3Client: MockS3Client,
    PutObjectCommand: MockPutObjectCommand,
    DeleteObjectCommand: MockDeleteObjectCommand,
    GetObjectCommand: MockGetObjectCommand,
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

import { s3Client, uploadFile, getPresignedUrl, deleteFile } from "@/lib/storage";
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

describe("MinIO Storage (lib/storage.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("S3Client configuration", () => {
    it("should export a configured S3Client instance", () => {
      expect(s3Client).toBeDefined();
      expect(s3Client).toHaveProperty("send");
    });

    it("should configure S3Client with forcePathStyle for MinIO", () => {
      const config = (s3Client as unknown as { config: Record<string, unknown> }).config;
      expect(config).toMatchObject({
        forcePathStyle: true,
      });
    });
  });

  describe("uploadFile", () => {
    it("should upload a file and return the key", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await uploadFile("partitions", "test/file.pdf", Buffer.from("data"), "application/pdf");

      expect(result).toBe("test/file.pdf");
      expect(mockSend).toHaveBeenCalledOnce();
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input).toEqual({
        Bucket: "partitions",
        Key: "test/file.pdf",
        Body: Buffer.from("data"),
        ContentType: "application/pdf",
      });
    });

    it("should propagate errors from S3 send", async () => {
      mockSend.mockRejectedValueOnce(new Error("Upload failed"));

      await expect(
        uploadFile("partitions", "test/file.pdf", Buffer.from("data"), "application/pdf")
      ).rejects.toThrow("Upload failed");
    });
  });

  describe("getPresignedUrl", () => {
    it("should return a presigned URL with default expiry", async () => {
      mockGetSignedUrl.mockResolvedValueOnce("https://minio:9000/partitions/test/file.pdf?signed");

      const result = await getPresignedUrl("partitions", "test/file.pdf");

      expect(result).toBe("https://minio:9000/partitions/test/file.pdf?signed");
      const command = mockGetSignedUrl.mock.calls[0][1];
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input).toEqual({
        Bucket: "partitions",
        Key: "test/file.pdf",
      });
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 3600 }
      );
    });

    it("should accept a custom expiry in seconds", async () => {
      mockGetSignedUrl.mockResolvedValueOnce("https://minio:9000/audio/song.mp3?signed");

      await getPresignedUrl("audio", "song.mp3", 600);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 600 }
      );
    });

    it("should propagate errors from getSignedUrl", async () => {
      mockGetSignedUrl.mockRejectedValueOnce(new Error("Presign failed"));

      await expect(getPresignedUrl("partitions", "key")).rejects.toThrow("Presign failed");
    });
  });

  describe("deleteFile", () => {
    it("should delete a file from the specified bucket", async () => {
      mockSend.mockResolvedValueOnce({});

      await deleteFile("audio", "song.mp3");

      expect(mockSend).toHaveBeenCalledOnce();
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(command.input).toEqual({
        Bucket: "audio",
        Key: "song.mp3",
      });
    });

    it("should propagate errors from S3 send", async () => {
      mockSend.mockRejectedValueOnce(new Error("Delete failed"));

      await expect(deleteFile("audio", "song.mp3")).rejects.toThrow("Delete failed");
    });
  });
});
