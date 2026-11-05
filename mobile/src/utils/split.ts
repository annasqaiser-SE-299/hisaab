import { toPaisa, toRupees } from './money';

export interface SplitPreviewItem {
  member_id: string;
  paisa: number;
  amount: number;
  hasExtraPaisa: boolean;
}

export function equalSplitPreview(
  totalRupees: number,
  memberIds: string[]
): { splits: SplitPreviewItem[]; remainderPaisa: number } {
  if (!memberIds.length || totalRupees <= 0) {
    return { splits: [], remainderPaisa: 0 };
  }

  const sortedIds = [...memberIds].sort();
  const totalPaisa = toPaisa(totalRupees);
  const n = sortedIds.length;
  const base = Math.floor(totalPaisa / n);
  const remainder = totalPaisa - base * n;

  const splits: SplitPreviewItem[] = sortedIds.map((id, index) => {
    const hasExtraPaisa = index < remainder;
    const sharePaisa = hasExtraPaisa ? base + 1 : base;
    return {
      member_id: id,
      paisa: sharePaisa,
      amount: toRupees(sharePaisa),
      hasExtraPaisa,
    };
  });

  return { splits, remainderPaisa: remainder };
}

