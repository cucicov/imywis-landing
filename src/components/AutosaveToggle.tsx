import {useEffect, useRef, useState, type CSSProperties} from 'react';
import type {Edge, Node} from '@xyflow/react';
import type {Session} from '@supabase/supabase-js';
import {saveProjectDataToUserProfile} from '../utils/userProfileProject.ts';

type AutosaveToggleProps = {
  nodes: Node[];
  edges: Edge[];
  session: Session;
  lastSavedAt: Date | null;
  onSavedAtChange: (value: Date) => void;
};

const AUTOSAVE_INTERVAL_MS = 60_000;

const buttonStyle: CSSProperties = {
  position: 'absolute',
  top: '8px',
  right: '488px',
  zIndex: 1000,
  borderRadius: '6px',
  border: '1px solid #8a8a8a',
  color: '#202020',
  padding: '8px 12px',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.02em',
};

const AutosaveToggle = ({
  nodes,
  edges,
  session,
  lastSavedAt,
  onSavedAtChange,
}: AutosaveToggleProps) => {
  const [autosaveEnabled, setAutosaveEnabled] = useState(false);
  const latestNodesRef = useRef(nodes);
  const latestEdgesRef = useRef(edges);

  useEffect(() => {
    latestNodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    latestEdgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    if (!autosaveEnabled) {
      return;
    }

    const intervalId = window.setInterval(async () => {
      try {
        await saveProjectDataToUserProfile(session.user.id, {
          nodes: latestNodesRef.current,
          edges: latestEdgesRef.current,
        });
        onSavedAtChange(new Date());
      } catch (error) {
        console.error('Autosave failed:', error);
      }
    }, AUTOSAVE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autosaveEnabled, onSavedAtChange, session.user.id]);

  return (
    <button
      type="button"
      onClick={() => setAutosaveEnabled((value) => !value)}
      style={{
        ...buttonStyle,
        backgroundColor: autosaveEnabled ? '#f3f7ff' : '#f5f5f5',
      }}
    >
      <span>{autosaveEnabled ? 'Autosave: ON' : 'Autosave: OFF'}</span>
      <span style={{marginLeft: '8px', fontWeight: 300, fontSize: '10px'}}>
        Last save: {lastSavedAt ? formatTimestamp(lastSavedAt) : '--'}
      </span>
    </button>
  );
};

const formatTimestamp = (value: Date) => {
  return value.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});
};

export default AutosaveToggle;
