// Budget Summary Card - Displays total budget, ceiling, and progress

import { AlertTriangle, Wallet } from 'lucide-react';
import type { BudgetSummary } from '../budget.types';
import { formatPKR } from '@/utils/currency';

interface BudgetSummaryCardProps {
  summary: BudgetSummary;
  liveOverride?: boolean;
}

export function BudgetSummaryCard({ summary, liveOverride }: BudgetSummaryCardProps) {
  const toNumber = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0;

  const grandTotal = toNumber(summary.grandTotal);
  const budgetCeiling = summary.budgetCeiling ? toNumber(summary.budgetCeiling) : null;
  const totalPaid = toNumber(summary.totalPaid);
  const totalAssetCost = toNumber(summary.totalAssetCost);
  const totalVendorCost = toNumber(summary.totalVendorCost);
  const totalRemaining = toNumber(summary.totalRemaining);
  const overBudgetAmount = toNumber(summary.overBudgetAmount);

  const utilizationPercent = budgetCeiling
    ? Math.min((grandTotal / budgetCeiling) * 100, 100)
    : 0;

  const paidPercent = totalVendorCost > 0 ? Math.min((totalPaid / totalVendorCost) * 100, 100) : 0;

  return (
    <div
      className="budget-section-card"
      style={{ padding: '1.5rem' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="p-3"
          style={{
            background: 'var(--lavender)',
            borderRadius: 'var(--radius-pill)',
          }}
        >
          <Wallet className="w-5 h-5" style={{ color: 'var(--text)' }} />
        </div>
        <div>
          <h2
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            Budget Summary
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              fontFamily: 'DM Sans, sans-serif',
              color: 'var(--text-muted)',
            }}
          >
            {liveOverride ? 'Live from 3D editor (unsaved)' : 'Total event cost breakdown'}
          </p>
        </div>
      </div>

      {/* Grand Total */}
      <div className="mb-6">
        <p
          style={{
            fontSize: '0.75rem',
            fontFamily: 'DM Sans, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            marginBottom: '0.5rem',
          }}
        >
          Grand Total
        </p>
        <p
          style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '2.5rem',
            fontWeight: 700,
            color: summary.isOverBudget ? '#dc2626' : 'var(--text)',
          }}
        >
          {formatPKR(grandTotal)}
        </p>
      </div>

      {/* Budget ceiling progress */}
      {budgetCeiling && (
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span
              style={{
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
                color: 'var(--text-muted)',
              }}
            >
              Budget Ceiling
            </span>
            <span
              style={{
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              {formatPKR(budgetCeiling)}
            </span>
          </div>

          <div
            className="overflow-hidden"
            style={{
              background: 'var(--surface2)',
              borderRadius: 'var(--radius-pill)',
              height: '10px',
            }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${utilizationPercent}%`,
                borderRadius: 'var(--radius-pill)',
                background: summary.isOverBudget
                  ? 'linear-gradient(90deg, #f0a0b4, #dc2626)'
                  : 'linear-gradient(90deg, var(--lavender), var(--lavender-d))',
              }}
            />
          </div>

          {summary.isOverBudget && (
            <div
              className="flex items-center gap-2 mt-3 px-4 py-2"
              style={{
                background: 'var(--rose)',
                borderRadius: 'var(--radius-pill)',
              }}
            >
              <AlertTriangle className="w-4 h-4" style={{ color: '#8a2840' }} />
              <span
                style={{
                  fontSize: '0.875rem',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 600,
                  color: '#8a2840',
                }}
              >
                Over budget by {formatPKR(overBudgetAmount)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Payment progress */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span
            style={{
              fontSize: '0.875rem',
              fontFamily: 'DM Sans, sans-serif',
              color: 'var(--text-muted)',
            }}
          >
            Paid
          </span>
          <span
            style={{
              fontSize: '0.875rem',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            {totalVendorCost > 0
              ? `${formatPKR(totalPaid)} / ${formatPKR(totalVendorCost)} (contract)`
              : formatPKR(totalPaid)}
          </span>
        </div>

        <div
          className="overflow-hidden"
          style={{
            background: 'var(--surface2)',
            borderRadius: 'var(--radius-pill)',
            height: '10px',
          }}
        >
          <div
            className="h-full transition-all"
            style={{
              width: `${paidPercent}%`,
              borderRadius: 'var(--radius-pill)',
              background: 'linear-gradient(90deg, var(--mint), var(--mint-d))',
            }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className="p-4"
          style={{
            background: 'var(--surface2)',
            borderRadius: '12px',
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              fontFamily: 'DM Sans, sans-serif',
              color: 'var(--text-muted)',
              marginBottom: '0.25rem',
            }}
          >
            Asset Costs
          </p>
          <p
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            {formatPKR(totalAssetCost)}
          </p>
        </div>

        <div
          className="p-4"
          style={{
            background: 'var(--surface2)',
            borderRadius: '12px',
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              fontFamily: 'DM Sans, sans-serif',
              color: 'var(--text-muted)',
              marginBottom: '0.25rem',
            }}
          >
            Remaining
          </p>
          <p
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: totalRemaining > 0 ? 'var(--text)' : 'var(--mint-d)',
            }}
          >
            {formatPKR(totalRemaining)}
          </p>
        </div>
      </div>
    </div>
  );
}
