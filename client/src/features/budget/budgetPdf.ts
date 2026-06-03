/**
 * Budget PDF export - generates PDF and supports print
 */

import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { BudgetSummary, CategoryBreakdown, VendorSummary } from './budget.types';
import { formatPKR } from '@/utils/currency';

export interface BudgetPrintData {
  eventName: string;
  eventDate: string;
  summary: BudgetSummary | null;
  breakdown: CategoryBreakdown[];
  vendors: VendorSummary[];
}

export function downloadBudgetPdf(data: BudgetPrintData): void {
  const doc = new jsPDF();

  let y = 20;

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Budget Report', 20, y);
  y += 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Event: ${data.eventName}`, 20, y);
  y += 6;
  doc.text(`Date: ${data.eventDate}`, 20, y);
  y += 12;

  // Budget summary
  if (data.summary) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Budget Summary', 20, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Spent: ${formatPKR(data.summary.grandTotal)}`, 20, y);
    y += 6;
    doc.text(`Budget Ceiling: ${formatPKR(data.summary.budgetCeiling ?? 0)}`, 20, y);
    y += 6;
    doc.text(`Paid to Vendors: ${formatPKR(data.summary.totalPaid)}`, 20, y);
    y += 6;
    doc.text(`Remaining: ${formatPKR(data.summary.totalRemaining)}`, 20, y);
    y += 6;
    if (data.summary.isOverBudget) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text(`Over Budget by: ${formatPKR(data.summary.overBudgetAmount)}`, 20, y);
      doc.setTextColor(0, 0, 0);
      y += 6;
    }
    y += 6;
  }

  // Category breakdown
  if (data.breakdown && data.breakdown.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Category Breakdown', 20, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Category', 'Items', 'Total Cost', 'Percentage']],
      body: data.breakdown.map((b) => [
        b.category,
        String(b.itemCount),
        formatPKR(b.totalCost),
        `${b.percentage.toFixed(1)}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [100, 80, 120] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Vendor list
  if (data.vendors && data.vendors.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Vendors', 20, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Vendor', 'Company', 'Category', 'Contract Amount', 'Paid', 'Status']],
      body: data.vendors.map((v) => [
        v.vendorName,
        v.company ?? '—',
        v.category,
        formatPKR(v.totalContractAmount),
        formatPKR(v.totalPaid),
        v.paymentStatus === 'unpaid' ? 'Unpaid' : v.paymentStatus === 'partial' ? 'Partial' : 'Paid',
      ]),
      theme: 'striped',
      headStyles: { fillColor: [100, 80, 120] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Total Spent at bottom
  if (data.summary) {
    y = Math.max(y, doc.internal.pageSize.height - 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Total Spent: ${formatPKR(data.summary.grandTotal)}`, 20, y);
  }

  doc.save(`budget-${data.eventName.replace(/\s+/g, '-')}.pdf`);
}
