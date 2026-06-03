// Editor Toolbar - Transform mode buttons, undo/redo, view toggle, theme toggle

import { Save, Lock } from 'lucide-react';
import { useState } from 'react';

import { useEditorStore, useCanUndo, useCanRedo, useIsLocked } from '../store/editorStore';
import { useTheme } from '@/hooks/useTheme';
import type { TransformMode, ViewMode } from '../editor.types';
import { cn } from '@/utils/cn';

interface EditorToolbarProps {
  onSave?: () => void;
  isSaving?: boolean;
}

export function EditorToolbar({ onSave, isSaving }: EditorToolbarProps) {
  const transformMode = useEditorStore((state) => state.transformMode);
  const viewMode = useEditorStore((state) => state.viewMode);
  const setTransformMode = useEditorStore((state) => state.setTransformMode);
  const setViewMode = useEditorStore((state) => state.setViewMode);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const isDirty = useEditorStore((state) => state.isDirty);
  const { theme, toggle: toggleTheme } = useTheme();

  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const isLocked = useIsLocked();
  const selectedAssetId = useEditorStore((state) => state.selectedAssetId);
  const removeAsset = useEditorStore((state) => state.removeAsset);

  const [showShortcuts, setShowShortcuts] = useState(false);

  const transformModes: { mode: TransformMode; label: string; tooltip: string }[] = [
    { mode: 'translate', label: 'Move', tooltip: 'Move (G)' },
    { mode: 'rotate', label: 'Rotate', tooltip: 'Select an asset, then drag left or right to rotate' },
    { mode: 'scale', label: 'Scale', tooltip: 'Scale (S)' },
  ];

  const viewModes: { mode: ViewMode; label: string }[] = [
    { mode: 'orbit', label: 'Orbit' },
    { mode: 'walkthrough', label: 'Walk' },
  ];

  return (
    <>
    <div className="editor-toolbar">
      {/* Lock indicator */}
      {isLocked && (
        <div 
          className="flex items-center gap-2 px-4 py-2 mr-2"
          style={{
            background: 'var(--rose)',
            borderRadius: 'var(--radius-pill)',
          }}
        >
          <Lock className="w-4 h-4" style={{ color: '#8a2840' }} />
          <span className="text-sm font-semibold" style={{ color: '#8a2840', fontFamily: 'DM Sans, sans-serif' }}>
            Locked
          </span>
        </div>
      )}

      {/* Transform mode buttons */}
      <div 
        className="flex items-center p-1"
        style={{
          background: 'var(--surface2)',
          borderRadius: 'var(--radius-pill)',
        }}
      >
        {transformModes.map(({ mode, label, tooltip }) => (
          <button
            key={mode}
            onClick={() => setTransformMode(mode)}
            disabled={isLocked}
            title={tooltip}
            type="button"
            className={cn(
              'editor-tool-btn',
              transformMode === mode && 'active',
              isLocked && 'opacity-50'
            )}
          >
            <span className="editor-tool-icon">
              {mode === 'translate' ? '✛' : mode === 'rotate' ? '↻' : '⤡'}
            </span>
            {label}
          </button>
        ))}
      </div>

      <div className="editor-tool-sep" />

      <button
        onClick={() => selectedAssetId && !isLocked && removeAsset(selectedAssetId)}
        disabled={!selectedAssetId || isLocked}
        title="Delete (Delete/Backspace)"
        type="button"
        className="editor-tool-btn danger"
      >
        <span className="editor-tool-icon">🗑</span>
        Delete
      </button>
      <button
        onClick={undo}
        disabled={!canUndo || isLocked}
        title="Undo (Ctrl+Z)"
        type="button"
        className="editor-tool-btn"
      >
        <span className="editor-tool-icon">↩</span>
        Undo
      </button>
      <button
        onClick={redo}
        disabled={!canRedo || isLocked}
        title="Redo (Ctrl+Y)"
        type="button"
        className="editor-tool-btn"
      >
        <span className="editor-tool-icon">↪</span>
        Redo
      </button>

      <div className="editor-tool-sep" />

      {viewModes.map(({ mode, label }) => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          title={label}
          type="button"
          className={cn('editor-tool-btn', viewMode === mode && 'active')}
        >
          <span className="editor-tool-icon">
            {mode === 'orbit' ? '🔄' : '🚶'}
          </span>
          {label}
        </button>
      ))}

      <div className="editor-tool-sep" />

      <button onClick={() => setShowShortcuts(true)} className="editor-tool-btn" title="Keyboard Shortcuts" type="button">
        ?
      </button>

      <div className="editor-toolbar-right">
        <button
          type="button"
          onClick={() => theme === 'dark' && toggleTheme()}
          className="editor-light-toggle-btn"
        >
          ☀️ Day
        </button>
        <button
          type="button"
          onClick={() => theme === 'light' && toggleTheme()}
          className="editor-light-toggle-btn"
        >
          🌙 Night
        </button>
      </div>

      <div className="flex-1" />

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={!isDirty || isLocked || isSaving}
        className="flex items-center gap-2 px-5 py-2 transition-all hover:-translate-y-0.5"
        style={{
          borderRadius: 'var(--radius-pill)',
          background: isDirty && !isLocked && !isSaving ? 'var(--text)' : 'var(--surface2)',
          color: isDirty && !isLocked && !isSaving ? 'var(--bg)' : 'var(--text-muted)',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: isDirty && !isLocked && !isSaving ? 'pointer' : 'not-allowed',
          boxShadow: isDirty && !isLocked && !isSaving ? 'var(--shadow-sm)' : 'none',
        }}
      >
        <Save className="w-4 h-4" />
        <span>{isSaving ? 'Saving...' : isDirty ? 'Save' : 'Saved'}</span>
      </button>
    </div>

    {showShortcuts && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }} onClick={() => setShowShortcuts(false)}>
        <div style={{
          background: 'var(--surface)', borderRadius: 16, padding: 32,
          minWidth: 320, boxShadow: 'var(--shadow-lg)'
        }} onClick={e => e.stopPropagation()}>
          <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', marginBottom: 16 }}>
            ⌨️ Keyboard Shortcuts
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem' }}>
            <tbody>
              {[
                ['Arrow Keys', 'Move asset left / right / forward / back'],
                ['U', 'Move asset UP'],
                ['D', 'Move asset DOWN'],
                ['F', 'Freeze asset in place'],
                ['G', 'Unfreeze asset'],
                ['Delete', 'Delete selected asset'],
                ['Ctrl + Z', 'Undo'],
                ['Ctrl + Y', 'Redo'],
                ['Escape', 'Deselect asset'],
              ].map(([key, desc]) => (
                <tr key={key} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 16px 8px 0', fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                    {key}
                  </td>
                  <td style={{ padding: '8px 0', color: 'var(--text-muted)' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setShowShortcuts(false)} style={{
            marginTop: 20, padding: '8px 24px',
            background: 'var(--text)', color: 'var(--bg)',
            borderRadius: 99, border: 'none', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600
          }}>
            Got it!
          </button>
        </div>
      </div>
    )}
    </>
  );
}
