import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUploadAudio } = vi.hoisted(() => ({
  mockUploadAudio: vi.fn(),
}));

vi.mock("@/lib/services/storage", () => ({
  StorageService: {
    uploadAudio: mockUploadAudio,
  },
}));

import { POST } from "@/app/api/upload/audio/route";

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

describe("POST /api/upload/audio", () => {
  beforeEach(() => {
    mockUploadAudio.mockReset();
  });

  it("returns 201 with key and url on successful upload", async () => {
    mockUploadAudio.mockResolvedValueOnce({
      key: "audio/chant-1/123.mp3",
      url: "https://minio:9000/audio/chant-1/123.mp3?signed=true",
    });

    const file = new File(["content"], "test.mp3", { type: "audio/mpeg" });
    const response = await POST(
      makeRequest({
        file,
        chantId: "chant-1",
        typeVoix: "TOUTES",
        format: "mp3",
        duree: "180",
      }),
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.key).toBe("audio/chant-1/123.mp3");
    expect(data.url).toContain("signed=true");
    expect(mockUploadAudio).toHaveBeenCalledWith(file, {
      chantId: "chant-1",
      typeVoix: "TOUTES",
      format: "mp3",
      duree: 180,
    });
  });

  it("returns 400 when file is missing", async () => {
    const response = await POST(
      makeRequest({
        chantId: "chant-1",
        typeVoix: "TOUTES",
        format: "mp3",
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("file");
  });

  it("returns 400 when typeVoix is invalid", async () => {
    const file = new File(["content"], "test.mp3", { type: "audio/mpeg" });
    const response = await POST(
      makeRequest({
        file,
        chantId: "chant-1",
        typeVoix: "INVALID",
        format: "mp3",
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("typeVoix");
  });

  it("returns 400 when StorageService throws a validation error", async () => {
    mockUploadAudio.mockRejectedValueOnce(
      new Error("Type de fichier non autorisé: avi"),
    );

    const file = new File(["content"], "test.avi", {
      type: "video/avi",
    });
    const response = await POST(
      makeRequest({
        file,
        chantId: "chant-1",
        typeVoix: "TOUTES",
        format: "avi",
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Type de fichier");
  });
});
