type LatestSelectedPageNameBadgeProps = {
  pageName: string;
  previewEnabled: boolean;
  onPreviewEnabledChange: (value: boolean) => void;
};

const LatestSelectedPageNameBadge = ({
  pageName,
  previewEnabled,
  onPreviewEnabledChange,
}: LatestSelectedPageNameBadgeProps) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        left: '180px',
        zIndex: 10,
        padding: '8px 12px',
        backgroundColor: '#f5f2e9',
        color: '#1b1b1b',
        border: '1px solid #1b1b1b',
        borderRadius: '5px',
        fontSize: '12px',
        maxWidth: '280px',
        wordBreak: 'break-word',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <input
        type="checkbox"
        checked={previewEnabled}
        onChange={(event) => onPreviewEnabledChange(event.target.checked)}
        aria-label="Toggle background preview"
      />
      <span>
        Displaying preview: <b>{pageName}</b>
      </span>
    </div>
  );
};

export default LatestSelectedPageNameBadge;
