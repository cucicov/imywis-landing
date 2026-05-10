export const NODE_TYPES = {
    PAGE: 'pageNode',
    IMAGE: 'imageNode',
    BACKGROUND: 'backgroundNode',
    TEXT: 'textNode',
    EVENT: 'eventNode',
    EXTERNAL_LINK: 'externalLinkNode',
} as const;

export type NodeType = typeof NODE_TYPES[keyof typeof NODE_TYPES];

export type NodeMetadata = {
    sourceNodes: Array<{
        nodeId: string;
        type: string;
        handleType: string;
        data: Record<string, unknown>;
    }>;
};

type BaseNodeData = {
    label: string;
    connectionImpactKey?: number;
    collapsed?: boolean;
};

export type PageNodeData = BaseNodeData & {
    name?: string;
    width?: number;
    height?: number;
    mousePointer?: string;
    popUp?: boolean;
    backgroundColor?: string;
    metadata?: NodeMetadata;
};

export type ImageNodeData = BaseNodeData & {
    path?: string;
    localImageDataUrl?: string;
    localImageFileName?: string;
    width?: number;
    height?: number;
    autoWidth?: boolean;
    autoHeight?: boolean;
    positionX?: number;
    positionY?: number;
    opacity?: number;
    metadata?: NodeMetadata;
};

export type BackgroundStyle = 'tile' | 'fullscreen' | 'stretch' | 'contain';

export type BackgroundNodeData = BaseNodeData & {
    style?: BackgroundStyle;
    width?: number;
    height?: number;
    autoWidth?: boolean;
    autoHeight?: boolean;
    metadata?: NodeMetadata;
};

export type TextNodeData = BaseNodeData & {
    text?: string;
    color?: string;
    backgroundColor?: string;
    transparentBackground?: boolean;
    align?: 'left' | 'right' | 'center';
    font?: string;
    size?: number;
    width?: number;
    height?: number;
    positionX?: number;
    positionY?: number;
    opacity?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    caps?: boolean;
    metadata?: NodeMetadata;
};

export type EventType = 'click' | 'mouse over';

export type EventNodeData = BaseNodeData & {
    type?: EventType;
    metadata?: NodeMetadata;
};

export type ExternalLinkNodeData = BaseNodeData & {
    url?: string;
    target?: '_self' | '_blank';
    metadata?: NodeMetadata;
};
