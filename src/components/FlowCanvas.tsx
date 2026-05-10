import {
  ReactFlow,
  useNodesState,
  useEdgesState, Background,
  addEdge,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import '@xyflow/react/dist/style.css';
import PageNode from './nodes/PageNode.tsx';
import AddPageNodeButton from './nodes/buttons/AddPageNodeButton.tsx';
import AddImageNodeButton from "./nodes/buttons/AddImageNodeButton.tsx";
import ImageNode from "./nodes/ImageNode.tsx";
import NodeStateTransfer from "./nodes/NodeStateTransfer.tsx";
import type {PageNodeData} from "../types/nodeTypes.ts";
import {syncNodesFromEdges} from "../utils/nodeUtils.ts";
import {NODE_TYPES} from '../types/nodeTypes';
import {CONNECTION_RULES} from "../types/handleTypes.ts";
import P5Preview from './P5Preview.tsx';
import BackgroundNode from './nodes/BackgroundNode.tsx';
import AddBackgroundNodeButton from './nodes/buttons/AddBackgroundNodeButton.tsx';
import {toNumberOrNull} from '../utils/numberUtils.ts';
import TextNode from './nodes/TextNode.tsx';
import AddTextNodeButton from './nodes/buttons/AddTextNodeButton.tsx';
import EventNode from './nodes/EventNode.tsx';
import AddEventNodeButton from './nodes/buttons/AddEventNodeButton.tsx';
import ExternalLinkNode from './nodes/ExternalLinkNode.tsx';
import AddExternalLinkNodeButton from './nodes/buttons/AddExternalLinkNodeButton.tsx';
import LatestSelectedPageNameBadge from './nodes/buttons/LatestSelectedPageNameBadge.tsx';
import {
  getLatestSelectedPageNameFromSession,
  setLatestSelectedPageNameInSession,
} from '../utils/sessionStorage.ts';
import { loadDefaultProject } from '../utils/projectLoader.ts';

const nodeTypes = {
  pageNode: PageNode,
  imageNode: ImageNode,
  backgroundNode: BackgroundNode,
  textNode: TextNode,
  eventNode: EventNode,
  externalLinkNode: ExternalLinkNode,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

type NodeDataWithMetadata = {
  metadata?: {
    sourceNodes?: Array<{ nodeId: string; handleType: string }>;
  };
  connectionImpactKey?: number;
  [key: string]: unknown;
};


const FlowCanvas = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [latestSelectedPageName, setLatestSelectedPageName] = useState(() => getLatestSelectedPageNameFromSession());
  const previousMetadataSignatureByNodeIdRef = useRef<Map<string, string>>(new Map());
  const [viewportSize, setViewportSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));


  const persistSelectedPageNode = useCallback((node: Node) => {
    if (node.type !== NODE_TYPES.PAGE) {
      return;
    }

    const pageData = node.data as PageNodeData | undefined;
    const nextPageName = resolveSelectedPageName(pageData?.name);
    setLatestSelectedPageName(nextPageName);
    setLatestSelectedPageNameInSession(nextPageName);
  }, []);

  const onSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: Node[] }) => {
    const selectedPageNode = selectedNodes.find((node) => node.type === NODE_TYPES.PAGE);
    if (selectedPageNode) {
      persistSelectedPageNode(selectedPageNode);
    }
  }, [persistSelectedPageNode]);

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    persistSelectedPageNode(node);
  }, [persistSelectedPageNode]);

  const onConnect = useCallback(
      (connection: Connection) => {
        const normalizedConnection = normalizeConnectionDirection(connection);
        if (!normalizedConnection) {
          return;
        }

        const sourceId = normalizedConnection.source;
        const targetId = normalizedConnection.target;

        if (!sourceId || !targetId) {
          return;
        }

        setEdges((eds) => addEdge(normalizedConnection, eds));
      },
      [setEdges]
  );

  // Load default project on mount - using same logic as user file import
  useEffect(() => {
    const defaultProject = loadDefaultProject();
    if (Array.isArray(defaultProject.nodes)) {
      setNodes(defaultProject.nodes);
    }
    if (Array.isArray(defaultProject.edges)) {
      setEdges(defaultProject.edges);
    }
  }, [setNodes, setEdges]);

  // Update target nodes when connections change
  useEffect(() => {
    setNodes((currentNodes) => syncNodesFromEdges(currentNodes, edges));
  }, [edges, setNodes]);

  // Trigger impact animation whenever a node metadata payload changes
  useEffect(() => {
    if (!animationsEnabled) {
      setNodes((currentNodes) => {
        let hasChanges = false;
        const nextNodes = currentNodes.map((node) => {
          if (!node.data.connectionImpactKey) {
            return node;
          }

          hasChanges = true;
          return {
            ...node,
            data: {
              ...node.data,
              connectionImpactKey: undefined,
            },
          };
        });

        return hasChanges ? nextNodes : currentNodes;
      });
      return;
    }

    const currentSignatures = new Map<string, string>();
    const impactedNodeIds: string[] = [];

    nodes.forEach((node) => {
      const nodeData = node.data as NodeDataWithMetadata;
      const metadataSignature = JSON.stringify(nodeData.metadata?.sourceNodes ?? []);
      currentSignatures.set(node.id, metadataSignature);

      const previousSignature = previousMetadataSignatureByNodeIdRef.current.get(node.id);
      if (typeof previousSignature === 'string' && previousSignature !== metadataSignature) {
        impactedNodeIds.push(node.id);
      }
    });

    previousMetadataSignatureByNodeIdRef.current = currentSignatures;

    if (impactedNodeIds.length === 0) {
      return;
    }

    const impactKey = Date.now();
    const impactedNodeIdSet = new Set(impactedNodeIds);

    setNodes((currentNodes) => currentNodes.map((node) => {
      if (!impactedNodeIdSet.has(node.id)) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          connectionImpactKey: impactKey,
        },
      };
    }));

    window.setTimeout(() => {
      setNodes((currentNodes) => currentNodes.map((node) => {
        if (!impactedNodeIdSet.has(node.id)) {
          return node;
        }

        if (node.data.connectionImpactKey !== impactKey) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            connectionImpactKey: undefined,
          },
        };
      }));
    }, 520);
  }, [animationsEnabled, nodes, setNodes]);

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', updateViewportSize);
    return () => window.removeEventListener('resize', updateViewportSize);
  }, []);

  const sceneSize = useMemo(() => {
    const pageNode = nodes.find(node => node.type === NODE_TYPES.PAGE);
    const pageData = pageNode?.data as PageNodeData | undefined;

    const configuredWidth = toNumberOrNull(pageData?.width);
    const configuredHeight = toNumberOrNull(pageData?.height);

    const canvasWidth = Math.max(1, configuredWidth ?? viewportSize.width);
    const canvasHeight = Math.max(1, configuredHeight ?? viewportSize.height);

    return {
      width: Math.max(canvasWidth, viewportSize.width),
      height: Math.max(canvasHeight, viewportSize.height),
    };
  }, [nodes, viewportSize.height, viewportSize.width]);

  const pageBackgroundColor = useMemo(() => {
    const pageNode = nodes.find(node => node.type === NODE_TYPES.PAGE);
    const pageData = pageNode?.data as PageNodeData | undefined;
    return resolvePageBackgroundColor(pageData?.backgroundColor);
  }, [nodes]);

  // validate node connections based on the node input type
  const isValidConnection = useCallback((connection: Edge | Connection) => {
    const normalizedConnection = normalizeConnectionDirection(connection);
    if (!normalizedConnection) {
      return false;
    }

    const sourceHandle = normalizedConnection.sourceHandle;
    const targetHandle = normalizedConnection.targetHandle;
    const targetNode = nodes.find(node => node.id === normalizedConnection.target);

    // Disallow multiple connections between the same nodes
    const hasConnectionBetweenNodes = edges.some(
      (edge) =>
        (edge.source === normalizedConnection.source && edge.target === normalizedConnection.target)
        || (edge.source === normalizedConnection.target && edge.target === normalizedConnection.source)
    );

    const sourceType = sourceHandle?.split('-')[0];
    const targetType = targetHandle?.split('-')[0];

    if (sourceType !== targetType) {
      return false;
    }

    if (hasConnectionBetweenNodes) {
      return false;
    }

    const isTextNodeInput = String(targetNode?.type) === NODE_TYPES.TEXT
      && (targetType === 'turquoise' || targetType === 'sage');

    if (isTextNodeInput) {
      return true;
    }

    const rules = CONNECTION_RULES[targetType || ''];
    if (!rules?.allowMultiple) {
      const existingConnection = edges.find(
        (edge) => edge.target === normalizedConnection.target && edge.targetHandle === targetHandle
      );
      if (existingConnection) {
        return false;
      }
    }

    return true;
  }, [edges, nodes]);

  return (
    <div
      id="imywis-flow-scroll-container"
      className={animationsEnabled ? undefined : 'imywis-animations-disabled'}
      style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'auto' }}
    >
      <div
        style={{
          width: `${sceneSize.width}px`,
          height: `${sceneSize.height}px`,
          minWidth: '100%',
          minHeight: '100%',
          position: 'relative',
        }}
      >
        {/*<button*/}
        {/*  type="button"*/}
        {/*  onClick={() => setAnimationsEnabled((value) => !value)}*/}
        {/*  style={{*/}
        {/*    position: 'absolute',*/}
        {/*    top: '8px',*/}
        {/*    right: '328px',*/}
        {/*    zIndex: 1000,*/}
        {/*    borderRadius: '6px',*/}
        {/*    border: '1px solid #8a8a8a',*/}
        {/*    backgroundColor: animationsEnabled ? '#f3f7ff' : '#f5f5f5',*/}
        {/*    color: '#202020',*/}
        {/*    padding: '8px 12px',*/}
        {/*    fontSize: '12px',*/}
        {/*    fontWeight: 700,*/}
        {/*    letterSpacing: '0.02em',*/}
        {/*  }}*/}
        {/*>*/}
        {/*  {animationsEnabled ? 'Animations: ON' : 'Animations: OFF'}*/}
        {/*</button>*/}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectionChange={onSelectionChange}
          onNodeClick={onNodeClick}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          isValidConnection={isValidConnection}
          fitView
          style={{ width: '100%', height: '100%' }}
        >
          {previewEnabled ? <P5Preview nodes={nodes} /> : null}
          {/*<NodeStateTransfer />*/}
          {/*<AddPageNodeButton />*/}
          {/*<AddImageNodeButton />*/}
          {/*<AddBackgroundNodeButton />*/}
          {/*<AddTextNodeButton />*/}
          {/*<AddEventNodeButton />*/}
          {/*<AddExternalLinkNodeButton />*/}
          {/*<LatestSelectedPageNameBadge*/}
          {/*  pageName={latestSelectedPageName}*/}
          {/*  previewEnabled={previewEnabled}*/}
          {/*  onPreviewEnabledChange={setPreviewEnabled}*/}
          {/*/>*/}
          <Background bgColor={pageBackgroundColor} />
        </ReactFlow>
      </div>
    </div>
  );
};

