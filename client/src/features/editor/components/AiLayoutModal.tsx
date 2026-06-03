import { useState } from 'react';
import { Sparkles, X, Loader2, Check, AlertTriangle, Info } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from 'sonner';

export interface AiLayoutSuggestion {
  assetName: string;
  quantity: number;
  originalQuantity: number;
  wasCapped: boolean;
  placement: string;
  reason: string;
  unitPrice: number;
  totalPrice: number;
}

interface AiLayoutModalProps {
  eventType: string;
  guestCount: number;
  venueName: string;
  budgetCeiling: number | null;
  seatingNotes: string | null;
  onPlace: (suggestions: AiLayoutSuggestion[]) => void;
  onClose: () => void;
}

export function AiLayoutModal({
  eventType,
  guestCount,
  venueName,
  budgetCeiling,
  seatingNotes,
  onPlace,
  onClose,
}: AiLayoutModalProps) {
  const [suggestions, setSuggestions] = useState<AiLayoutSuggestion[]>([]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generate = async () => {
    setIsLoading(true);
    try {
      const res = await api.post('/ai/suggest-layout', {
        eventType,
        guestCount,
        venueName,
        budgetCeiling,
        seatingNotes,
      });
      const data = res.data?.data as {
        suggestions: AiLayoutSuggestion[];
      };
      if (!data?.suggestions) {
        toast.error('Could not generate suggestions. Try again.');
        return;
      }
      setSuggestions(data.suggestions);

      const initial: Record<number, boolean> = {};
      data.suggestions.forEach((_, i) => {
        initial[i] = true;
      });
      setChecked(initial);
      setHasGenerated(true);
    } catch {
      toast.error('Could not generate suggestions. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSuggestions = suggestions.filter((_, i) => checked[i]);

  const selectedTotal = selectedSuggestions.reduce((sum, s) => sum + s.totalPrice, 0);

  const isOverBudget = budgetCeiling ? selectedTotal > budgetCeiling : false;

  const handlePlace = () => {
    if (selectedSuggestions.length === 0) {
      toast.error('Select at least one item');
      return;
    }
    onPlace(selectedSuggestions);
    onClose();
  };

  const gradientIcon = 'linear-gradient(135deg, #667eea, #764ba2)';
  const gradientBtn = 'linear-gradient(135deg, #667eea, #764ba2)';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          width: '560px',
          maxWidth: '95vw',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                background: gradientIcon,
                borderRadius: '10px',
                padding: '8px',
                display: 'flex',
              }}
            >
              <Sparkles size={16} style={{ color: 'white' }} />
            </div>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  color: 'var(--text)',
                  fontSize: '15px',
                }}
              >
                AI Layout Assistant
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  marginTop: '1px',
                }}
              >
                {eventType} · {guestCount} guests
                {venueName ? ` · ${venueName}` : ''}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem 1.5rem',
          }}
        >
          {seatingNotes && (
            <div
              style={{
                background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: '10px',
                padding: '10px 12px',
                marginBottom: '14px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}
            >
              <Info
                size={14}
                style={{
                  color: '#7c3aed',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#7c3aed',
                    marginBottom: '2px',
                  }}
                >
                  Client requirements (from inquiry)
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  {seatingNotes}
                </div>
              </div>
            </div>
          )}

          {!hasGenerated ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem 1rem',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  marginBottom: '12px',
                }}
              >
                ✨
              </div>
              <div
                style={{
                  fontWeight: 600,
                  color: 'var(--text)',
                  fontSize: '15px',
                  marginBottom: '8px',
                }}
              >
                Generate a smart layout
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  marginBottom: '24px',
                  lineHeight: 1.6,
                  maxWidth: '320px',
                  margin: '0 auto 24px',
                }}
              >
                AI will suggest the best assets from your inventory for a {eventType.toLowerCase()} with{' '}
                {guestCount} guests
                {seatingNotes ? ", using the client's requirements as guide" : ''}.
              </div>
              <button
                type="button"
                onClick={generate}
                disabled={isLoading}
                style={{
                  background: isLoading ? '#9ca3af' : gradientBtn,
                  color: 'white',
                  border: 'none',
                  borderRadius: '99px',
                  padding: '11px 28px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate Layout
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              {isOverBudget && budgetCeiling && (
                <div
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    marginBottom: '12px',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                  <div style={{ fontSize: '12px', color: '#ef4444' }}>
                    Selected items total Rs. {selectedTotal.toLocaleString()} which exceeds your Rs.{' '}
                    {budgetCeiling.toLocaleString()} ceiling by Rs. {(selectedTotal - budgetCeiling).toLocaleString()}.
                    Uncheck items to reduce cost.
                  </div>
                </div>
              )}

              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  marginBottom: '10px',
                }}
              >
                Select items to place in your scene:
              </div>

              {suggestions.map((s, i) => (
                <div
                  key={`${s.assetName}-${i}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setChecked((prev) => ({ ...prev, [i]: !prev[i] }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    marginBottom: '6px',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: checked[i] ? 'rgba(124,58,237,0.4)' : 'var(--border)',
                    background: checked[i] ? 'rgba(124,58,237,0.06)' : 'var(--surface2)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: '2px solid',
                      borderColor: checked[i] ? '#7c3aed' : 'var(--border)',
                      background: checked[i] ? '#7c3aed' : 'transparent',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '1px',
                    }}
                  >
                    {checked[i] && <Check size={11} style={{ color: 'white' }} />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            color: 'var(--text)',
                          }}
                        >
                          {s.assetName}
                        </span>
                        <span
                          style={{
                            fontWeight: 400,
                            color: 'var(--text-muted)',
                            fontSize: '13px',
                            marginLeft: '6px',
                          }}
                        >
                          × {s.quantity}
                        </span>
                        {s.wasCapped && (
                          <span
                            style={{
                              fontSize: '10px',
                              color: '#f59e0b',
                              marginLeft: '6px',
                              fontWeight: 500,
                            }}
                          >
                            (capped from {s.originalQuantity})
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#7c3aed',
                          flexShrink: 0,
                        }}
                      >
                        Rs. {s.totalPrice.toLocaleString()}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        marginTop: '3px',
                      }}
                    >
                      📍 {s.placement}
                      {s.reason && (
                        <span
                          style={{
                            marginLeft: '6px',
                            opacity: 0.7,
                          }}
                        >
                          · {s.reason}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {hasGenerated && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {selectedSuggestions.length} items · Est. cost:{' '}
                <span
                  style={{
                    fontWeight: 600,
                    color: isOverBudget ? '#ef4444' : 'var(--text)',
                  }}
                >
                  Rs. {selectedTotal.toLocaleString()}
                </span>
              </div>
              {budgetCeiling && (
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginTop: '2px',
                  }}
                >
                  Budget: Rs. {budgetCeiling.toLocaleString()}
                  {isOverBudget ? ' · ⚠ Over budget' : ' · ✓ Within budget'}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={generate}
                disabled={isLoading}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: '99px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  color: 'var(--text)',
                }}
              >
                Regenerate
              </button>
              <button
                type="button"
                onClick={handlePlace}
                style={{
                  background: gradientBtn,
                  color: 'white',
                  border: 'none',
                  borderRadius: '99px',
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Place Selected →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
