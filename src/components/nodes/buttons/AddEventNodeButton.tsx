import {useReactFlow, useStoreApi} from '@xyflow/react';
import {NODE_TYPES, type EventNodeData} from '../../../types/nodeTypes.ts';

const AddEventNodeButton = () => {
    const {setNodes, getNodes} = useReactFlow();
    const store = useStoreApi();

    const addNode = () => {
        const data: EventNodeData = {
            label: NODE_TYPES.EVENT,
            type: 'click',
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
            type: NODE_TYPES.EVENT,
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
                top: '210px',
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
            Add Event Node
        </button>
    );
};

export default AddEventNodeButton;
