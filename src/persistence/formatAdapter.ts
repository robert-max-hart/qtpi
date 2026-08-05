import type { TreeDocument } from "../model/document";

export interface FormatAdapter {
  readonly extension: string;
  serialize(document: TreeDocument): string;
  deserialize(text: string): TreeDocument;
}

const registry = new Map<string, FormatAdapter>();

export function registerFormat(adapter: FormatAdapter): void {
  registry.set(adapter.extension, adapter);
}

export function getFormat(extension: string): FormatAdapter {
  const adapter = registry.get(extension);
  if (!adapter) {
    throw new Error(`No format adapter registered for extension: ${extension}`);
  }
  return adapter;
}
