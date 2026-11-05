export function toPaisa(rupees: number): number {
  if (typeof rupees !== 'number' || !Number.isFinite(rupees)) {
    return 0;
  }
  return Math.round(rupees * 100);
}

export function toRupees(paisa: number): number {
  return paisa / 100;
}

export function formatPKR(rupees: number | null | undefined, showSign = false): string {
  if (rupees === null || rupees === undefined || isNaN(rupees)) {
    return 'PKR 0.00';
  }

  const isNegative = rupees < 0;
  const absVal = Math.abs(rupees);
  const formatted = absVal.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (showSign) {
    if (rupees > 0) return `+PKR ${formatted}`;
    if (rupees < 0) return `-PKR ${formatted}`;
  }

  return `PKR ${formatted}`;
}

export function parseAmount(text: string): number {
  const clean = text.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}
