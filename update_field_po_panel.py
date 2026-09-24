filepath = "src/components/FieldPurchaseOrdersPanel.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports at top
import_target = "import { apiFetch } from '@/lib/api';"
import_replacement = """import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import { Eye, Download, FileText, Paperclip, X, Plus, CheckCircle2, ShoppingCart } from 'lucide-react';"""

content = content.replace(import_target, import_replacement)

# 2. Add viewDetailPO state and attachment handlers inside component
state_target = "const [expensePO, setExpensePO] = useState<Row | null>(null);"
state_replacement = """const [expensePO, setExpensePO] = useState<Row | null>(null);
  const [viewDetailPO, setViewDetailPO] = useState<Row | null>(null);

  async function handleDownloadPOAttachment(poId: string, fileName?: string) {
    try {
      const blob = await apiFetchBlob(`/api/v1/procurement/purchase-orders/${poId}/attachment`);
      downloadBlob(blob, fileName || `PO_Attachment_${poId}.pdf`);
    } catch (err: any) {
      setMessage(`Could not download attachment: ${err?.message || 'Download error'}`);
    }
  }

  async function handleViewPOAttachment(poId: string) {
    try {
      const blob = await apiFetchBlob(`/api/v1/procurement/purchase-orders/${poId}/attachment`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err: any) {
      setMessage(`Could not view attachment: ${err?.message || 'View error'}`);
    }
  }"""

content = content.replace(state_target, state_replacement)

# 3. Update Table Render
table_target = """<div className="overflow-x-auto rounded-xl border bg-white dark:bg-slate-900"><table className="w-full text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500 dark:bg-slate-800"><tr><th className="p-3">PO number</th><th className="p-3">Supplier</th><th className="p-3">Items</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Quotation</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y">{orders.map((po) => <tr key={po.id}><td className="p-3 font-mono font-bold">{po.po_number}</td><td className="p-3">{po.supplier_name || ''}</td><td className="p-3">{(po.items || []).length}</td><td className="p-3">{po.currency} {Number(po.total_amount || 0).toLocaleString()}</td><td className="p-3">{String(po.status).replaceAll('_', ' ')}</td><td className="p-3">{po.attachment_file_name || ''}</td><td className="p-3"><div className="flex flex-wrap gap-2">{['DRAFT', 'WAITING_APPROVAL'].includes(po.status) && <button type="button" onClick={() => openEdit(po)} className="rounded border px-2.5 py-1.5 font-semibold hover:bg-orange-50">{po.status === 'DRAFT' ? 'Edit draft' : 'Edit / add quotation'}</button>}{po.status === 'APPROVED' && <button type="button" onClick={() => setExpensePO(po)} className="rounded bg-orange-600 px-2.5 py-1.5 font-bold text-white hover:bg-orange-700">Raise Expense</button>}</div></td></tr>)}{orders.length === 0 && <tr><td className="p-8 text-center text-slate-500" colSpan={7}>No purchase orders saved yet.</td></tr>}</tbody></table></div>"""

table_replacement = """<div className="overflow-x-auto rounded-xl border bg-white dark:bg-slate-900">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 uppercase text-slate-500 dark:bg-slate-800">
          <tr>
            <th className="p-3">PO number</th>
            <th className="p-3">Supplier</th>
            <th className="p-3">Items</th>
            <th className="p-3">Amount</th>
            <th className="p-3">Status</th>
            <th className="p-3">Quotation File</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y text-slate-700 dark:text-slate-200">
          {orders.map((po) => {
            const hasAttachment = Boolean(po.attachment_file_name || po.attachment_file_url || po.attachment);
            const fileName = po.attachment_file_name || 'Attached Quotation';
            return (
              <tr key={po.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{po.po_number}</td>
                <td className="p-3 font-semibold">{po.supplier_name || '-'}</td>
                <td className="p-3 font-medium">{(po.items || []).length} items</td>
                <td className="p-3 font-bold text-slate-900 dark:text-white">
                  {po.currency || 'USD'} {Number(po.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="p-3 font-semibold">
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${
                    po.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                    po.status === 'WAITING_APPROVAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                    po.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {String(po.status).replaceAll('_', ' ')}
                  </span>
                </td>
                <td className="p-3">
                  {hasAttachment ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 max-w-[120px] truncate" title={fileName}>
                        {fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleViewPOAttachment(po.id)}
                        className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-950 text-orange-700 dark:text-orange-300 transition"
                        title="View Quotation File in Browser"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDownloadPOAttachment(po.id, po.attachment_file_name)}
                        className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-950 text-orange-700 dark:text-orange-300 transition"
                        title="Download Quotation File"
                      >
                        <Download size={13} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">No file attached</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setViewDetailPO(po)}
                      className="flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      <Eye size={13} /> Details
                    </button>
                    {['DRAFT', 'WAITING_APPROVAL'].includes(po.status) && (
                      <button
                        type="button"
                        onClick={() => openEdit(po)}
                        className="rounded border border-orange-200 dark:border-orange-900/60 bg-orange-50/50 dark:bg-orange-950/40 px-2.5 py-1.5 text-xs font-semibold text-orange-800 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/60 transition"
                      >
                        {po.status === 'DRAFT' ? 'Edit Draft' : 'Edit / File'}
                      </button>
                    )}
                    {po.status === 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => setExpensePO(po)}
                        className="rounded bg-orange-600 hover:bg-orange-700 px-2.5 py-1.5 text-xs font-bold text-white transition shadow-xs"
                      >
                        Raise Expense
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {orders.length === 0 && (
            <tr>
              <td className="p-8 text-center text-slate-500" colSpan={7}>
                No purchase orders saved yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>"""

