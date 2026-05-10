import {useEffect, useMemo, useState, type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import changelogPublic from '../../changelog_public.md?raw';

type ParsedRelease = {
  version: string;
  date: string;
  body: string;
};

const DISMISSED_CHANGELOG_VERSION_KEY = 'imywis.dismissedChangelogVersion';

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(10, 10, 12, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2147483647,
  padding: '16px',
};

const modalStyle: CSSProperties = {
  width: 'min(560px, 100%)',
  maxHeight: '80vh',
  overflow: 'auto',
  borderRadius: '14px',
  border: '1px solid rgba(255, 255, 255, 0.22)',
  background: '#151b22',
  color: '#f5f7fa',
  boxShadow: '0 20px 44px rgba(0,0,0,0.35)',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '8px',
  padding: '14px 14px 10px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
};

const closeButtonStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.24)',
  borderRadius: '999px',
  width: '24px',
  height: '24px',
  background: 'rgba(255,255,255,0.08)',
  color: '#f5f7fa',
  cursor: 'pointer',
  fontSize: '15px',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

const bodyStyle: CSSProperties = {
  padding: '12px 14px 16px',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.4,
  fontSize: '12px',
};

const ChangeLogPopUp = () => {
  const latestRelease = useMemo(() => parseLatestRelease(changelogPublic), []);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!latestRelease) {
      return;
    }

    const dismissedVersion = window.localStorage.getItem(DISMISSED_CHANGELOG_VERSION_KEY);
    setIsVisible(dismissedVersion !== latestRelease.version);
  }, [latestRelease]);

  if (!latestRelease || !isVisible) {
    return null;
  }

  return createPortal(
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="changelog-title">
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div>
            <p id="changelog-title" style={{margin: 0, fontSize: '14px', fontWeight: 700}}>
              What&apos;s New
            </p>
            <p style={{margin: '4px 0 0 0', fontSize: '11px', opacity: 0.82}}>
              Version {latestRelease.version} ({latestRelease.date})
            </p>
          </div>
          <button
            type="button"
            style={closeButtonStyle}
            aria-label="Close changelog popup"
            onClick={() => {
              window.localStorage.setItem(DISMISSED_CHANGELOG_VERSION_KEY, latestRelease.version);
              setIsVisible(false);
            }}
          >
            ×
          </button>
        </div>
        <div style={bodyStyle}>{latestRelease.body || 'No details for this release.'}</div>
      </div>
    </div>,
    document.body
  );
};

const parseLatestRelease = (markdown: string): ParsedRelease | null => {
  const lines = markdown.split(/\r?\n/);
  const headerRegex = /^##\s+\[(\d+\.\d+\.\d+)\]\s+-\s+(\d{4}-\d{2}-\d{2})\s*$/;
  const headers: Array<{index: number; version: string; date: string}> = [];

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(headerRegex);
    if (!match) {
      continue;
    }
    headers.push({
      index: i,
      version: match[1],
      date: match[2],
    });
  }

  if (headers.length === 0) {
    return null;
  }
  const latestHeader = headers.reduce((latest, current) => {
    if (!latest) {
      return current;
    }

    const latestDate = new Date(`${latest.date}T00:00:00Z`).getTime();
    const currentDate = new Date(`${current.date}T00:00:00Z`).getTime();

    if (currentDate > latestDate) {
      return current;
    }
    if (currentDate < latestDate) {
      return latest;
    }

    return current.index > latest.index ? current : latest;
  }, null as {index: number; version: string; date: string} | null);

  if (!latestHeader) {
    return null;
  }

  const currentHeaderPosition = headers.findIndex((header) => header.index === latestHeader.index);
  const nextHeader = currentHeaderPosition >= 0 ? headers[currentHeaderPosition + 1] : undefined;
  const endIndex = nextHeader ? nextHeader.index : lines.length;

  const body = lines
    .slice(latestHeader.index + 1, endIndex)
    .join('\n')
    .trim();

  return {version: latestHeader.version, date: latestHeader.date, body};
};

export default ChangeLogPopUp;
