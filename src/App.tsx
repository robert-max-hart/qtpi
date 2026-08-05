import { useState } from "react";
import { createDocument } from "./model/document";
import { Toolbar } from "./ui/Toolbar";
import { Canvas } from "./ui/canvas/Canvas";
import { TagManagerDialog } from "./ui/dialogs/TagManagerDialog";
import { InspectorPanel } from "./ui/inspector/InspectorPanel";

function App() {
  const [treeDocument, setTreeDocument] = useState(createDocument);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

  return (
    <div className="app">
      <Toolbar onOpenTagManager={() => setIsTagManagerOpen(true)} />
      <div className="app-body">
        <Canvas
          document={treeDocument}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
        />
        <InspectorPanel
          document={treeDocument}
          selectedNodeId={selectedNodeId}
          onChangeDocument={setTreeDocument}
          onSelectNode={setSelectedNodeId}
        />
      </div>
      {isTagManagerOpen && (
        <TagManagerDialog
          document={treeDocument}
          onChangeDocument={setTreeDocument}
          onClose={() => setIsTagManagerOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
