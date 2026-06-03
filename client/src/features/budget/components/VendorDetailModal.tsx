/**
 * Vendor Detail Modal - Add payment, mark as fully paid
 */

import { useState, useEffect } from 'react';
import { X, DollarSign, CheckCircle2 } from 'lucide-react';
import type { VendorSummary, VendorPayment, VendorPaymentInput } from '../budget.types';
import * as budgetApi from '../budget.api';
import { formatPKR } from '@/utils/currency';

interface VendorDetailModalProps {
  eventId: string;
  vendor: VendorSummary | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function VendorDetailModal({
  eventId,
  vendor,
  onClose,
  onUpdated,
}: VendorDetailModalProps) {
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<VendorPaymentInput>({
    amount: 0,
    type: 'deposit',
  });

  useEffect(() => {
    if (!vendor) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await budgetApi.getVendorPayments(eventId, vendor.vendorId);
        if (!cancelled) setPayments(data ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId, vendor?.vendorId]);

  const totalContract = vendor ? (vendor.totalContractAmount ?? 0) : 0;
  const totalPaid = vendor ? (vendor.totalPaid ?? 0) : 0;
  const balance = totalContract - totalPaid;

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    if (!vendor || paymentForm.amount <= 0) return;
    if (paymentForm.amount > balance) {
      setPaymentError(`Cannot pay more than remaining balance (${formatPKR(balance)})`);
      return;
    }
    setAddingPayment(true);
    try {
      await budgetApi.createVendorPayment(eventId, vendor.vendorId, {
        ...paymentForm,
        paidAt: new Date().toISOString(),
      });
      setPaymentForm({ amount: 0, type: 'deposit' });
      onUpdated();
      const data = await budgetApi.getVendorPayments(eventId, vendor.vendorId);
      setPayments(data ?? []);
    } catch (err: any) {
      setPaymentError(err.response?.data?.error || err.message || 'Failed to add payment');
    } finally {
      setAddingPayment(false);
    }
  };

  const handleMarkFullyPaid = async () => {
    if (!vendor || balance <= 0) return;
    setAddingPayment(true);
    try {
      await budgetApi.createVendorPayment(eventId, vendor.vendorId, {
        amount: balance,
        type: 'final',
        paidAt: new Date().toISOString(),
      });
      onUpdated();
      const data = await budgetApi.getVendorPayments(eventId, vendor.vendorId);
      setPayments(data ?? []);
    } finally {
      setAddingPayment(false);
    }
  };

  if (!vendor) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              {vendor.vendorName}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {vendor.company || vendor.category}
              {totalContract > 0 ? ` · Contract: ${formatPKR(totalContract)}` : ''}
            </p>
            {totalContract === 0 && (
              <p
                className="mt-1 px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--rose)',
                  color: '#8a2840',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                No contract amount set — click edit on the vendor card to add
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--surface2)]"
          >
            <X size={20} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Payment status */}
          <div className="flex justify-between items-center p-4 rounded-xl" style={{ background: 'var(--surface2)' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Paid</span>
            <span style={{ fontFamily: 'Playfair Display', fontWeight: 600 }}>
              {totalContract > 0
                ? `${formatPKR(totalPaid)} / ${formatPKR(totalContract)} (contract)`
                : formatPKR(totalPaid)}
            </span>
          </div>
          {balance > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {formatPKR(balance)} remaining
            </p>
          )}

          {/* Add payment form */}
          <form onSubmit={handleAddPayment} className="space-y-3">
            <label style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Add Payment {balance > 0 && `(max ${formatPKR(balance)})`}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max={balance > 0 ? balance : undefined}
                step="1"
                placeholder="Amount"
                value={paymentForm.amount || ''}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                className="flex-1 px-3 py-2 rounded-lg border"
                style={{
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface2)',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                }}
              />
              <select
                value={paymentForm.type}
                onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value as 'deposit' | 'final' })}
                className="px-3 py-2 rounded-lg"
                style={{
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface2)',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                }}
              >
                <option value="deposit">Deposit</option>
                <option value="final">Final</option>
              </select>
            </div>
            {paymentError && (
              <p className="text-sm" style={{ color: '#dc2626' }}>{paymentError}</p>
            )}
            <button
              type="submit"
              disabled={addingPayment || paymentForm.amount <= 0 || paymentForm.amount > balance}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full font-semibold text-sm"
              style={{
                background: 'var(--text)',
                color: 'var(--bg)',
              }}
            >
              <DollarSign size={16} />
              {addingPayment ? 'Adding...' : 'Add Payment'}
            </button>
          </form>

          {/* Mark as fully paid */}
          {balance > 0 && (
            <button
              onClick={handleMarkFullyPaid}
              disabled={addingPayment}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full font-semibold text-sm"
              style={{
                background: 'var(--mint)',
                color: '#1a5e44',
              }}
            >
              <CheckCircle2 size={16} />
              Mark as Fully Paid ({formatPKR(balance)})
            </button>
          )}

          {/* Payment history */}
          {loading ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading payments...</p>
          ) : payments.length > 0 ? (
            <div>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Payment History
              </p>
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between py-2 px-3 rounded-lg"
                    style={{ background: 'var(--surface2)' }}
                  >
                    <span className="capitalize" style={{ fontSize: '0.85rem' }}>{p.type}</span>
                    <span style={{ fontFamily: 'Playfair Display', fontWeight: 600 }}>
                      {formatPKR(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
