import { apiFetch } from '@/lib/api';

export type ExtractedLineItem = {
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
};

export type LineItemExtraction = {
  items: ExtractedLineItem[];
  supplier_name?: string | null;
  currency?: string | null;
  total_amount?: number | null;
  invoice_number?: string | null;
  document_date?: string | null;
  message?: string;
};

export async function extractDocumentLineItems(file: File, documentType: 'purchase_order' | 'expense') {
  const form = new FormData();
  form.append('file', file);
  return apiFetch<LineItemExtraction>(`/api/v1/procurement/extract-line-items?document_type=${documentType}`, {
    method: 'POST',
    body: form,
  });
}
