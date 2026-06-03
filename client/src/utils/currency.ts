// Currency formatting utilities for Pakistani Rupees (PKR)

export function formatPKR(amount: number | null | undefined): string {
  const safeAmount = Number.isFinite(amount) ? Number(amount) : 0;
  return `Rs. ${safeAmount.toLocaleString('en-PK')}`;
}

export function parsePKR(value: string): number {
  const cleaned = value.replace(/[Rs.\s,]/g, '');
  return parseFloat(cleaned) || 0;
}
