// Budget Sidebar - Live budget display with ceiling warning

import { useMemo } from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';

import { usePlacedAssets, useTotalBudget, useAssetCountByCategory } from '../store/editorStore';
import { CATEGORY_LABELS } from '../editor.constants';
import type { AssetCategory } from '../editor.types';
import { formatPKR } from '@/utils/currency';

interface BudgetSidebarProps {
  budgetCeiling?: number;
  /** @deprecated Editor sidebar shows only asset costs; vendor contracts are on Budget page */
  totalVendorContractAmount?: number;
}

export function BudgetSidebar({
  budgetCeiling,
}: BudgetSidebarProps) {
  const placedAssets = usePlacedAssets();
  const totalSpent = useTotalBudget(); // Asset costs only — vendor contracts shown on Budget page
  const assetCounts = useAssetCountByCategory();

  const budgetByCategory = useMemo(() => {
    const totals: Record<AssetCategory, number> = {
      seating: 0,
      tables: 0,
      lighting: 0,
      decor: 0,
      staging: 0,
      backdrops: 0,
      other: 0,
    };

    placedAssets.forEach((asset) => {
      const price = asset.priceOverride ?? asset.unitPrice;
      totals[asset.category] += price;
    });

    return totals;
  }, [placedAssets]);

  const isOverBudget =
    budgetCeiling !== undefined && totalSpent > budgetCeiling;
  const budgetPercentage = budgetCeiling
    ? Math.min((totalSpent / budgetCeiling) * 100, 100)
    : 0;

  return (
    <div 
      className="flex flex-col h-full min-h-0"
      style={{
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div 
        className="p-5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h2 
          className="text-xl mb-1"
          style={{ 
            fontFamily: 'Playfair Display, serif',
            fontWeight: 600,
            color: 'var(--text)',
          }}
        >
          Budget
        </h2>
        <p 
          style={{
            fontSize: '0.875rem',
            fontFamily: 'DM Sans, sans-serif',
            color: 'var(--text-muted)',
          }}
        >
          {placedAssets.length} items placed
        </p>
      </div>

      {/* Total budget display */}
      <div 
        className="p-5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <span 
            style={{
              fontSize: '0.875rem',
              fontFamily: 'DM Sans, sans-serif',
              color: 'var(--text-muted)',
            }}
          >
            Total Spent
          </span>
          <span
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.5rem',
              fontWeight: 700,
            color: isOverBudget ? '#dc2626' : 'var(--text)',
          }}
        >
          {formatPKR(totalSpent)}
          </span>
        </div>

        {/* Budget ceiling bar */}
        {budgetCeiling !== undefined && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span 
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'DM Sans, sans-serif',
                  color: 'var(--text-muted)',
                }}
              >
                Budget Ceiling
              </span>
              <span 
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'DM Sans, sans-serif',
                  color: 'var(--text-muted)',
                }}
              >
                {formatPKR(budgetCeiling)}
              </span>
            </div>

            {/* Progress bar */}
            <div 
              className="overflow-hidden"
              style={{
                background: 'var(--surface2)',
                borderRadius: 'var(--radius-pill)',
                height: '10px',
              }}
            >
              <div
                className="h-full transition-all duration-300"
                style={{ 
                  width: `${budgetPercentage}%`,
                  borderRadius: 'var(--radius-pill)',
                  background: isOverBudget 
                    ? 'linear-gradient(90deg, #f0a0b4, #dc2626)'
                    : 'linear-gradient(90deg, var(--lavender), var(--lavender-d))',
                }}
              />
            </div>

            {isOverBudget && (
              <div 
                className="flex items-center gap-2 px-4 py-2"
                style={{
                  background: 'var(--rose)',
                  borderRadius: 'var(--radius-pill)',
                }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#8a2840' }} />
                <span 
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 600,
                    color: '#8a2840',
                  }}
                >
                  Over budget by {formatPKR(totalSpent - budgetCeiling)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category breakdown - scrollable */}
      <div className="editor-budget-scroll p-5">
        <h3 
          className="mb-4 flex items-center gap-2"
          style={{
            fontSize: '0.75rem',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
          }}
        >
          <TrendingUp className="w-4 h-4" />
          Breakdown
        </h3>

        <div className="space-y-3">
          {(Object.keys(budgetByCategory) as AssetCategory[]).map((category) => {
            const count = assetCounts[category];
            const amount = budgetByCategory[category];

            if (count === 0) return null;

            const categoryInfo = getCategoryInfo(category);

            return (
              <div
                key={category}
                className="p-3"
                style={{
                  background: 'var(--surface2)',
                  borderRadius: '12px',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3"
                      style={{ 
                        backgroundColor: categoryInfo.color,
                        borderRadius: '4px',
                      }}
                    />
                    <span 
                      style={{
                        fontSize: '0.875rem',
                        fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 500,
                        color: 'var(--text)',
                      }}
                    >
                      {CATEGORY_LABELS[category]}
                    </span>
                    <span 
                      style={{
                        fontSize: '0.75rem',
                        fontFamily: 'DM Sans, sans-serif',
                        color: 'var(--text-muted)',
                      }}
                    >
                      ×{count}
                    </span>
                  </div>
                  <span 
                    style={{
                      fontSize: '0.875rem',
                      fontFamily: 'Playfair Display, serif',
                      fontWeight: 600,
                      color: 'var(--text)',
                    }}
                  >
                    {formatPKR(amount)}
                  </span>
                </div>
                
                {/* Mini progress bar for category */}
                <div 
                  className="overflow-hidden"
                  style={{
                    background: 'var(--bg)',
                    borderRadius: 'var(--radius-pill)',
                    height: '6px',
                  }}
                >
                  <div
                    className="h-full"
                    style={{ 
                      width: budgetCeiling ? `${Math.min((amount / budgetCeiling) * 100, 100)}%` : '0%',
                      borderRadius: 'var(--radius-pill)',
                      background: `linear-gradient(90deg, ${categoryInfo.color}, ${categoryInfo.colorD})`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getCategoryInfo(category: AssetCategory): { color: string; colorD: string } {
  const info: Record<AssetCategory, { color: string; colorD: string }> = {
    seating: { color: '#f9c5d1', colorD: '#f0a0b4' },
    tables: { color: '#ffd6b3', colorD: '#ffc090' },
    lighting: { color: '#fef3a0', colorD: '#fde97a' },
    decor: { color: '#b8f0e0', colorD: '#8ee4cc' },
    staging: { color: '#d4c5f9', colorD: '#b9a3f0' },
    backdrops: { color: '#b3deff', colorD: '#8ecbff' },
    other: { color: '#c8c6d0', colorD: '#a8a6b4' },
  };
  return info[category] || { color: '#f3f0ec', colorD: '#e8e4dc' };
}
