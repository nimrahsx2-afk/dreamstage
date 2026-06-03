// Category Breakdown Chart - Visual breakdown of costs by category

import { PieChart } from 'lucide-react';
import type { CategoryBreakdown } from '../budget.types';
import { formatPKR } from '@/utils/currency';

interface CategoryBreakdownChartProps {
  breakdown: CategoryBreakdown[];
  /** When true, breakdown is computed from placed assets in 3D editor */
  liveOverride?: boolean;
}

const CATEGORY_COLORS: Record<string, { color: string; colorD: string }> = {
  seating: { color: '#f9c5d1', colorD: '#f0a0b4' },
  tables: { color: '#ffd6b3', colorD: '#ffc090' },
  lighting: { color: '#fef3a0', colorD: '#fde97a' },
  decor: { color: '#b8f0e0', colorD: '#8ee4cc' },
  staging: { color: '#d4c5f9', colorD: '#b9a3f0' },
  backdrops: { color: '#b3deff', colorD: '#8ecbff' },
  vendor: { color: '#c9a6e4', colorD: '#b894d6' },
  other: { color: '#f3f0ec', colorD: '#e8e4dc' },
};

export function CategoryBreakdownChart({ breakdown, liveOverride }: CategoryBreakdownChartProps) {
  if (breakdown.length === 0) {
    return (
      <div
        className="p-6"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="p-3"
            style={{
              background: 'var(--peach)',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            <PieChart className="w-5 h-5" style={{ color: 'var(--text)' }} />
          </div>
          <h3
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            Category Breakdown
            {liveOverride && (
              <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                (live from 3D scene)
              </span>
            )}
          </h3>
        </div>
        <p
          className="text-center py-8"
          style={{
            fontFamily: 'DM Sans, sans-serif',
            color: 'var(--text-muted)',
          }}
        >
          No budget items yet
        </p>
      </div>
    );
  }

  const toNumber = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0;

  const maxCost = Math.max(...breakdown.map((c) => toNumber(c.totalCost)));

  return (
    <div
      className="p-6"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div
          className="p-3"
          style={{
            background: 'var(--peach)',
            borderRadius: 'var(--radius-pill)',
          }}
        >
          <PieChart className="w-5 h-5" style={{ color: 'var(--text)' }} />
        </div>
        <h3
          style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--text)',
          }}
        >
          Category Breakdown
          {liveOverride && (
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
              (live from 3D scene)
            </span>
          )}
        </h3>
      </div>

      <div className="space-y-4">
        {breakdown.map((category, index) => {
          const categoryKey = (category.category ?? '').toString().toLowerCase();
          const colors = CATEGORY_COLORS[categoryKey] || CATEGORY_COLORS.other;
          const totalCost = toNumber(category.totalCost);
          const percentage = toNumber(category.percentage);
          const itemCount = toNumber(category.itemCount);
          const widthPercent = maxCost > 0 ? (totalCost / maxCost) * 100 : 0;

          return (
            <div key={categoryKey || `category-${index}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3"
                    style={{
                      background: colors.color,
                      borderRadius: '4px',
                    }}
                  />
                  <span
                    className="capitalize"
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'var(--text)',
                    }}
                  >
                    {category.category}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: 'DM Sans, sans-serif',
                      color: 'var(--text-muted)',
                    }}
                  >
                    ×{itemCount}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: 'DM Sans, sans-serif',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {percentage.toFixed(1)}%
                  </span>
                  <span
                    style={{
                      fontFamily: 'Playfair Display, serif',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                    }}
                  >
                    {formatPKR(totalCost)}
                  </span>
                </div>
              </div>

              <div
                className="overflow-hidden"
                style={{
                  background: 'var(--surface2)',
                  borderRadius: 'var(--radius-pill)',
                  height: '8px',
                }}
              >
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${widthPercent}%`,
                    borderRadius: 'var(--radius-pill)',
                    background: `linear-gradient(90deg, ${colors.color}, ${colors.colorD})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
