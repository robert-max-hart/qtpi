import type { TreeDocument } from "../../model/document";

/** Walks up from a node to the root, returning any ancestor ids that are currently collapsed. */
export function collapsedAncestorsOf(
  document: TreeDocument,
  nodeId: string,
  collapsedIds: ReadonlySet<string>,
): string[] {
  const result: string[] = [];
  let currentId = document.nodes[nodeId]?.parent ?? null;
  while (currentId) {
    if (collapsedIds.has(currentId)) result.push(currentId);
    currentId = document.nodes[currentId]?.parent ?? null;
  }
  return result;
}
