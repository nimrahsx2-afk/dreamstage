// Budget Module Types (Frontend)

export interface BudgetItem {
  id: string;
  eventId: string;
  assetId: string | null;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  unitPriceOverride: number | null;
  vendorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetItemInput {
  assetId?: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  unitPriceOverride?: number;
  vendorId?: string;
}

export interface Vendor {
  id: string;
  eventId: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  category: string;
  totalContractAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorInput {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  category: string;
  totalContractAmount: number;
  notes?: string;
}

export interface VendorPayment {
  id: string;
  vendorId: string;
  amount: number;
  type: 'deposit' | 'final';
  paidAt: string;
  notes: string | null;
  receiptUrl: string | null;
  createdAt: string;
}

export interface VendorPaymentInput {
  amount: number;
  type: 'deposit' | 'final';
  paidAt?: string;
  notes?: string;
}

export interface VendorQuote {
  id: string;
  vendorId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
}

export interface BudgetSummary {
  totalAssetCost: number;
  totalVendorCost: number;
  totalPaid: number;
  totalRemaining: number;
  grandTotal: number;
  budgetCeiling: number | null;
  isOverBudget: boolean;
  overBudgetAmount: number;
}

export interface CategoryBreakdown {
  category: string;
  itemCount: number;
  totalCost: number;
  percentage: number;
}

export interface VendorSummary {
  vendorId: string;
  vendorName: string;
  company: string | null;
  category: string;
  totalContractAmount: number;
  totalPaid: number;
  balance: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
}
