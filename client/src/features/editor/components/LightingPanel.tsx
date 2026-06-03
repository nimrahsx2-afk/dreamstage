// Lighting Panel - Controls for ambient and directional light intensity

import { Sun, Lightbulb } from 'lucide-react';

import { useEditorStore } from '../store/editorStore';

interface LightingPanelProps {
  disabled?: boolean;
}

export function LightingPanel({ disabled }: LightingPanelProps) {
  const lighting = useEditorStore((state) => state.lighting);
  const updateLighting = useEditorStore((state) => state.updateLighting);

  const handleAmbientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateLighting({ ambientIntensity: parseFloat(e.target.value) });
  };

  const handleDirectionalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateLighting({ directionalIntensity: parseFloat(e.target.value) });
  };

  return (
    <div 
      className="m-4 p-5"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <h3 
        className="mb-5 flex items-center gap-2"
        style={{
          fontSize: '0.75rem',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-muted)',
        }}
      >
        <Lightbulb className="w-4 h-4" />
        Lighting
      </h3>

      <div className="space-y-5">
        {/* Ambient light */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label 
              className="flex items-center gap-2"
              style={{
                fontSize: '0.75rem',
                fontFamily: 'DM Sans, sans-serif',
                color: 'var(--text-muted)',
              }}
            >
              <Sun className="w-3 h-3" />
              Ambient
            </label>
            <span 
              style={{
                fontSize: '0.75rem',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              {Math.round(lighting.ambientIntensity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={lighting.ambientIntensity}
            onChange={handleAmbientChange}
            disabled={disabled}
            className="slider-accent"
            style={{
              opacity: disabled ? 0.5 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          />
        </div>

        {/* Directional light */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label 
              className="flex items-center gap-2"
              style={{
                fontSize: '0.75rem',
                fontFamily: 'DM Sans, sans-serif',
                color: 'var(--text-muted)',
              }}
            >
              <Sun className="w-3 h-3" />
              Directional
            </label>
            <span 
              style={{
                fontSize: '0.75rem',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              {Math.round(lighting.directionalIntensity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={lighting.directionalIntensity}
            onChange={handleDirectionalChange}
            disabled={disabled}
            className="slider-accent"
            style={{
              opacity: disabled ? 0.5 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          />
        </div>
      </div>
    </div>
  );
}
