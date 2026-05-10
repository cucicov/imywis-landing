import {Handle, Position, useReactFlow, type Node, type NodeProps} from '@xyflow/react';
import {useCallback, type ChangeEvent, type CSSProperties} from 'react';
import {updateNodeAndPropagate} from '../../utils/nodeUtils.ts';
import {NODE_TYPES, type TextNodeData} from '../../types/nodeTypes';
import {HandleTypes} from '../../types/handleTypes';
import CumulativeCenterSlider from '../CumulativeCenterSlider.tsx';
import {TEXT_FONT_OPTIONS} from '../../utils/fontRegistry.ts';

const labelStyle: CSSProperties = {
    fontSize: '10px',
    color: '#792D05',
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
    width: '78px',
    flexShrink: 0,
    lineHeight: '18px',
};

const controlStackStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
    width: '100%',
};

const TextNode = ({id, data}: NodeProps<Node<TextNodeData, typeof NODE_TYPES.TEXT>>) => {
    const {setNodes, getEdges} = useReactFlow();
    const fieldsExpanded = data.collapsed !== true;
    const sizeNumericValue = toFiniteNumber(data.size, 16);
    const widthNumericValue = toFiniteNumber(data.width, 250);
    const heightNumericValue = toFiniteNumber(data.height, 120);
    const positionXNumericValue = toFiniteNumber(data.positionX, 0);
    const positionYNumericValue = toFiniteNumber(data.positionY, 0);

    const onFieldChange = useCallback((evt: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const {id: targetId, value} = evt.target;
        const field = targetId.replace('field-', '');
        const newValue = evt.target instanceof HTMLInputElement && evt.target.type === 'checkbox'
            ? evt.target.checked
            : value;

        const edges = getEdges();
        setNodes((nds) => updateNodeAndPropagate(nds, edges, id, field, newValue));
    }, [getEdges, id, setNodes]);

    const onNumericSliderChange = useCallback((field: string, nextValue: number) => {
        const edges = getEdges();
        setNodes((nds) => updateNodeAndPropagate(nds, edges, id, field, Math.round(nextValue)));
    }, [getEdges, id, setNodes]);

    const onBackgroundColorChange = useCallback((evt: ChangeEvent<HTMLInputElement>) => {
        const edges = getEdges();
        const nextBackgroundColor = evt.target.value;
        setNodes((nds) => {
            const withBackgroundColor = updateNodeAndPropagate(nds, edges, id, 'backgroundColor', nextBackgroundColor);
            return updateNodeAndPropagate(withBackgroundColor, edges, id, 'transparentBackground', false);
        });
    }, [getEdges, id, setNodes]);

    const onToggleFields = useCallback(() => {
        setNodes((nds) => nds.map((node) => (
            node.id === id
                ? {
                    ...node,
                    data: {
                        ...node.data,
                        collapsed: fieldsExpanded,
                    },
                }
                : node
        )));
    }, [fieldsExpanded, id, setNodes]);

    return (
        <div
            className={`imywis-node-shell${data.connectionImpactKey ? ' imywis-node-shell--impact' : ''}`}
            style={{
            padding: '10px',
            borderRadius: '15px',
            background: '#FBB38D',
            color: '#222',
            border: '1px solid white',
            fontSize: '12px',
            width: '280px',
        }}>
            <Handle
                type="target"
                position={Position.Top}
                id={HandleTypes.TURQUOISE_INPUT}
                style={{
                    left: '25%',
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#6BC8CD',
                    border: '1px solid black',
                }}
            />
            <Handle
                type="target"
                position={Position.Top}
                id={HandleTypes.SAGE_INPUT}
                style={{
                    left: '50%',
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#CDD8C7',
                    border: '1px solid black',
                }}
            />
            <Handle
                type="source"
                position={Position.Top}
                id={HandleTypes.ORANGE_OUTPUT_2}
                style={{
                    left: '75%',
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#FBB38D',
                    border: '1px solid white',
                }}
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id={HandleTypes.ORANGE_OUTPUT}
                style={{
                    left: '33%',
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#FBB38D',
                    border: '1px solid white',
                }}
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id={HandleTypes.RED_OUTPUT}
                style={{
                    left: '66%',
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#D05774',
                    border: '1px solid white',
                }}
            />

            <div style={{marginTop: '6px'}}>
                <div style={rowStyle}>
                    <label htmlFor="field-text" style={rowLabelStyle}>text:</label>
                    <textarea
                        id="field-text"
                        className="nodrag"
                        value={data.text ?? ''}
                        onChange={onFieldChange}
                        rows={4}
                        style={{
                            ...inputStyle,
                            resize: 'vertical',
                            minHeight: '60px',
                        }}
                    />
                </div>
            </div>
            <div
                className="nodrag"
                onClick={onToggleFields}
                style={{
                    marginTop: '6px',
                    color: '#fff',
                    cursor: 'pointer',
                    userSelect: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                }}
            >
                <span>{fieldsExpanded ? '▼' : '▶'}</span>
                <b>{data.label + '-' + id}</b>
            </div>
            {fieldsExpanded && (
                <>
                    <div style={{marginTop: '6px'}}>
                <div style={rowStyle}>
                    <label htmlFor="field-color" style={rowLabelStyle}>color:</label>
                    <input
                        id="field-color"
                        className="nodrag"
                        type="color"
                        value={data.color ?? '#000000'}
                        onChange={onFieldChange}
                        style={{...inputStyle, width: '56px', padding: 0, border: '1px solid rgba(0,0,0,0.2)'}}
                    />
                </div>

                <div style={rowStyle}>
                    <label htmlFor="field-backgroundColor" style={rowLabelStyle}>background:</label>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <input
                            id="field-backgroundColor"
                            className="nodrag"
                            type="color"
                            value={data.backgroundColor ?? '#ffffff'}
                            onChange={onBackgroundColorChange}
                            style={{...inputStyle, width: '56px', padding: 0, border: '1px solid rgba(0,0,0,0.2)'}}
                        />
                        <label
                            htmlFor="field-transparentBackground"
                            style={{fontSize: '10px', color: '#792D05', display: 'flex', alignItems: 'center', gap: '4px'}}
                        >
                            <input
                                id="field-transparentBackground"
                                className="nodrag"
                                type="checkbox"
                                checked={data.transparentBackground !== false}
                                onChange={onFieldChange}
                                style={{width: '14px', height: '14px', accentColor: '#792D05', opacity: 0.8}}
                            />
                            transparent bg
                        </label>
                    </div>
                </div>

                <div style={rowStyle}>
                    <label htmlFor="field-font" style={rowLabelStyle}>font:</label>
                    <div style={controlStackStyle}>
                        <select
                        id="field-font"
                        className="nodrag"
                        value={data.font ?? 'sans-serif'}
                        onChange={onFieldChange}
                        style={inputStyle}
                    >
                            {TEXT_FONT_OPTIONS.map((fontOption) => (
                                <option
                                    key={fontOption.value}
                                    value={fontOption.value}
                                    style={{fontFamily: fontOption.value}}
                                >
                                    {fontOption.label}
                                </option>
                            ))}
                        </select>
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px 10px', marginTop: '4px', maxWidth: '170px'}}>
                            {[
                                {id: 'bold', label: 'bold'},
                                {id: 'italic', label: 'italic'},
                                {id: 'underline', label: 'underline'},
                                {id: 'strikethrough', label: 'strikethrough'},
                                {id: 'caps', label: 'CAPS'},
                            ].map((option) => (
                                <label key={option.id} style={{fontSize: '10px', color: '#792D05', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                    <input
                                        id={`field-${option.id}`}
                                        className="nodrag"
                                        type="checkbox"
                                        checked={Boolean(data[option.id as keyof TextNodeData])}
                                        onChange={onFieldChange}
                                        style={{width: '14px', height: '14px', accentColor: '#792D05', opacity: 0.8}}
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={rowStyle}>
                    <label htmlFor="field-align" style={rowLabelStyle}>align:</label>
                    <select
                        id="field-align"
                        className="nodrag"
                        value={data.align ?? 'left'}
                        onChange={onFieldChange}
                        style={inputStyle}
                    >
                        <option value="left">left</option>
                        <option value="right">right</option>
                        <option value="center">center</option>
                    </select>
                </div>

                <div style={rowStyle}>
                    <label htmlFor="field-size" style={rowLabelStyle}>size:</label>
                    <div style={controlStackStyle}>
                        <input
                            id="field-size"
                            className="nodrag"
                            type="number"
                            min={1}
                            value={data.size ?? ''}
                            onChange={onFieldChange}
                            style={inputStyle}
                        />
                        <CumulativeCenterSlider
                            showValuePreview={false}
                            className="nodrag nopan nowheel"
                            cumulativeValue={sizeNumericValue}
                            minCumulativeValue={1}
                            onCumulativeChange={(nextValue) => onNumericSliderChange('size', nextValue)}
                        />
                    </div>
                </div>

                <div style={rowStyle}>
                    <label htmlFor="field-width" style={rowLabelStyle}>width(px):</label>
                    <div style={controlStackStyle}>
                        <input
                            id="field-width"
                            className="nodrag"
                            type="number"
                            min={0}
                            value={data.width ?? ''}
                            onChange={onFieldChange}
                            style={inputStyle}
                        />
                        <CumulativeCenterSlider
                            showValuePreview={false}
                            className="nodrag nopan nowheel"
                            cumulativeValue={widthNumericValue}
                            minCumulativeValue={0}
                            onCumulativeChange={(nextValue) => onNumericSliderChange('width', nextValue)}
                        />
                    </div>
                </div>

                <div style={rowStyle}>
                    <label htmlFor="field-height" style={rowLabelStyle}>height(px):</label>
                    <div style={controlStackStyle}>
                        <input
                            id="field-height"
                            className="nodrag"
                            type="number"
                            min={0}
                            value={data.height ?? ''}
                            onChange={onFieldChange}
                            style={inputStyle}
                        />
                        <CumulativeCenterSlider
                            showValuePreview={false}
                            className="nodrag nopan nowheel"
                            cumulativeValue={heightNumericValue}
                            minCumulativeValue={0}
                            onCumulativeChange={(nextValue) => onNumericSliderChange('height', nextValue)}
                        />
                    </div>
                </div>

                <div style={rowStyle}>
                    <label htmlFor="field-positionX" style={rowLabelStyle}>position-x:</label>
                    <div style={controlStackStyle}>
                        <input
                            id="field-positionX"
                            className="nodrag"
                            type="number"
                            value={data.positionX ?? ''}
                            onChange={onFieldChange}
                            style={inputStyle}
                        />
                        <CumulativeCenterSlider
                            showValuePreview={false}
                            className="nodrag nopan nowheel"
                            cumulativeValue={positionXNumericValue}
                            onCumulativeChange={(nextValue) => onNumericSliderChange('positionX', nextValue)}
                        />
                    </div>
                </div>

                <div style={rowStyle}>
                    <label htmlFor="field-positionY" style={rowLabelStyle}>position-y:</label>
                    <div style={controlStackStyle}>
                        <input
                            id="field-positionY"
                            className="nodrag"
                            type="number"
                            value={data.positionY ?? ''}
                            onChange={onFieldChange}
                            style={inputStyle}
                        />
                        <CumulativeCenterSlider
                            showValuePreview={false}
                            className="nodrag nopan nowheel"
                            cumulativeValue={positionYNumericValue}
                            onCumulativeChange={(nextValue) => onNumericSliderChange('positionY', nextValue)}
                        />
                    </div>
                </div>

                <div style={rowStyle}>
                    <label htmlFor="field-opacity" style={rowLabelStyle}>opacity:</label>
                    <input
                        id="field-opacity"
                        className="nodrag"
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={data.opacity ?? ''}
                        onChange={onFieldChange}
                        style={inputStyle}
                    />
                </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TextNode;

const toFiniteNumber = (value: unknown, fallback: number) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
