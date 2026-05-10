import type {Edge, Node} from '@xyflow/react';
import {supabase} from './supabaseClient.ts';

export type ExportedNodesJson = {
  nodes: Node[];
  edges: Edge[];
};

export const saveProjectDataToUserProfile = async (
  userId: string,
  exportedNodesJson: ExportedNodesJson
) => {
  const sanitizedProjectData = sanitizeProjectForProfileStorage(exportedNodesJson);

  const {data: byUserIdData, error: byUserIdError} = await supabase
    .from('user_profiles')
    .update({data: sanitizedProjectData})
    .eq('user_id', userId);

  if (byUserIdError) {
    console.error('Error updating profile data by user_id:', byUserIdError);
    throw new Error(`Failed to update profile data by user_id: ${byUserIdError.message}`);
  }

  if (byUserIdData) {
    return;
  }
};

const sanitizeProjectForProfileStorage = (projectData: ExportedNodesJson): ExportedNodesJson => {
  const sanitizedNodes = projectData.nodes.map((node) => ({
    ...node,
    data: stripLocalImageDataUrl(node.data) as Record<string, unknown>,
  }));

  return {
    nodes: sanitizedNodes,
    edges: projectData.edges,
  };
};

const stripLocalImageDataUrl = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => stripLocalImageDataUrl(item));
  }

  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const output: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, nestedValue]) => {
    if (key === 'localImageDataUrl') {
      return;
    }
    output[key] = stripLocalImageDataUrl(nestedValue);
  });
  return output;
};
