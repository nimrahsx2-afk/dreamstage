import { useEffect, useMemo, useState } from 'react';
import * as adminApi from '../../features/admin/admin.api';
import type { AdminActivityItem, AdminStats } from '../../features/admin/admin.types';

function formatRevenue(n: number): string {
  if (!Number.isFinite(n) || n < 0) return 'Rs 0';
  if (n === 0) return 'Rs 0';
  if (n >= 1_000_000) return `Rs ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `Rs ${(n / 1_000).toFixed(0)}K`;
  return `Rs ${Math.round(n)}`;
}

function formatNumber(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString() : '0';
}

/** Slice color for conic-gradient + legend (admin CSS variables). */
function eventTypeSliceColor(label: string): string {
  const t = label.trim().toLowerCase();
  if (t === 'wedding') return 'var(--accent-rose)';
  if (t === 'corporate') return 'var(--accent-sky)';
  if (t === 'birthday') return 'var(--accent-mint)';
  return 'var(--accent-lavender)';
}

function displayEventTypeLabel(raw: string): string {
  const s = raw?.trim() ?? '';
  if (!s || s.toLowerCase() === 'unknown') return 'Other';
  return s;
}

export function OverviewTab({ refreshKey = 0 }: { refreshKey?: number }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activity, setActivity] = useState<AdminActivityItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [showBudgetBreakdown, setShowBudgetBreakdown] = useState(false);
  const [budgetBreakdown, setBudgetBreakdown] = useState<
    Array<{
      eventName: string;
      eventType: string;
      plannerName: string;
      eventDate: string | null;
      budgetCeiling: number;
    }>
  >([]);

  const loadBudgetBreakdown = async () => {
    try {
      const data = await adminApi.getBudgetBreakdown();
      setBudgetBreakdown(data);
      setShowBudgetBreakdown(true);
    } catch (e) {
      console.error('Failed to load budget breakdown', e);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setErr(null);
        const [s, a] = await Promise.all([adminApi.getAdminStats(), adminApi.getAdminActivity()]);
        if (!cancelled) {
          setStats(s);
          setActivity(a);
        }
      } catch {
        if (!cancelled) setErr('Could not load dashboard data.');
      }
    };

    void load();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshKey]);

  const monthlyData = stats?.eventsByMonth ?? [];

  useEffect(() => {
    if (import.meta.env.DEV && monthlyData.length) {
      console.log('[Admin Overview] eventsByMonth from API', monthlyData);
    }
  }, [monthlyData]);

  const typeRows = useMemo(
    () =>
      (stats?.venueCategories ?? []).map((row) => ({
        ...row,
        label: displayEventTypeLabel(row.category),
      })),
    [stats?.venueCategories]
  );

  const catTotal = useMemo(() => {
    const sum = typeRows.reduce((s, c) => s + (Number.isFinite(c.count) ? c.count : 0), 0);
    return sum > 0 ? sum : 1;
  }, [typeRows]);

  const maxMonthly = Math.max(
    1,
    ...monthlyData.map((d) => (Number.isFinite(d.count) ? d.count : 0))
  );

  let donutAngle = 0;
  const donutSegments =
    typeRows
      .map((c) => {
        const frac = (Number.isFinite(c.count) ? c.count : 0) / catTotal;
        const start = donutAngle;
        donutAngle += frac * 360;
        const col = eventTypeSliceColor(c.label);
        return `${col} ${start}deg ${donutAngle}deg`;
      })
      .join(', ') || 'transparent 0deg 360deg';

  return (
    <div>
      {err && (
        <p className="admin-form-hint" style={{ color: 'var(--accent-red)', marginBottom: '1rem' }}>
          {err}
        </p>
      )}
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <div className="label">Platform total events</div>
          <div className="admin-stat-card-value">{stats ? formatNumber(stats.totalEvents) : '—'}</div>
          <div className="admin-form-hint" style={{ marginTop: '0.35rem', fontSize: '0.75rem' }}>
            All planners combined — each planner’s “My Events” shows only theirs
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="label">Inquiries · submitted / total</div>
          <div className="admin-stat-card-value">
            {stats
              ? `${formatNumber(stats.submittedInquiries)} / ${formatNumber(stats.totalInquiries)}`
              : '—'}
          </div>
          <div className="admin-form-hint" style={{ marginTop: '0.35rem', fontSize: '0.75rem' }}>
            Submitted leads / all inquiry rows
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="label">Active Planners</div>
          <div className="admin-stat-card-value">{stats ? formatNumber(stats.activePlanners) : '—'}</div>
        </div>
        <div className="admin-stat-card" style={{ cursor: 'pointer' }} onClick={loadBudgetBreakdown}>
          <div className="label">Budget Ceilings</div>
          <div className="admin-stat-card-value">{stats ? formatRevenue(stats.totalBudget ?? 0) : '—'}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
            Click to view breakdown ↗
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="label">Pending Bookings</div>
          <div className="admin-stat-card-value">{stats ? formatNumber(stats.pendingBookings) : '—'}</div>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: '1.25rem' }}>
        <h2>Breakdown · events per planner</h2>
        <p className="admin-form-hint" style={{ marginBottom: '0.75rem' }}>
          Rows here add up to <strong>Platform total events</strong>. Nimra logged in sees only Nimra&apos;s rows on
          /events — other planners&apos; projects are counted separately below.
        </p>
        <ul className="admin-activity-list" style={{ margin: 0 }}>
          {(stats?.eventsByPlanner ?? []).map((row) => (
            <li key={row.plannerName} className="admin-activity-item">
              <div className="admin-activity-title">
                {row.plannerName}{' '}
                <span className="admin-form-hint" style={{ marginLeft: '0.35rem', fontWeight: 600 }}>
                  {formatNumber(row.eventCount)} event{row.eventCount === 1 ? '' : 's'}
                </span>
              </div>
            </li>
          ))}
          {!stats?.eventsByPlanner?.length && (
            <li className="admin-form-hint">No planner data loaded.</li>
          )}
        </ul>
      </div>

      <div className="admin-two-col">
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Events per month</h2>
            {monthlyData.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllMonths(true)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: 'rgba(255,255,255,0.7)',
                  padding: '4px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Expand ↗
              </button>
            )}
          </div>
          <div className="admin-bar-chart">
            {monthlyData.slice(0, 6).map((m, i) => {
              const count = Number.isFinite(m.count) ? m.count : 0;
              const heightPx = Math.max((count / maxMonthly) * 120, count > 0 ? 16 : 0);
              return (
                <div key={`${m.label}-${i}`} className="admin-bar-wrap">
                  <div className="admin-bar" style={{ height: `${heightPx}px` }} title={`${m.label}: ${count}`} />
                  <span className="admin-bar-label">{m.label}</span>
                </div>
              );
            })}
            {!monthlyData.length && <span className="admin-form-hint">No event data yet.</span>}
          </div>
        </div>
        <div className="admin-card">
          <h2>Events by type (all planners)</h2>
          <div className="admin-donut-wrap">
            <div
              className="admin-donut"
              style={{
                background: `conic-gradient(${donutSegments})`,
              }}
            />
            <div className="admin-donut-legend">
              {typeRows.map((c, i) => (
                <div key={`${c.category}-${i}`} className="admin-legend-row">
                  <span
                    className="admin-legend-dot"
                    style={{ background: eventTypeSliceColor(c.label) }}
                  />
                  <span>
                    {c.label} — {c.count}
                  </span>
                </div>
              ))}
              {!typeRows.length && <span className="admin-form-hint">No event types yet.</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: '1.25rem' }}>
        <h2>Recent activity</h2>
        <ul className="admin-activity-list">
          {activity.map((item) => (
            <li key={item.id} className="admin-activity-item">
              <div className="admin-activity-title">{item.title}</div>
              <div className="admin-activity-meta">
                {item.subtitle && <span>{item.subtitle} · </span>}
                {new Date(item.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
          {!activity.length && <li className="admin-form-hint">No recent activity.</li>}
        </ul>
      </div>

      {showBudgetBreakdown && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowBudgetBreakdown(false)}
        >
          <div
            style={{
              background: 'var(--surface, #1a1a2e)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '70vh',
              overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px' }}>Budget Breakdown</h2>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                  {budgetBreakdown.length} events · Total:{' '}
                  {formatRevenue(budgetBreakdown.reduce((s, e) => s + e.budgetCeiling, 0))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBudgetBreakdown(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            {budgetBreakdown.map((item, i) => {
              const maxBudget = Math.max(...budgetBreakdown.map((b) => b.budgetCeiling), 1);
              const barWidth = (item.budgetCeiling / maxBudget) * 100;
              return (
                <div
                  key={`${item.eventName}-${i}`}
                  style={{
                    padding: '12px 0',
                    borderBottom: i < budgetBreakdown.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{item.eventName}</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginLeft: '8px' }}>
                        {item.eventType}
                      </span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#a78bfa' }}>
                      Rs. {item.budgetCeiling.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                      <div
                        style={{
                          width: `${barWidth}%`,
                          height: '100%',
                          borderRadius: '3px',
                          background: 'linear-gradient(90deg, #a78bfa, #c084fc)',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                    {item.plannerName}
                    {item.eventDate
                      ? ` · ${new Date(item.eventDate.includes('T') ? item.eventDate : `${item.eventDate}T12:00:00`).toLocaleDateString('en-PK', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}`
                      : ''}
                  </div>
                </div>
              );
            })}
            {!budgetBreakdown.length && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '20px' }}>
                No events found
              </div>
            )}
          </div>
        </div>
      )}

      {showAllMonths && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowAllMonths(false)}
        >
          <div
            style={{
              background: 'var(--surface, #1a1a2e)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '70vh',
              overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '18px' }}>All Events by Month</h2>
              <button
                type="button"
                onClick={() => setShowAllMonths(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            {(() => {
              const grouped: Record<string, NonNullable<AdminStats['eventsByMonth']>> = {};
              monthlyData.forEach((m) => {
                const year = m.label.split(' ')[1] || 'Unknown';
                if (!grouped[year]) grouped[year] = [];
                grouped[year].push(m);
              });
              return Object.entries(grouped)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([year, months]) => (
                  <div key={year} style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '8px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        paddingBottom: '4px',
                      }}
                    >
                      {year}
                    </div>
                    {months.map((m, i) => {
                      const count = Number.isFinite(m.count) ? m.count : 0;
                      const barWidth = Math.max((count / maxMonthly) * 100, count > 0 ? 8 : 0);
                      return (
                        <div
                          key={`${m.label}-${i}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '6px 0',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                          }}
                        >
                          <span style={{ flexShrink: 0, minWidth: '100px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                            {m.label}
                          </span>
                          <div
                            style={{
                              flex: 1,
                              height: '8px',
                              background: 'rgba(255,255,255,0.05)',
                              borderRadius: '4px',
                            }}
                          >
                            <div
                              style={{
                                width: `${barWidth}%`,
                                height: '100%',
                                borderRadius: '4px',
                                background: 'linear-gradient(90deg, #a78bfa, #c084fc)',
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: 'white',
                              minWidth: '30px',
                              textAlign: 'right',
                            }}
                          >
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
