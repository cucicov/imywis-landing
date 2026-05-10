import { type Edge, type Node } from '@xyflow/react';
import {NODE_TYPES, type NodeMetadata} from '../types/nodeTypes';

export const updateCurrentNode = (node: Node, field: string, newValue: unknown) => {
    return {
        ...node,
        data: {
            ...node.data,
            [field]: newValue,
        },
    };
};

export const updateNodeAndPropagate = (
    nodes: Node[],
    edges: Edge[],
    nodeId: string,
    field: string,
    newValue: unknown
): Node[] => {
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const currentNode = nodeMap.get(nodeId);

    if (!currentNode) return nodes;

    const updatedSourceNode = updateCurrentNode(currentNode, field, newValue);
    nodeMap.set(nodeId, updatedSourceNode);

    const edgesBySource = new Map<string, Edge[]>();
    edges.forEach(edge => {
        const existing = edgesBySource.get(edge.source);
        if (existing) {
            existing.push(edge);
        } else {
            edgesBySource.set(edge.source, [edge]);
        }
    });

    const queue: string[] = [nodeId];
    const processedEdges = new Set<string>();
    const visitedNodes = new Set<string>();
    const maxIterations = Math.max(1, nodes.length * Math.max(1, edges.length));
    let iterations = 0;

    while (queue.length > 0) {
        iterations += 1;
        if (iterations > maxIterations) break;

        const sourceId = queue.shift();
        if (!sourceId) continue;
        if (visitedNodes.has(sourceId)) continue;
        visitedNodes.add(sourceId);

        const sourceNode = nodeMap.get(sourceId);
        if (!sourceNode) continue;

        const outgoing = edgesBySource.get(sourceId) || [];
        outgoing.forEach(edge => {
            const edgeKey = `${edge.id ?? ''}:${edge.source}:${edge.target}:${edge.sourceHandle ?? ''}`;
            if (processedEdges.has(edgeKey)) return;
            processedEdges.add(edgeKey);

            const targetNode = nodeMap.get(edge.target);
            if (!targetNode) return;

            const updatedTargetNode = syncNodeDataFromSource(
                targetNode,
                sourceNode,
                edge.sourceHandle
            );
            nodeMap.set(edge.target, updatedTargetNode);
            if (!visitedNodes.has(edge.target)) {
                queue.push(edge.target);
            }
        });
    }

    return Array.from(nodeMap.values());
};

export const syncNodesFromEdges = (nodes: Node[], edges: Edge[]): Node[] => {
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    const activeConnections = new Map<string, Set<string>>();
    edges.forEach(edge => {
        const existing = activeConnections.get(edge.target);
        const connectionKey = `${edge.source}:${edge.sourceHandle}`;

        if (existing) {
            existing.add(connectionKey);
        } else {
            activeConnections.set(edge.target, new Set([connectionKey]));
        }
    });

    nodes.forEach(node => {
        let updatedNode = node;
        const metadata = node.data.metadata as NodeMetadata | undefined;

        metadata?.sourceNodes.forEach(source => {
            const connectionKey = `${source.nodeId}:${source.handleType}`;
            const nodeActiveConnections = activeConnections.get(node.id);
            const sourceNodeStillExists = nodeMap.has(source.nodeId);

            if (!sourceNodeStillExists || !nodeActiveConnections || !nodeActiveConnections.has(connectionKey)) {
                updatedNode = removeSourceNodeMetadata(updatedNode, source.nodeId, source.handleType);
            }
        });

        nodeMap.set(node.id, updatedNode);
    });

    let hasChanges = true;
    let iterations = 0;
    const maxIterations = Math.max(1, nodes.length * Math.max(1, edges.length));

    while (hasChanges && iterations < maxIterations) {
        iterations += 1;
        hasChanges = false;

        edges.forEach(edge => {
            const targetNode = nodeMap.get(edge.target);
            const sourceNode = nodeMap.get(edge.source);

            if (!targetNode || !sourceNode) {
                return;
            }

            const previousMetadataSignature = getMetadataSignature(targetNode);
            const updatedTargetNode = syncNodeDataFromSource(targetNode, sourceNode, edge.sourceHandle);
            const nextMetadataSignature = getMetadataSignature(updatedTargetNode);

            if (previousMetadataSignature !== nextMetadataSignature) {
                hasChanges = true;
                nodeMap.set(edge.target, updatedTargetNode);
            }
        });
    }

    return Array.from(nodeMap.values());
};

export const syncNodeDataFromSource = (
    targetNode: Node,
    sourceNode: Node | undefined,
    sourceHandle: string | null | undefined
): Node => {
    if (!sourceNode || !sourceHandle) return targetNode;

    const existingMetadata = targetNode.data.metadata as NodeMetadata | undefined;
    const metadata: NodeMetadata = {
        sourceNodes: [...(existingMetadata?.sourceNodes ?? [])],
    };
    const sourceData = sourceNode.data as Record<string, unknown>;
    const isPageToEventConnection =
        sourceNode.type === NODE_TYPES.PAGE && targetNode.type === NODE_TYPES.EVENT;

    // Special case: event nodes connected from page nodes keep the full page payload,
    // but without nested metadata to avoid recursive metadata growth.
    const dataToStore = isPageToEventConnection
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ? (({metadata, ...rest}) => rest)(sourceData)
        : targetNode.type === NODE_TYPES.BACKGROUND
            ? sourceData
            // Background nodes need the full upstream image payload in metadata.
            // Other nodes keep the previous reduced shape without duplicating source labels.
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            : (({label, ...rest}) => rest)(sourceData);

    // Check if this source already exists
    const existingIndex = metadata.sourceNodes.findIndex(
        s => s.nodeId === sourceNode.id && s.handleType === sourceHandle
    );

    const sourceNodeInfo = {
        nodeId: sourceNode.id,
        type: sourceNode.type || 'unknown',
        handleType: sourceHandle,
        data: cloneMetadataData(dataToStore),
    };

    if (existingIndex >= 0) {
        // Update existing
        metadata.sourceNodes[existingIndex] = sourceNodeInfo;
    } else {
        // Add new
        metadata.sourceNodes.push(sourceNodeInfo);
    }

    return {
        ...targetNode,
        data: {
            ...targetNode.data,
            metadata,
        },
    };
};

const cloneMetadataData = (value: Record<string, unknown>): Record<string, unknown> => {
    const cloneValue = (item: unknown): unknown => {
        if (Array.isArray(item)) {
            return item.map(cloneValue);
        }

        if (typeof item !== 'object' || item === null) {
            return item;
        }

        const output: Record<string, unknown> = {};
        Object.entries(item as Record<string, unknown>).forEach(([key, nestedValue]) => {
            output[key] = cloneValue(nestedValue);
        });
        return output;
    };

    return cloneValue(value) as Record<string, unknown>;
};

const getMetadataSignature = (node: Node) => {
    const metadata = node.data.metadata as NodeMetadata | undefined;
    return JSON.stringify(metadata?.sourceNodes ?? []);
};

export const removeSourceNodeMetadata = (
    targetNode: Node,
    sourceNodeId: string,
    sourceHandle: string | null | undefined
): Node => {
    if (!targetNode.data.metadata) return targetNode;

    const currentMetadata = targetNode.data.metadata as NodeMetadata;
    const metadata: NodeMetadata = {
        ...currentMetadata,
        sourceNodes: currentMetadata.sourceNodes.filter(
            s => !(s.nodeId === sourceNodeId && s.handleType === sourceHandle)
        ),
    };

    return {
        ...targetNode,
        data: {
            ...targetNode.data,
            metadata,
        },
    };
};