content = content.replace(table_target, table_replacement)

# 4. Add Details Modal at bottom before end of section
modal_target = "{expensePO && <OperationalExpenseSubmissionModal"
modal_replacement = """{/* VIEW PO DETAILS MODAL */}
      {viewDetailPO && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl border rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4 bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-600">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    Purchase Order #{viewDetailPO.po_number}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Created on {viewDetailPO.created_at ? new Date(viewDetailPO.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewDetailPO(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Supplier</span>
                  <p className="font-bold text-slate-900 dark:text-white truncate">{viewDetailPO.supplier_name || 'Unspecified'}</p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Project</span>
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {viewDetailPO.project_name || projectName || 'Assigned Site'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Amount</span>
                  <p className="font-black text-orange-600 text-sm">
                    {viewDetailPO.currency || 'USD'} {Number(viewDetailPO.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    viewDetailPO.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                    viewDetailPO.status === 'WAITING_APPROVAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                    'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                  }`}>
                    {String(viewDetailPO.status).replaceAll('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-orange-50/50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-900/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Paperclip className="text-orange-600 shrink-0" size={18} />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">Quotation / Supporting Document</h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {viewDetailPO.attachment_file_name || 'No quotation or docket file attached to this purchase order.'}
                    </p>
                  </div>
                </div>

                {viewDetailPO.attachment_file_name && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleViewPOAttachment(viewDetailPO.id)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border rounded-lg font-bold text-xs transition flex items-center gap-1.5"
                    >
                      <Eye size={13} /> View File
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDownloadPOAttachment(viewDetailPO.id, viewDetailPO.attachment_file_name)}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Download size={13} /> Download File
                    </button>
                  </div>
                )}
              </div>

              {viewDetailPO.notes && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes &amp; Specifications</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{viewDetailPO.notes}</p>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Purchase Order Line Items</h4>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase">
                      <tr>
                        <th className="p-3">Item / Service</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">Quantity</th>
                        <th className="p-3">Unit Price</th>
                        <th className="p-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                      {(viewDetailPO.items || []).map((item: any, idx: number) => {
                        const qty = Number(item.quantity_ordered || item.quantity || 1);
                        const price = Number(item.unit_price || item.price || 0);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-3 font-semibold text-slate-900 dark:text-white">{item.item_name || 'Standard Item'}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{item.description || '-'}</td>
                            <td className="p-3 font-mono">{qty}</td>
                            <td className="p-3 font-mono">{viewDetailPO.currency || 'USD'} {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="p-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                              {viewDetailPO.currency || 'USD'} {(qty * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                      {(viewDetailPO.items || []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-500">No line items listed.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t px-6 py-3 bg-slate-50 dark:bg-slate-800/40 shrink-0">
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                Total Amount: {viewDetailPO.currency || 'USD'} {Number(viewDetailPO.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewDetailPO(null)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border font-bold rounded-xl text-xs transition"
                >
                  Close
                </button>
                {viewDetailPO.status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => {
                      const poToExpense = viewDetailPO;
                      setViewDetailPO(null);
                      setExpensePO(poToExpense);
                    }}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition shadow-xs"
                  >
                    Raise Expense
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {expensePO && <OperationalExpenseSubmissionModal"""

content = content.replace(modal_target, modal_replacement)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Successfully updated FieldPurchaseOrdersPanel!")
