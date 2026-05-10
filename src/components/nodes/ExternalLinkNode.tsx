import {Handle, Position, useReactFlow, type Node, type NodeProps} from '@xyflow/react';
import {useCallback, type ChangeEvent, type CSSProperties} from 'react';
import {updateNodeAndPropagate} from '../../utils/nodeUtils.ts';
import {NODE_TYPES, type ExternalLinkNodeData} from '../../types/nodeTypes';
import {HandleTypes} from '../../types/handleTypes';

const labelStyle: CSSProperties = {
    fontSize: '10px',
    color: '#57212E',
    whiteSpace: 'nowrap',
};

const inputStyle: CSSProperties = {
    fontSize: '11px',
    width: '150px',
    border: 0,
    background: '#fff',
    opacity: 0.8,
    color: 'black',
};

const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: '4px',
};

const rowLabelStyle: CSSProperties = {
    ...labelStyle,
    width: '70px',
    flexShrink: 0,
    lineHeight: '18px',
};

const ExternalLinkNode = ({id, data}: NodeProps<Node<ExternalLinkNodeData, typeof NODE_TYPES.EXTERNAL_LINK>>) => {
    const {setNodes, getEdges} = useReactFlow();
    const fieldsExpanded = data.collapsed !== true;

    const onFieldChange = useCallback((evt: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const {id: targetId, value} = evt.target;
        const field = targetId.replace('field-', '');

        const edges = getEdges();
        setNodes((nds) => updateNodeAndPropagate(nds, edges, id, field, value));
    }, [getEdges, id, setNodes]);

    const normalizeUrl = useCallback((url: string): string => {
        const trimmed = url.trim();
        if (!trimmed) {
            return '';
        }
        // If URL already has a protocol, return as is
        if (/^https?:\/\//i.test(trimmed)) {
            return trimmed;
        }
        // Otherwise, add https://
        return `https://${trimmed}`;
    }, []);

    const handleNodeClick = useCallback((evt: React.MouseEvent) => {
        evt.stopPropagation();
        const url = data.url?.trim();
        if (!url) {
            return;
        }
        const normalizedUrl = normalizeUrl(url);
        const windowTarget = data.target ?? '_self';
        window.open(normalizedUrl, windowTarget);
    }, [data.url, data.target, normalizeUrl]);

    return (
        <div
            className={`imywis-node-shell${data.connectionImpactKey ? ' imywis-node-shell--impact' : ''}`}
            onClick={handleNodeClick}
            style={{
                padding: '10px',
                borderRadius: '15px',
                background: '#D05774',
                color: '#222',
                border: '1px solid white',
                fontSize: '12px',
                width: '250px',
                cursor: data.url?.trim() ? 'pointer' : 'default',
            }}
        >
            <Handle
                type="source"
                id={HandleTypes.RED_OUTPUT}
                position={Position.Bottom}
                style={{
                    left: '50%',
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#D05774',
                    border: '1px solid white',
                }}
            />

            {/*<div*/}
            {/*    className="nodrag"*/}
            {/*    onClick={onToggleFields}*/}
            {/*    style={{*/}
            {/*        marginTop: '6px',*/}
            {/*        color: '#fff',*/}
            {/*        cursor: 'pointer',*/}
            {/*        userSelect: 'none',*/}
            {/*        display: 'flex',*/}
            {/*        alignItems: 'center',*/}
            {/*        gap: '4px',*/}
            {/*    }}*/}
            {/*>*/}
            {/*    <span>{fieldsExpanded ? '▼' : '▶'}</span>*/}
            {/*    <b>{data.label + '-' + id}</b>*/}
            {/*</div>*/}

            {fieldsExpanded && (
                <div style={{marginTop: '6px'}} onClick={handleNodeClick}>
                    <div style={rowStyle}>
                        <label htmlFor="field-url" style={{...rowLabelStyle, cursor: 'pointer'}}>url:</label>
                        <input
                            id="field-url"
                            className="nodrag"
                            type="text"
                            value={data.url ?? ''}
                            onChange={onFieldChange}
                            onClick={handleNodeClick}
                            style={{...inputStyle, cursor: 'pointer', pointerEvents: 'none'}}
                            readOnly
                        />
                    </div>
                    <div style={rowStyle}>
                        <label htmlFor="field-target" style={{...rowLabelStyle, cursor: 'pointer'}}>target:</label>
                        <select
                            id="field-target"
                            className="nodrag"
                            value={data.target ?? '_self'}
                            onChange={onFieldChange}
                            onClick={handleNodeClick}
                            style={{...inputStyle, cursor: 'pointer', pointerEvents: 'none'}}
                            disabled
                        >
                            <option value="_self">_self</option>
                            <option value="_blank">_blank</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExternalLinkNode;
