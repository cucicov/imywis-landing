import {useReactFlow, useStoreApi} from '@xyflow/react';
import {NODE_TYPES, type TextNodeData} from '../../../types/nodeTypes.ts';

const AddTextNodeButton = () => {
    const {setNodes, getNodes} = useReactFlow();
    const store = useStoreApi();

    const addNode = () => {
        const data: TextNodeData = {
            label: NODE_TYPES.TEXT,
            text: '',
            color: '#000000',
            backgroundColor: '#ffffff',
            transparentBackground: true,
            align: 'left',
            font: 'sans-serif',
            size: 16,
            width: 250,
            height: 120,
            positionX: 0,
            positionY: 0,
            opacity: 1,
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            caps: false,
        };

        const currentNodes = getNodes();
        const maxId = currentNodes.length > 0 ? Math.max(...currentNodes.map(item => Number(item.id) || 0)) : 0;
        const {width, height, transform} = store.getState();
        const [translateX, translateY, zoom] = transform;
        const flowScrollContainer = document.getElementById('imywis-flow-scroll-container');
        const viewportCenterX = flowScrollContainer
            ? flowScrollContainer.scrollLeft + (flowScrollContainer.clientWidth / 2)
            : width / 2;
        const viewportCenterY = flowScrollContainer
            ? flowScrollContainer.scrollTop + (flowScrollContainer.clientHeight / 2)
            : height / 2;
        const centerPosition = {
            x: (viewportCenterX - translateX) / zoom,
            y: (viewportCenterY - translateY) / zoom,
        };

        const newNode = {
            id: `${maxId + 1}`,
            type: NODE_TYPES.TEXT,
            data,
            position: centerPosition,
        };

        setNodes((nodes) => [...nodes, newNode]);
    };

    return (
        <button
            onClick={addNode}
            style={{
                position: 'absolute',
                top: '160px',
                left: '10px',
                zIndex: 10,
                padding: '10px 20px',
                backgroundColor: '#1a192b',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
            }}
        >
            Add Text Node
        </button>
    );
};

export default AddTextNodeButton;
