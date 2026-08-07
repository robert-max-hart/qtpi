import { useEffect, useState } from "react";
import { createDocument, type TreeDocument } from "./model/document";
import { openDocument, saveDocument, saveDocumentAs } from "./persistence/fileIO";
import { Toolbar } from "./ui/Toolbar";
import { Canvas } from "./ui/canvas/Canvas";
import { TagManagerDialog } from "./ui/dialogs/TagManagerDialog";
import { UnsavedChangesDialog } from "./ui/dialogs/UnsavedChangesDialog";
import { InspectorPanel } from "./ui/inspector/InspectorPanel";

const DEFAULT_FILE_NAME = "quest-tree.json";

type PendingAction = "new" | "load";

function App() {
  const [treeDocument, setTreeDocument] = useState(createDocument);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [fileName, setFileName] = useState(DEFAULT_FILE_NAME);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty) return;
      event.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function handleChangeDocument(next: TreeDocument) {
    setTreeDocument(next);
    setIsDirty(true);
  }

  function resetToNewDocument() {
    setTreeDocument(createDocument());
    setSelectedNodeId(null);
    setFileHandle(null);
    setFileName(DEFAULT_FILE_NAME);
    setIsDirty(false);
    setError(null);
  }

  async function loadFromDisk() {
    try {
      const result = await openDocument();
      if (!result) return; // user cancelled the picker
      setTreeDocument(result.document);
      setSelectedNodeId(null);
      setFileHandle(result.handle);
      setFileName(result.fileName);
      setIsDirty(false);
      setError(null);
    } catch {
      setError("Could not load that file - it may not be a valid quest tree JSON file.");
    }
  }

  function requestNew() {
    if (isDirty) {
      setPendingAction("new");
    } else {
      resetToNewDocument();
    }
  }

  function requestLoad() {
    if (isDirty) {
      setPendingAction("load");
    } else {
      void loadFromDisk();
    }
  }

  async function handleSave() {
    try {
      const result = await saveDocument(treeDocument, fileHandle, fileName);
      if (!result) return null; // user cancelled the picker
      setFileHandle(result.handle);
      setFileName(result.fileName);
      setIsDirty(false);
      setError(null);
      return result;
    } catch {
      setError("Could not save the file.");
      return null;
    }
  }

  async function handleSaveAs() {
    try {
      const result = await saveDocumentAs(treeDocument, fileName);
      if (!result) return null;
      setFileHandle(result.handle);
      setFileName(result.fileName);
      setIsDirty(false);
      setError(null);
      return result;
    } catch {
      setError("Could not save the file.");
      return null;
    }
  }

  function proceedPendingAction(action: PendingAction) {
    if (action === "new") {
      resetToNewDocument();
    } else {
      void loadFromDisk();
    }
  }

  async function handlePendingSave() {
    const action = pendingAction;
    if (!action) return;
    const result = await handleSave();
    if (!result) return; // save cancelled or failed - stay put, dialog remains open
    setPendingAction(null);
    proceedPendingAction(action);
  }

  function handlePendingDiscard() {
    const action = pendingAction;
    setPendingAction(null);
    if (action) proceedPendingAction(action);
  }

  function handlePendingCancel() {
    setPendingAction(null);
  }

  return (
    <div className="app">
      <Toolbar
        fileName={fileName}
        isDirty={isDirty}
        onNew={requestNew}
        onLoad={requestLoad}
        onSave={() => void handleSave()}
        onSaveAs={() => void handleSaveAs()}
        onOpenTagManager={() => setIsTagManagerOpen(true)}
      />
      {error && (
        <p className="app-error" role="alert">
          {error}
        </p>
      )}
      <div className="app-body">
        <Canvas document={treeDocument} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />
        <InspectorPanel
          document={treeDocument}
          selectedNodeId={selectedNodeId}
          onChangeDocument={handleChangeDocument}
          onSelectNode={setSelectedNodeId}
        />
      </div>
      {isTagManagerOpen && (
        <TagManagerDialog
          document={treeDocument}
          onChangeDocument={handleChangeDocument}
          onClose={() => setIsTagManagerOpen(false)}
        />
      )}
      {pendingAction && (
        <UnsavedChangesDialog
          fileName={fileName}
          onSave={() => void handlePendingSave()}
          onDiscard={handlePendingDiscard}
          onCancel={handlePendingCancel}
        />
      )}
    </div>
  );
}

export default App;
