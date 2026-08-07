import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDocument } from "../model/document";
import { getFormat } from "./index";
import { openDocument, saveDocument, saveDocumentAs, supportsFileSystemAccess } from "./fileIO";

function makeFakeWritable() {
  const chunks: string[] = [];
  return {
    chunks,
    write: vi.fn(async (data: string) => {
      chunks.push(data);
    }),
    close: vi.fn(async () => {}),
  };
}

function makeFakeFileHandle(
  name: string,
  writable: ReturnType<typeof makeFakeWritable>,
): FileSystemFileHandle {
  return {
    kind: "file" as const,
    name,
    getFile: vi.fn(async () => new File([], name)),
    createWritable: vi.fn(async () => writable as unknown as FileSystemWritableFileStream),
    isSameEntry: vi.fn(async () => false),
  };
}

describe("supportsFileSystemAccess", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "showOpenFilePicker");
    Reflect.deleteProperty(window, "showSaveFilePicker");
  });

  it("is false when the picker API is absent", () => {
    expect(supportsFileSystemAccess()).toBe(false);
  });

  it("is false when only one of the two pickers is present", () => {
    window.showOpenFilePicker = vi.fn();
    expect(supportsFileSystemAccess()).toBe(false);
  });

  it("is true when both pickers are present", () => {
    window.showOpenFilePicker = vi.fn();
    window.showSaveFilePicker = vi.fn();
    expect(supportsFileSystemAccess()).toBe(true);
  });
});

describe("openDocument via File System Access API", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "showOpenFilePicker");
  });

  it("returns the deserialized document, handle, and file name", async () => {
    const document = createDocument();
    const text = getFormat("json").serialize(document);
    const file = new File([text], "my-quest.json");
    const handle = {
      kind: "file" as const,
      name: "my-quest.json",
      getFile: vi.fn(async () => file),
      createWritable: vi.fn(),
      isSameEntry: vi.fn(async () => false),
    };
    window.showOpenFilePicker = vi.fn(async () => [handle]);

    const result = await openDocument();

    expect(result).not.toBeNull();
    expect(result?.fileName).toBe("my-quest.json");
    expect(result?.handle).toBe(handle);
    expect(result?.document.rootId).toBe(document.rootId);
  });

  it("returns null when the user cancels the picker", async () => {
    window.showOpenFilePicker = vi.fn(async () => {
      throw new DOMException("cancelled", "AbortError");
    });

    const result = await openDocument();

    expect(result).toBeNull();
  });
});

describe("openDocument fallback (no File System Access API)", () => {
  it("resolves with the parsed document once a file is chosen", async () => {
    const document = createDocument();
    const text = getFormat("json").serialize(document);
    const file = new File([text], "fallback.json");

    const promise = openDocument();

    const input = window.document.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input!.dispatchEvent(new Event("change"));

    const result = await promise;
    expect(result?.fileName).toBe("fallback.json");
    expect(result?.handle).toBeNull();
    expect(result?.document.rootId).toBe(document.rootId);
  });

  it("resolves null if the window regains focus without a file being chosen", async () => {
    vi.useFakeTimers();
    try {
      const promise = openDocument();
      window.dispatchEvent(new Event("focus"));
      await vi.advanceTimersByTimeAsync(400);
      const result = await promise;
      expect(result).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("saveDocument", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "showSaveFilePicker");
  });

  it("writes directly to an existing handle without prompting", async () => {
    const document = createDocument();
    const writable = makeFakeWritable();
    const handle = makeFakeFileHandle("existing.json", writable);
    window.showSaveFilePicker = vi.fn();

    const result = await saveDocument(document, handle, "unused.json");

    expect(window.showSaveFilePicker).not.toHaveBeenCalled();
    expect(writable.write).toHaveBeenCalledWith(getFormat("json").serialize(document));
    expect(writable.close).toHaveBeenCalled();
    expect(result).toEqual({ handle, fileName: "existing.json" });
  });

  it("falls back to Save As when there is no handle", async () => {
    const document = createDocument();
    const writable = makeFakeWritable();
    const handle = makeFakeFileHandle("new.json", writable);
    window.showSaveFilePicker = vi.fn(async () => handle);

    const result = await saveDocument(document, null, "new.json");

    expect(window.showSaveFilePicker).toHaveBeenCalled();
    expect(result).toEqual({ handle, fileName: "new.json" });
  });
});

describe("saveDocumentAs via File System Access API", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "showSaveFilePicker");
  });

  it("always prompts, even if a handle already exists elsewhere", async () => {
    const document = createDocument();
    const writable = makeFakeWritable();
    const handle = makeFakeFileHandle("chosen.json", writable);
    window.showSaveFilePicker = vi.fn(async () => handle);

    const result = await saveDocumentAs(document, "suggested.json");

    expect(window.showSaveFilePicker).toHaveBeenCalledWith(
      expect.objectContaining({ suggestedName: "suggested.json" }),
    );
    expect(result).toEqual({ handle, fileName: "chosen.json" });
  });

  it("returns null when the user cancels the picker", async () => {
    window.showSaveFilePicker = vi.fn(async () => {
      throw new DOMException("cancelled", "AbortError");
    });

    const result = await saveDocumentAs(createDocument(), "suggested.json");

    expect(result).toBeNull();
  });
});

describe("saveDocumentAs fallback (no File System Access API)", () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => "blob:fake-url");
    revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("triggers a download with the suggested file name", async () => {
    // jsdom attempts to actually navigate on anchor.click() with an href set;
    // stub it out since we only care that the download was *initiated*.
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const document = createDocument();

    const result = await saveDocumentAs(document, "download-me.json");

    expect(clickSpy).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
    expect(result).toEqual({ handle: null, fileName: "download-me.json" });

    clickSpy.mockRestore();
  });
});
