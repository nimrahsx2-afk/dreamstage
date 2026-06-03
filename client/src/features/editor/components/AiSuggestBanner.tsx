import { Sparkles, X } from 'lucide-react';

interface Props {
  onOpen: () => void;
  onDismiss: () => void;
}

export function AiSuggestBanner({ onOpen, onDismiss }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        borderRadius: '99px',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
        whiteSpace: 'nowrap',
      }}
    >
      <Sparkles size={14} style={{ color: 'white' }} />
      <span
        style={{
          color: 'white',
          fontSize: '13px',
          fontWeight: 500,
        }}
      >
        AI has layout suggestions for this event
      </span>
      <button
        type="button"
        onClick={onOpen}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: '99px',
          padding: '4px 12px',
          color: 'white',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        View →
      </button>
      <button
        type="button"
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.7)',
          padding: '2px',
          display: 'flex',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
