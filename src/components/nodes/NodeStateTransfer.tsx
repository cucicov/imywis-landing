import { useRef } from 'react';
import { useReactFlow, type Edge, type Node } from '@xyflow/react';

const NodeStateTransfer = () => {
  const { getNodes, setNodes, getEdges, setEdges } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = () => {
    const nodes = getNodes();
    const edges = getEdges();
    const payload = { nodes, edges };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'nodes.json';
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as
          | Node[]
          | { nodes?: Node[]; edges?: Edge[] };
        if (Array.isArray(parsed)) {
          setNodes(parsed);
          return;
        }
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.nodes)) {
            setNodes(parsed.nodes);
          }
          if (Array.isArray(parsed.edges)) {
            setEdges(parsed.edges);
          }
        }
      } catch {
        // Ignore invalid JSON
      }
    };
    reader.readAsText(file);

    event.target.value = '';
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, display: 'flex', gap: '8px' }}>
      <button
        onClick={handleExport}
        style={{
          padding: '10px 20px',
          backgroundColor: '#1a192b',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        Export Nodes
      </button>
      <button
        onClick={triggerFilePicker}
        style={{
          padding: '10px 20px',
          backgroundColor: '#1a192b',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        Load Nodes
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default NodeStateTransfer;
