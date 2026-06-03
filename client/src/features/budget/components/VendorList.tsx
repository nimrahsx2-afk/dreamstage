/**
 * Vendor List - Display vendors with Edit, Delete, payment modal
 */

import { useState } from 'react';
import {
  Plus,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { VendorSummary, VendorInput } from '../budget.types';
import { formatPKR } from '@/utils/currency';
import { VendorDetailModal } from './VendorDetailModal';

interface VendorListProps {
  vendors: VendorSummary[];
  onAddVendor: (input: VendorInput) => Promise<void>;
  onUpdateVendor: (vendorId: string, input: Partial<VendorInput>) => Promise<void>;
  onDeleteVendor: (vendorId: string) => Promise<void>;
  onRefetch: () => Promise<void>;
  eventId: string;
}

export function VendorList({
  vendors,
  onAddVendor,
  onUpdateVendor,
  onDeleteVendor,
  onRefetch,
  eventId,
}: VendorListProps) {
  const toNumber = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : 0;

  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorSummary | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<VendorInput> | null>(null);

  const [formData, setFormData] = useState<VendorInput>({
    name: '',
    company: '',
    email: '',
    phone: '',
    category: 'catering',
    totalContractAmount: 0,
    notes: '',
  });

  const getStatusIcon = (status: VendorSummary['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />;
      case 'partial':
        return <Clock className="w-4 h-4" style={{ color: '#f59e0b' }} />;
      default:
        return <AlertCircle className="w-4 h-4" style={{ color: '#ef4444' }} />;
    }
  };

  const getStatusStyle = (status: VendorSummary['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return { bg: 'var(--mint)', text: '#065f46' };
      case 'partial':
        return { bg: 'var(--lemon)', text: '#92400e' };
      default:
        return { bg: 'var(--rose)', text: '#8a2840' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.totalContractAmount || formData.totalContractAmount <= 0) return;
    setIsAdding(true);
    try {
      await onAddVendor(formData);
      setFormData({ name: '', company: '', email: '', phone: '', category: 'catering', totalContractAmount: 0, notes: '' });
      setShowAddForm(false);
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (v: VendorSummary) => {
    setEditingId(v.vendorId);
    setEditForm({
      name: v.vendorName,
      company: v.company ?? '',
      phone: '',
      category: v.category,
      totalContractAmount: v.totalContractAmount,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editForm) return;
    try {
      await onUpdateVendor(editingId, editForm);
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (vendorId: string, vendorName: string) => {
    if (!window.confirm(`Delete vendor "${vendorName}"? This cannot be undone.`)) return;
    try {
      await onDeleteVendor(vendorId);
      if (selectedVendor?.vendorId === vendorId) setSelectedVendor(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="budget-section-card">
      <div className="budget-card-header">
        <div>
          <div className="budget-card-title">Vendors</div>
          <div className="budget-card-subtitle">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="budget-btn-primary"
        >
          <Plus className="inline w-4 h-4 mr-1" />
          Add Vendor
        </button>
      </div>

      <div className="p-5 space-y-3">
        {showAddForm && (
          <form onSubmit={handleSubmit} className="p-4 rounded-xl mb-4" style={{ background: 'var(--surface2)' }}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                required
                placeholder="Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              />
              <input
                required
                type="number"
                min="1"
                step="1"
                placeholder="Total Contract Amount (Rs.) *"
                value={formData.totalContractAmount || ''}
                onChange={(e) => setFormData({ ...formData, totalContractAmount: parseFloat(e.target.value) || 0 })}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              />
              <input
                placeholder="Company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              />
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value="catering">Catering</option>
                <option value="photography">Photography</option>
                <option value="decoration">Decoration</option>
                <option value="entertainment">Entertainment</option>
                <option value="rentals">Rentals</option>
                <option value="florist">Florist</option>
                <option value="other">Other</option>
              </select>
              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAddForm(false)} className="budget-btn-secondary flex-1">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAdding || !formData.totalContractAmount || formData.totalContractAmount <= 0}
                className="budget-btn-primary flex-1"
              >
                {isAdding ? 'Adding...' : 'Add Vendor'}
              </button>
            </div>
          </form>
        )}

        {vendors.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No vendors added yet
          </p>
        ) : (
          vendors.map((vendor) => {
            const statusStyle = getStatusStyle(vendor.paymentStatus);
            const totalContract = toNumber(vendor.totalContractAmount);
            const totalPaid = toNumber(vendor.totalPaid);
            const balance = toNumber(vendor.balance);
            const isEditing = editingId === vendor.vendorId;

            return (
              <div
                key={vendor.vendorId}
                className="rounded-xl overflow-hidden"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
              >
                {isEditing && editForm ? (
                  <form onSubmit={handleUpdate} className="p-4">
                    <div className="space-y-3 mb-4">
                      <input
                        required
                        placeholder="Name"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
                      />
                      <input
                        placeholder="Company"
                        value={editForm.company}
                        onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
                      />
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
                      >
                        <option value="catering">Catering</option>
                        <option value="photography">Photography</option>
                        <option value="decoration">Decoration</option>
                        <option value="entertainment">Entertainment</option>
                        <option value="rentals">Rentals</option>
                        <option value="florist">Florist</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
                      />
                      <input
                        required
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Total Contract Amount (Rs.)"
                        value={editForm.totalContractAmount ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, totalContractAmount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setEditingId(null); setEditForm(null); }} className="budget-btn-secondary flex-1">
                        Cancel
                      </button>
                      <button type="submit" className="budget-btn-primary flex-1">Save</button>
                    </div>
                  </form>
                ) : (
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => setSelectedVendor(vendor)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text)' }}>
                            {vendor.vendorName}
                          </span>
                          {vendor.company && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                              <Building2 className="w-3 h-3" />
                              {vendor.company}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="capitalize px-2 py-0.5 rounded-full text-xs" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                            {vendor.category}
                          </span>
                          <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: statusStyle.bg, color: statusStyle.text }}
                          >
                            {getStatusIcon(vendor.paymentStatus)}
                            {vendor.paymentStatus === 'unpaid' ? 'Unpaid' : vendor.paymentStatus === 'partial' ? 'Partial' : 'Paid'}
                          </span>
                        </div>
                        <div className="mt-2">
                          {totalContract > 0 ? (
                            <>
                              <p style={{ fontFamily: 'Playfair Display', fontWeight: 600 }}>
                                Contract: {formatPKR(totalContract)}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                Paid: {formatPKR(totalPaid)}
                                {balance > 0 ? ` · ${formatPKR(balance)} remaining` : ' · Fully paid'}
                              </p>
                            </>
                          ) : (
                            <p
                              className="text-xs px-2 py-1 rounded"
                              style={{
                                background: 'var(--rose)',
                                color: '#8a2840',
                                fontFamily: 'DM Sans, sans-serif',
                              }}
                            >
                              No contract amount set — click edit to add
                            </p>
                          )}
                        </div>
                      </button>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEdit(vendor)}
                          className="p-2 rounded-lg hover:bg-[var(--surface)]"
                          title="Edit"
                        >
                          <Pencil size={16} style={{ color: 'var(--text-muted)' }} />
                        </button>
                        <button
                          onClick={() => handleDelete(vendor.vendorId, vendor.vendorName)}
                          className="p-2 rounded-lg hover:bg-[var(--rose)]"
                          title="Delete"
                        >
                          <Trash2 size={16} style={{ color: '#8a2840' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedVendor && (
        <VendorDetailModal
          eventId={eventId}
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onUpdated={async () => {
            setSelectedVendor(null);
            await onRefetch();
          }}
        />
      )}
    </div>
  );
}
