import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUploadPartition } = vi.hoisted(() => ({
  mockUploadPartition: vi.fn(),
}));

vi.mock("@/lib/services/storage", () => ({
  StorageService: {
    uploadPartition: mockUploadPartition,
  },
}));

import { POST } from "@/app/api/upload/partition/route";

function makeRequest(fields: Record<string, string | File | null>): Request {
  const formDataEntries = new Map<string, FormDataEntryValue>();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null) {
      formDataEntries.set(key, value);
    }
  }

  const fakeFormData = {
    get: (name: string) => formDataEntries.get(name) ?? null,
  } as unknown as FormData;

  return {
    formData: () => Promise.resolve(fakeFormData),
  } as unknown as Request;
}

describe("POST /api/upload/partition", () => {
  beforeEach(() => {
    mockUploadPartition.mockReset();
  });

  it("returns 201 with key and url on successful upload", async () => {
    mockUploadPartition.mockResolvedValueOnce({
      key: "partitions/chant-1/123.pdf",
      url: "https://minio:9000/partitions/chant-1/123.pdf?signed=true",
    });

    const file = new File(["content"], "test.pdf", {
      type: "application/pdf",
    });
    const response = await POST(
      makeRequest({
        file,
        chantId: "chant-1",
        type: "MELODIE",
        format: "pdf",
        tonalite: "Do majeur",
      }),
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.key).toBe("partitions/chant-1/123.pdf");
    expect(data.url).toContain("signed=true");
    expect(mockUploadPartition).toHaveBeenCalledWith(file, {
      chantId: "chant-1",
      type: "MELODIE",
      tonalite: "Do majeur",
      format: "pdf",
    });
  });

  it("returns 400 when file is missing", async () => {
    const response = await POST(
      makeRequest({
        chantId: "chant-1",
        type: "MELODIE",
        format: "pdf",
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("file");
  });

  it("returns 400 when chantId is missing", async () => {
    const file = new File(["content"], "test.pdf", {
      type: "application/pdf",
    });
    const response = await POST(
      makeRequest({
        file,
        type: "MELODIE",
        format: "pdf",
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("chantId");
  });

  it("returns 400 when type is invalid", async () => {
    const file = new File(["content"], "test.pdf", {
      type: "application/pdf",
    });
    const response = await POST(
      makeRequest({
        file,
        chantId: "chant-1",
        type: "INVALID",
        format: "pdf",
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("type");
  });

  it("returns 400 when StorageService throws a validation error", async () => {
    mockUploadPartition.mockRejectedValueOnce(
      new Error("Type de fichier non autorisé: exe"),
    );

    const file = new File(["content"], "test.exe", {
      type: "application/octet-stream",
    });
    const response = await POST(
      makeRequest({
        file,
        chantId: "chant-1",
        type: "MELODIE",
        format: "exe",
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Type de fichier");
  });
});
