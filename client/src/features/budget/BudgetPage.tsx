/**
 * Budget Page - Pixel-perfect recreation of dreamstage-budget.html
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Loader2, RefreshCw, RotateCcw, Download, Printer } from 'lucide-react';

import { api } from '@/services/api';
import { useEditorStore } from '../editor/store/editorStore';
import { downloadBudgetPdf } from './budgetPdf';
import { BudgetSummaryCard } from './components/BudgetSummaryCard';
import { VendorList } from './components/VendorList';
import * as budgetApi from './budget.api';
import type {
  BudgetSummary,
  BudgetItem,
  CategoryBreakdown,
  VendorSummary,
  VendorInput,
} from './budget.types';
import { formatPKR } from '@/utils/currency';
import './BudgetPage.css';

type EventContext = { event: { name: string; eventDate: string; budgetCeiling?: number | null }; reload?: () => void };

const CATEGORY_EMOJI: Record<string, string> = {
  seating: '🪑',
  tables: '🪑',
  lighting: '💡',
  decor: '🌸',
  staging: '🎭',
  backdrops: '🖼️',
  catering: '🍽️',
  photography: '📸',
  entertainment: '🎵',
  venue: '🏛️',
  other: '📦',
};

const CATEGORY_BAR: Record<string, string> = {
  seating: 'budget-bar-lavender',
  tables: 'budget-bar-lavender',
  lighting: 'budget-bar-lemon',
  decor: 'budget-bar-rose',
  staging: 'budget-bar-peach',
  backdrops: 'budget-bar-sky',
  catering: 'budget-bar-rose',
  photography: 'budget-bar-sky',
  entertainment: 'budget-bar-peach',
  venue: 'budget-bar-lavender',
  other: 'budget-bar-lemon',
};

const CATEGORY_DOT: Record<string, string> = {
  seating: 'var(--lavender-d)',
  tables: 'var(--lavender-d)',
  lighting: 'var(--lemon-d)',
  decor: 'var(--rose-d)',
  staging: 'var(--peach-d)',
  backdrops: 'var(--sky-d)',
  catering: 'var(--rose-d)',
  photography: 'var(--sky-d)',
  entertainment: 'var(--peach-d)',
  venue: 'var(--lavender-d)',
  other: 'var(--lemon-d)',
};

const CATEGORY_BG: Record<string, string> = {
  seating: 'var(--lavender)',
  tables: 'var(--lavender)',
  lighting: 'var(--lemon)',
  decor: 'var(--rose)',
  staging: 'var(--peach)',
  backdrops: 'var(--sky)',
  catering: 'var(--rose)',
  photography: 'var(--sky)',
  entertainment: 'var(--peach)',
  venue: 'var(--lavender)',
  other: 'var(--lemon)',
};

export function BudgetPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { event } = useOutletContext<EventContext>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([]);
  const [vendorSummaries, setVendorSummaries] = useState<VendorSummary[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [sceneAssets, setSceneAssets] = useState<Array<{ category: string; unitPrice: number; priceOverride?: number }>>([]);
  const safeBreakdown = Array.isArray(breakdown) ? breakdown : [];
  const safeVendorSummaries = Array.isArray(vendorSummaries) ? vendorSummaries : [];

  const editorEventId = useEditorStore((state) => state.eventId);
  const editorIsDirty = useEditorStore((state) => state.isDirty);
  const placedAssets = useEditorStore((state) => state.placedAssets);

  // Total Spent = asset costs from placed items in scene + vendor contract amounts
  // Use scene as source of truth for assets; vendorSummaries for vendor costs
  const totalAssetCostFromScene = useMemo(() => {
    const sources: Array<{ unitPrice: number; priceOverride?: number }> = [];
    if (eventId === editorEventId && placedAssets.length > 0) {
      sources.push(...placedAssets.map((a) => ({ unitPrice: a.unitPrice, priceOverride: a.priceOverride })));
    } else if (sceneAssets.length > 0) {
      sources.push(...sceneAssets.map((a) => ({ unitPrice: a.unitPrice, priceOverride: a.priceOverride })));
    }
    return sources.reduce((sum, a) => sum + (a.priceOverride ?? a.unitPrice), 0);
  }, [eventId, editorEventId, placedAssets, sceneAssets]);

  const totalVendorCostFromVendors = useMemo(
    () => safeVendorSummaries.reduce((sum, v) => sum + (v.totalContractAmount ?? 0), 0),
    [safeVendorSummaries]
  );

  // displaySummary: always compute from scene + vendors (never use stale budget_items)
  const displaySummary = useMemo(() => {
    if (!summary) return null;
    const totalAssetCost = totalAssetCostFromScene;
    const totalVendorCost = totalVendorCostFromVendors;
    const grandTotal = totalAssetCost + totalVendorCost;
    const budgetCeiling = summary.budgetCeiling ?? event?.budgetCeiling ?? null;
    const isOverBudget = budgetCeiling != null && grandTotal > budgetCeiling;
    const totalRemaining =
      budgetCeiling != null ? Math.max(0, budgetCeiling - grandTotal) : 0;
    return {
      ...summary,
      totalAssetCost,
      totalVendorCost,
      grandTotal,
      isOverBudget,
      overBudgetAmount: isOverBudget ? grandTotal - budgetCeiling : 0,
      totalRemaining,
    };
  }, [
    summary,
    totalAssetCostFromScene,
    totalVendorCostFromVendors,
    event?.budgetCeiling,
  ]);

  const grandTotal = displaySummary ? (displaySummary.grandTotal ?? 0) : 0;

  const liveBreakdown = useMemo(() => {
    const sources: Array<{ category: string; unitPrice: number; priceOverride?: number }> = [];
    if (eventId === editorEventId && placedAssets.length > 0) {
      sources.push(
        ...placedAssets.map((a) => ({
          category: a.category ?? 'other',
          unitPrice: a.unitPrice,
          priceOverride: a.priceOverride,
        }))
      );
    } else if (sceneAssets.length > 0) {
      sources.push(...sceneAssets);
    }
    if (sources.length === 0) return null;
    const byCategory = new Map<string, { count: number; total: number }>();
    let grandTotalAssets = 0;
    sources.forEach((a) => {
      const price = a.priceOverride ?? a.unitPrice;
      grandTotalAssets += price;
      const cat = a.category ?? 'other';
      const existing = byCategory.get(cat) ?? { count: 0, total: 0 };
      byCategory.set(cat, {
        count: existing.count + 1,
        total: existing.total + price,
      });
    });
    return Array.from(byCategory.entries())
      .map(([category, data]) => ({
        category,
        itemCount: data.count,
        totalCost: data.total,
        percentage: grandTotalAssets > 0 ? (data.total / grandTotalAssets) * 100 : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [eventId, editorEventId, placedAssets, sceneAssets]);

  const displayBreakdown = liveBreakdown ?? safeBreakdown;

  const budgetCeiling = displaySummary?.budgetCeiling ?? event?.budgetCeiling ?? null;
  const isOverBudget = displaySummary?.isOverBudget ?? false;
  const overAmount = displaySummary?.overBudgetAmount ?? 0;

  const fetchData = useCallback(async () => {
    if (!eventId) return;
    try {
      const [summaryData, breakdownData, vendorsData, itemsData, sceneRes] = await Promise.all([
        budgetApi.getBudgetSummary(eventId),
        budgetApi.getCategoryBreakdown(eventId),
        budgetApi.getVendorSummaries(eventId),
        budgetApi.getBudgetItems(eventId).catch(() => []),
        api.get(`/editor/${eventId}/scene`).catch(() => ({ data: { data: { scene: null } } })),
      ]);
      setSummary(summaryData && typeof summaryData === 'object' ? summaryData : null);
      setBreakdown(Array.isArray(breakdownData) ? breakdownData : []);
      setVendorSummaries(Array.isArray(vendorsData) ? vendorsData : []);
      setBudgetItems(Array.isArray(itemsData) ? itemsData : []);

      const sceneJson = (sceneRes as any)?.data?.data?.scene?.sceneJson;
      const assets = sceneJson?.placedAssets ?? [];
      setSceneAssets(
        Array.isArray(assets)
          ? assets.map((a: any) => ({
              category: a.category ?? 'other',
              unitPrice: Number(a.unitPrice) || 0,
              priceOverride: a.priceOverride != null ? Number(a.priceOverride) : undefined,
            }))
          : []
      );
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load budget data');
    }
  }, [eventId]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchData();
      setIsLoading(false);
    };
    load();
  }, [fetchData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const handleSyncWithScene = async () => {
    if (!eventId) return;
    setIsSyncing(true);
    try {
      if (editorEventId === eventId && editorIsDirty) {
        const sceneAssetsToSync = placedAssets.map((a) => ({
          assetId: a.assetId,
          quantity: 1,
          priceOverride: a.priceOverride,
        }));
        await budgetApi.syncBudgetFromScene(eventId, sceneAssetsToSync);
      } else {
        await budgetApi.syncBudgetFromSavedScene(eventId);
      }
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddVendor = async (input: VendorInput) => {
    if (!eventId) return;
    await budgetApi.createVendor(eventId, input);
    await fetchData();
  };

  const handleUpdateVendor = async (vendorId: string, input: Partial<VendorInput>) => {
    if (!eventId) return;
    await budgetApi.updateVendor(eventId, vendorId, input);
    await fetchData();
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!eventId) return;
    await budgetApi.deleteVendor(eventId, vendorId);
    await fetchData();
  };

  // Line items: budget items + vendors
  type LineItem = {
    id: string;
    type: 'budget' | 'vendor';
    itemName: string;
    category: string;
    vendorName: string;
    dueDate: string;
    status: 'Confirmed' | 'Pending' | 'Partial' | 'Over Budget';
    amount: number;
    isOverBudget: boolean;
  };
  const lineItems = useMemo((): LineItem[] => {
    const items: LineItem[] = [];
    const vendorMap = new Map(safeVendorSummaries.map((v) => [v.vendorId, v]));
    const highestAmount = Math.max(
      ...budgetItems.map((b) => ((b.unitPriceOverride ?? b.unitPrice) * (b.quantity || 1))),
      ...safeVendorSummaries.map((v) => v.totalContractAmount),
      0
    );
    budgetItems.forEach((b) => {
      const amt = (b.unitPriceOverride ?? b.unitPrice) * (b.quantity || 1);
      items.push({
        id: b.id,
        type: 'budget',
        itemName: b.description || `Asset × ${b.quantity}`,
        category: b.category || 'other',
        vendorName: b.vendorId ? vendorMap.get(b.vendorId)?.vendorName ?? (vendorMap.get(b.vendorId)?.company ?? '') : '—',
        dueDate: '—',
        status: isOverBudget && amt >= highestAmount ? 'Over Budget' : 'Confirmed',
        amount: amt,
        isOverBudget: isOverBudget && amt >= highestAmount,
      });
    });
    safeVendorSummaries.forEach((v) => {
      const amt = v.totalContractAmount;
      const statusMap = { unpaid: 'Pending' as const, partial: 'Partial' as const, paid: 'Confirmed' as const };
      const status: LineItem['status'] =
        isOverBudget && amt >= highestAmount ? 'Over Budget' : (statusMap[v.paymentStatus] ?? 'Pending');
      items.push({
        id: `vendor-${v.vendorId}`,
        type: 'vendor',
        itemName: `${v.vendorName} — ${v.category}`,
        category: v.category,
        vendorName: v.company || v.vendorName,
        dueDate: '—',
        status,
        amount: amt,
        isOverBudget: isOverBudget && amt >= highestAmount,
      });
    });
    return items.sort((a, b) => b.amount - a.amount);
  }, [budgetItems, safeVendorSummaries, isOverBudget]);

  const handleExportCsv = () => {
    const headers = ['Item', 'Vendor', 'Due Date', 'Status', 'Amount'];
    const rows = lineItems.map((r) => [
      r.itemName,
      r.vendorName,
      r.dueDate,
      r.status,
      `Rs. ${r.amount.toLocaleString('en-PK')}`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-line-items-${event?.name ?? 'event'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Recent activity (derived from vendors, payments, over-budget)
  const recentActivity = useMemo(() => {
    const acts: Array<{ id: string; event: string; meta: string; dotColor: string }> = [];
    if (isOverBudget && overAmount > 0) {
      acts.push({
        id: 'over',
        event: `Over budget by ${formatPKR(overAmount)}`,
        meta: 'Auto-detected',
        dotColor: 'var(--danger)',
      });
    }
    safeVendorSummaries
      .filter((v) => v.totalPaid > 0)
      .slice(0, 3)
      .forEach((v, i) => {
        acts.push({
          id: `pay-${v.vendorId}-${i}`,
          event: `Payment — ${v.vendorName} — ${formatPKR(v.totalPaid)}`,
          meta: 'Vendor',
          dotColor: 'var(--mint-d)',
        });
      });
    if (budgetCeiling) {
      acts.push({
        id: 'ceiling',
        event: `Budget ceiling set at ${formatPKR(budgetCeiling)}`,
        meta: 'Event',
        dotColor: 'var(--peach-d)',
      });
    }
    return acts.slice(0, 5);
  }, [isOverBudget, overAmount, safeVendorSummaries, budgetCeiling]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
          <p style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--text-muted)' }}>Loading budget...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-4 p-8" style={{ background: 'var(--surface)', borderRadius: '20px', boxShadow: 'var(--shadow)' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#dc2626' }}>{error}</p>
          <button onClick={handleRefresh} className="budget-btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  const totalRemaining = displaySummary?.totalRemaining ?? 0;
  const utilizationPercent = budgetCeiling ? Math.min((grandTotal / budgetCeiling) * 100, 100) : 0;

  const toNumber = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const maxCost = displayBreakdown.length > 0
    ? Math.max(...displayBreakdown.map((c) => toNumber(c.totalCost)), 1)
    : 1;

  return (
    <main className="budget-page budget-print-container" style={{ background: 'var(--bg)' }}>
      {/* Page header */}
      <div className="budget-page-header">
        <div>
          <div className="budget-page-label">Budget Dashboard</div>
          <h1 className="budget-page-title">{event?.name ?? 'Event'} — <em>Budget</em></h1>
          <p className="budget-page-meta">
            {event?.eventDate ? new Date(event.eventDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
            {eventId === editorEventId && editorIsDirty && ' · Live from 3D editor (unsaved)'}
          </p>
        </div>
        <div className="budget-header-right no-print">
          <button
            onClick={handleSyncWithScene}
            disabled={isSyncing}
            className="budget-btn-secondary flex items-center gap-2"
            title="Sync budget with 3D scene"
          >
            <RotateCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync with Scene
          </button>
          <button onClick={handleRefresh} disabled={isRefreshing} className="budget-btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() =>
              downloadBudgetPdf({
                eventName: event?.name ?? 'Event',
                eventDate: event?.eventDate ? new Date(event.eventDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' }) : '—',
                summary: displaySummary ?? null,
                breakdown: safeBreakdown,
                vendors: safeVendorSummaries,
              })
            }
            className="budget-btn-secondary flex items-center gap-2 no-print"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button type="button" onClick={() => window.print()} className="budget-btn-secondary flex items-center gap-2 no-print">
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Over budget alert */}
      {isOverBudget && (
        <div className="budget-alert-banner">
          <div className="budget-alert-icon">⚠️</div>
          <div className="budget-alert-text">
            <div className="budget-alert-title">Over budget by {formatPKR(overAmount)}</div>
            <div className="budget-alert-sub">Review line items or sync with 3D scene to update</div>
          </div>
        </div>
      )}

      {/* Stat cards - 4 cards matching design */}
      <div className="budget-stat-grid">
        <div className="budget-stat-card budget-sc-lavender">
          <div className="budget-stat-icon budget-si-lavender">💰</div>
          <div className="budget-stat-label">Total Budget</div>
          <div className="budget-stat-value">{formatPKR(budgetCeiling ?? 0)}</div>
          <span className="budget-stat-delta budget-delta-neutral">Ceiling</span>
        </div>
        <div className="budget-stat-card budget-sc-rose">
          <div className="budget-stat-icon budget-si-rose">📊</div>
          <div className="budget-stat-label">Total Spent</div>
          <div className="budget-stat-value">{formatPKR(grandTotal)}</div>
          <span className="budget-stat-delta budget-delta-up">
            ↑ {budgetCeiling ? `${utilizationPercent.toFixed(1)}% used` : 'Assets + vendor contracts'}
          </span>
        </div>
        <div className="budget-stat-card budget-sc-mint">
          <div className="budget-stat-icon budget-si-mint">✅</div>
          <div className="budget-stat-label">Remaining</div>
          <div className="budget-stat-value">{formatPKR(totalRemaining)}</div>
          <span className="budget-stat-delta budget-delta-up">Buffer</span>
        </div>
        <div className="budget-stat-card budget-sc-peach">
          <div className="budget-stat-icon budget-si-peach">⚠️</div>
          <div className="budget-stat-label">Over Budget</div>
          <div className="budget-stat-value">{isOverBudget ? formatPKR(overAmount) : '—'}</div>
          <span className={`budget-stat-delta ${isOverBudget ? 'budget-delta-warn' : 'budget-delta-neutral'}`}>
            {isOverBudget ? 'Action needed' : 'On track'}
          </span>
        </div>
      </div>

      {/* Main dashboard grid */}
      <div className="budget-dashboard-grid">
        {/* Left: Category Breakdown - design structure */}
        <div className="budget-section-card">
          <div className="budget-card-header">
            <div>
              <div className="budget-card-title">Category Breakdown</div>
              <div className="budget-card-subtitle">
                {liveBreakdown ? 'Live from 3D scene' : 'Spend by category from assets'}
              </div>
            </div>
          </div>
          <div className="budget-breakdown-body">
            {displayBreakdown.length === 0 ? (
              <div style={{ padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                <p>
                  No assets placed in 3D scene.
                  {totalVendorCostFromVendors > 0
                    ? ` Total Spent includes Rs. ${totalVendorCostFromVendors.toLocaleString('en-PK')} from vendor contracts.`
                    : ' Place assets in the editor or sync with scene.'}
                </p>
              </div>
            ) : (
              displayBreakdown.map((category, index) => {
                const key = (category.category ?? '').toString().toLowerCase();
                const totalCost = toNumber(category.totalCost);
                const percentage = toNumber(category.percentage);
                const widthPercent = maxCost > 0 ? Math.min((totalCost / maxCost) * 100, 100) : 0;
                const barClass = CATEGORY_BAR[key] || 'budget-bar-lavender';
                const dotColor = CATEGORY_DOT[key] || 'var(--lavender-d)';
                const emoji = CATEGORY_EMOJI[key] || '📦';
                const label = category.category?.charAt(0).toUpperCase() + (category.category?.slice(1) ?? '');

                return (
                  <div key={key || `cat-${index}`} className="budget-breakdown-row">
                    <div>
                      <div className="budget-breakdown-info">
                        <div className="budget-breakdown-name">
                          <div className="budget-breakdown-dot" style={{ background: dotColor }} />
                          {emoji} {label}
                        </div>
                        <div className="budget-breakdown-amounts">
                          <div className="budget-breakdown-spent">{formatPKR(totalCost)}</div>
                          <div className="budget-breakdown-budget">{percentage.toFixed(1)}% of total</div>
                        </div>
                      </div>
                      <div className="budget-progress-track">
                        <div className={`budget-progress-fill ${barClass}`} style={{ width: `${widthPercent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Budget Summary + Vendors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {displaySummary && (
            <BudgetSummaryCard summary={displaySummary} liveOverride={eventId === editorEventId && editorIsDirty} />
          )}
          <VendorList
            vendors={safeVendorSummaries}
            onAddVendor={handleAddVendor}
            onUpdateVendor={handleUpdateVendor}
            onDeleteVendor={handleDeleteVendor}
            onRefetch={fetchData}
            eventId={eventId!}
          />
        </div>
      </div>

      {/* Line Items table */}
      <div className="budget-section-card budget-bottom-section">
        <div className="budget-card-header">
          <div>
            <div className="budget-card-title">Line Items</div>
            <div className="budget-card-subtitle">All individual expenses and commitments</div>
          </div>
          <button type="button" onClick={handleExportCsv} className="budget-card-action">
            Export CSV
          </button>
        </div>
        <table className="budget-items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Vendor</th>
              <th>Due Date</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="budget-items-empty">
                  No line items yet. Sync with 3D scene or add vendors.
                </td>
              </tr>
            ) : (
              lineItems.map((row) => {
                const key = (row.category ?? 'other').toLowerCase().replace(/\s+/g, '');
                const emoji = CATEGORY_EMOJI[key] || CATEGORY_EMOJI[row.category] || '📦';
                const bg = CATEGORY_BG[key] || CATEGORY_BG[row.category] || 'var(--lavender)';
                const statusClass =
                  row.status === 'Over Budget'
                    ? 'budget-sp-over'
                    : row.status === 'Confirmed'
                      ? 'budget-sp-confirmed'
                      : 'budget-sp-pending';
                return (
                  <tr key={row.id}>
                    <td>
                      <div className="budget-item-name-cell">
                        <div className="budget-item-cat-badge" style={{ background: bg }}>
                          {emoji}
                        </div>
                        <div>
                          <div className="budget-item-name">{row.itemName}</div>
                          <div className="budget-item-category">
                            {(row.category?.[0]?.toUpperCase() ?? '') + (row.category?.slice(1) ?? '')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="budget-item-vendor">{row.vendorName || '—'}</td>
                    <td className="budget-item-due">{row.dueDate}</td>
                    <td>
                      <span className={`budget-status-pill ${statusClass}`}>{row.status}</span>
                    </td>
                    <td
                      className="budget-amount-cell"
                      style={row.isOverBudget ? { color: 'var(--danger)' } : undefined}
                    >
                      {formatPKR(row.amount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Recent Activity */}
      <div className="budget-bottom-grid">
        <div className="budget-section-card">
          <div className="budget-card-header">
            <div>
              <div className="budget-card-title">Recent Activity</div>
              <div className="budget-card-subtitle">Budget changes & approvals</div>
            </div>
          </div>
          <div className="budget-timeline-body">
            {recentActivity.length === 0 ? (
              <p className="budget-timeline-empty">No recent activity</p>
            ) : (
              recentActivity.map((act, idx) => (
                <div key={act.id} className="budget-timeline-item">
                  <div className="budget-timeline-dot-col">
                    <div
                      className="budget-timeline-dot"
                      style={{ background: act.dotColor }}
                    />
                    {idx < recentActivity.length - 1 && <div className="budget-timeline-line" />}
                  </div>
                  <div className="budget-timeline-content">
                    <div className="budget-timeline-event">{act.event}</div>
                    <div className="budget-timeline-meta">{act.meta}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
