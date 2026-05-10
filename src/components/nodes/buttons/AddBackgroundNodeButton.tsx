import {useReactFlow, useStoreApi} from '@xyflow/react';
import {NODE_TYPES, type BackgroundNodeData} from '../../../types/nodeTypes.ts';

const AddBackgroundNodeButton = () => {
    const {setNodes, getNodes} = useReactFlow();
    const store = useStoreApi();

    const addNode = () => {
        const data: BackgroundNodeData = {
            label: NODE_TYPES.BACKGROUND,
            style: 'tile',
            width: 100,
            autoWidth: false,
            height: 100,
            autoHeight: false,
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
            type: NODE_TYPES.BACKGROUND,
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
                top: '110px',
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
            Add Background Node
        </button>
    );
};

export default AddBackgroundNodeButton;
