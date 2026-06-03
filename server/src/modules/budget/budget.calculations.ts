// Budget Calculations - Pure functions for budget computation
// All calculations happen in PKR (Pakistani Rupees)

import type {
  BudgetItem,
  BudgetSummary,
  CategoryBreakdown,
  VendorSummary,
  VendorPayment,
} from './budget.types';

// Calculate the effective price for a budget item (override or default)
export function getItemEffectivePrice(item: BudgetItem): number {
  return item.unitPriceOverride ?? item.unitPrice;
}

// Calculate total cost for a single budget item
export function calculateItemTotal(item: BudgetItem): number {
  return getItemEffectivePrice(item) * item.quantity;
}

// Calculate total cost for all budget items
export function calculateTotalAssetCost(items: BudgetItem[]): number {
  return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
}

// Calculate total payments made to all vendors
export function calculateTotalPaid(payments: VendorPayment[]): number {
  return payments.reduce((sum, payment) => sum + payment.amount, 0);
}

// Calculate total payments for a specific vendor
export function calculateVendorTotalPaid(
  vendorId: string,
  payments: VendorPayment[]
): number {
  return payments
    .filter((p) => p.vendorId === vendorId)
    .reduce((sum, p) => sum + p.amount, 0);
}

// Generate complete budget summary
// TOTAL SPENT = Asset costs + SUM of all vendor contract amounts
// PAID = SUM of actual payments made to vendors
// REMAINING = Budget Ceiling - Total Spent
// OVER BUDGET = Total Spent > Budget Ceiling
export function calculateBudgetSummary(
  items: BudgetItem[],
  payments: VendorPayment[],
  budgetCeiling: number | null,
  totalVendorContractAmount: number
): BudgetSummary {
  const totalAssetCost = calculateTotalAssetCost(items);
  const totalPaid = calculateTotalPaid(payments);

  const grandTotal = totalAssetCost + totalVendorContractAmount;
  const totalRemaining =
    budgetCeiling != null ? Math.max(0, budgetCeiling - grandTotal) : 0;
  const isOverBudget =
    budgetCeiling != null && grandTotal > budgetCeiling;
  const overBudgetAmount = isOverBudget ? grandTotal - budgetCeiling : 0;

  return {
    totalAssetCost,
    totalVendorCost: totalVendorContractAmount,
    totalPaid,
    totalRemaining,
    grandTotal,
    budgetCeiling,
    isOverBudget,
    overBudgetAmount,
  };
}

// Calculate breakdown by category
export function calculateCategoryBreakdown(
  items: BudgetItem[]
): CategoryBreakdown[] {
  const categoryMap = new Map<string, { count: number; total: number }>();

  items.forEach((item) => {
    const existing = categoryMap.get(item.category) || { count: 0, total: 0 };
    categoryMap.set(item.category, {
      count: existing.count + item.quantity,
      total: existing.total + calculateItemTotal(item),
    });
  });

  const grandTotal = calculateTotalAssetCost(items);

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      itemCount: data.count,
      totalCost: data.total,
      percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.totalCost - a.totalCost);
}

// Calculate vendor summaries with payment status
// totalContractAmount = agreed price; totalPaid = payments made; balance = remaining
export function calculateVendorSummaries(
  vendors: { id: string; name: string; company: string | null; category: string; totalContractAmount: number }[],
  payments: VendorPayment[]
): VendorSummary[] {
  return vendors.map((vendor) => {
    const totalContractAmount = vendor.totalContractAmount;
    const totalPaid = calculateVendorTotalPaid(vendor.id, payments);
    const balance = totalContractAmount - totalPaid;

    let paymentStatus: 'unpaid' | 'partial' | 'paid';
    if (totalPaid === 0) {
      paymentStatus = 'unpaid';
    } else if (totalPaid >= totalContractAmount) {
      paymentStatus = 'paid';
    } else {
      paymentStatus = 'partial';
    }

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      company: vendor.company,
      category: vendor.category,
      totalContractAmount,
      totalPaid,
      balance,
      paymentStatus,
    };
  });
}

// Check if adding an item would exceed budget ceiling
export function wouldExceedBudget(
  currentTotal: number,
  newItemCost: number,
  budgetCeiling: number | null
): boolean {
  if (budgetCeiling === null) return false;
  return currentTotal + newItemCost > budgetCeiling;
}

// Calculate budget utilization percentage
export function calculateBudgetUtilization(
  totalCost: number,
  budgetCeiling: number | null
): number {
  if (budgetCeiling === null || budgetCeiling === 0) return 0;
  return Math.min((totalCost / budgetCeiling) * 100, 100);
}

// Format PKR amount for display
export function formatPKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-PK')}`;
}
