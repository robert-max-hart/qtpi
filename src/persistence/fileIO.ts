import type { TreeDocument } from "../model/document";
import { getFormat } from "./index";

const JSON_ACCEPT_TYPE = {
  description: "Quest tree JSON",
  accept: { "application/json": [".json"] },
};

function supportsOpenPicker(): boolean {
  return typeof window !== "undefined" && typeof window.showOpenFilePicker === "function";
}

function supportsSavePicker(): boolean {
  return typeof window !== "undefined" && typeof window.showSaveFilePicker === "function";
}

/** `Blob.text()` isn't implemented by jsdom; `FileReader` works everywhere. */
function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

export interface OpenedFile {
  document: TreeDocument;
  handle: FileSystemFileHandle | null;
  fileName: string;
}

export interface SavedFile {
  handle: FileSystemFileHandle | null;
  fileName: string;
}

/** Resolves to `null` if the user cancels the picker. */
export async function openDocument(): Promise<OpenedFile | null> {
  if (supportsOpenPicker()) {
    let handles: FileSystemFileHandle[];
    try {
      handles = await window.showOpenFilePicker!({ types: [JSON_ACCEPT_TYPE] });
    } catch (err) {
      if (isAbortError(err)) return null;
      throw err;
    }
    const handle = handles[0];
    const file = await handle.getFile();
    const text = await readFileText(file);
    return { document: getFormat("json").deserialize(text), handle, fileName: file.name };
  }
  return openDocumentFallback();
}

/**
 * Saves to the existing handle if there is one, otherwise behaves like
 * `saveDocumentAs`. Resolves to `null` if the user cancels a picker.
 */
export async function saveDocument(
  document: TreeDocument,
  handle: FileSystemFileHandle | null,
  suggestedName: string,
): Promise<SavedFile | null> {
  if (handle) {
    await writeToHandle(handle, getFormat("json").serialize(document));
    return { handle, fileName: handle.name };
  }
  return saveDocumentAs(document, suggestedName);
}

/** Always prompts for a location, ignoring any existing handle. */
export async function saveDocumentAs(
  document: TreeDocument,
  suggestedName: string,
): Promise<SavedFile | null> {
  const text = getFormat("json").serialize(document);

  if (supportsSavePicker()) {
    let handle: FileSystemFileHandle;
    try {
      handle = await window.showSaveFilePicker!({
        suggestedName,
        types: [JSON_ACCEPT_TYPE],
      });
    } catch (err) {
      if (isAbortError(err)) return null;
      throw err;
    }
    await writeToHandle(handle, text);
    return { handle, fileName: handle.name };
  }

  downloadFallback(text, suggestedName);
  return { handle: null, fileName: suggestedName };
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

async function writeToHandle(handle: FileSystemFileHandle, text: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

/** Browsers without the File System Access API (Safari/Firefox) fall back to `<input type=file>`. */
function openDocumentFallback(): Promise<OpenedFile | null> {
  return new Promise((resolve, reject) => {
    const input = window.document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    let settled = false;

    function cleanup() {
      window.removeEventListener("focus", onFocus);
      input.remove();
    }

    function settleCancelled() {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(null);
    }

    // Chromium/Firefox fire a real "cancel" event when the dialog is
    // dismissed with no selection - a reliable signal, unlike the
    // focus-timing heuristic below. Harmless to always listen for: on
    // browsers that don't support it, it simply never fires.
    input.addEventListener("cancel", settleCancelled);

    // Fallback for browsers without the "cancel" event above (older Safari):
    // picking up window focus returning (after a beat, so a real `change`
    // event can still win the race if it's merely running a bit behind) is
    // the standard heuristic for detecting a dismissed dialog.
    function onFocus() {
      setTimeout(settleCancelled, 300);
    }

    input.addEventListener("change", () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", onFocus);
      const file = input.files?.[0];
      cleanup();
      if (!file) {
        resolve(null);
        return;
      }
      readFileText(file)
        .then((text) =>
          resolve({ document: getFormat("json").deserialize(text), handle: null, fileName: file.name }),
        )
        .catch(reject);
    });

    window.addEventListener("focus", onFocus);
    window.document.body.appendChild(input);
    input.click();
  });
}

/** Browsers without the File System Access API fall back to a plain download. */
function downloadFallback(text: string, fileName: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