const resolvePageBackgroundColor = (value: unknown) => {
  if (typeof value !== 'string') {
    return '#ffffff';
  }

  const trimmed = value.trim();
  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(trimmed) ? trimmed : '#ffffff';
};

const normalizeConnectionDirection = (connection: Edge | Connection): Connection | null => {
  const source = connection.source;
  const target = connection.target;
  const sourceHandle = connection.sourceHandle;
  const targetHandle = connection.targetHandle;

  if (!source || !target || !sourceHandle || !targetHandle) {
    return null;
  }

  const sourceRole = getHandleRole(sourceHandle);
  const targetRole = getHandleRole(targetHandle);

  if (sourceRole === 'output' && targetRole === 'input') {
    return {
      source,
      target,
      sourceHandle,
      targetHandle,
    };
  }

  if (sourceRole === 'input' && targetRole === 'output') {
    return {
      source: target,
      target: source,
      sourceHandle: targetHandle,
      targetHandle: sourceHandle,
    };
  }

  return null;
};

const getHandleRole = (handleId: string): 'input' | 'output' | null => {
  if (handleId.includes('-input')) {
    return 'input';
  }
  if (handleId.includes('-output')) {
    return 'output';
  }
  return null;
};

const resolveSelectedPageName = (value: unknown) => {
  if (typeof value !== 'string') {
    return 'Unnamed page';
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : 'Unnamed page';
};

export default FlowCanvas;
