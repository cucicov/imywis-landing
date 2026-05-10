import type { Node, Edge } from '@xyflow/react';
import defaultProjectData from '../resources/default.json';

export interface ProjectData {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Loads the default project from default.json
 * @returns Project data containing nodes and edges
 */
export function loadDefaultProject(): ProjectData {
  return {
    nodes: defaultProjectData.nodes as Node[],
    edges: defaultProjectData.edges as Edge[],
  };
}
