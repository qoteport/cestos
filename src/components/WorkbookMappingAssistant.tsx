'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import type { FieldSheet } from '@/lib/fieldWorkbook';
import {
  cellAddress,
  extractMapping,
  type MappingLayout,
  type MappingTable,
} from '@/lib/workbookMapping';
import {
  mappingSample,
  proposalLayout,
  compatibleLayout,
  type MappingProposal,
} from '@/lib/workbookMappingAssistant';
export default function WorkbookMappingAssistant({
  sheet,
  table,
  layout,
  online,
  onApply,
}: {
  sheet: FieldSheet;
  table: MappingTable;
  layout: MappingLayout;
  online: boolean;
  onApply: (layout: MappingLayout) => void;
}) {
  const [guidance, setGuidance] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [proposal, setProposal] = useState<MappingProposal | null>(null),
    [included, setIncluded] = useState<string[]>([]);
  const sequence = useRef(0);
  useEffect(() => {
    sequence.current++;
    setProposal(null);
    setBusy(false);
    setError('');
    return () => {
      sequence.current++;
    };
  }, [sheet, table, layout]);
  const sample = useMemo(() => {
    try {
      return { value: mappingSample(sheet), error: '' };
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : 'Cannot analyse this sheet.' };
    }
  }, [sheet]);
  const preview = useMemo(() => {
    if (!proposal) return null;
    try {
      const next = proposalLayout(sheet, table, proposal, included);
      return { layout: next, data: extractMapping(sheet, next), error: '' };
    } catch (e) {
      return {
        layout: null,
        data: null,
        error: e instanceof Error ? e.message : 'Review the proposed layout.',
      };
    }
  }, [sheet, table, proposal, included]);
  async function ask() {
    if (!online || !sample.value) return;
    const request = ++sequence.current;
    setBusy(true);
    setError('');
    setProposal(null);
    try {
      const answer = await apiFetch<MappingProposal>(
        '/api/v1/workbook-connections/assist',
        {
          method: 'POST',
          body: JSON.stringify({ table: table.id, sheet: sample.value, guidance }),
        },
        true,
        { queueWhenOffline: false }
      );
      if (sequence.current !== request) return;
      proposalLayout(
        sheet,
        table,
        answer,
        answer.fields.map((f) => f.field)
      );
      setProposal(answer);
      setIncluded(answer.fields.filter((f) => f.confidence !== 'low').map((f) => f.field));
    } catch (e) {
      if (sequence.current === request)
        setError(
          e instanceof ApiError && e.status === 404
            ? 'Update the backend to enable the mapping assistant. Manual mapping is still available.'
            : e instanceof Error
              ? e.message
              : 'The assistant is unavailable. Try again or continue manually.'
        );
    } finally {
      if (sequence.current === request) setBusy(false);
    }
  }
  const canApply = !!preview?.layout && !!preview.data?.rows.length && !preview.data.issues.length;
  return (
    <details className="my-4 rounded-lg border border-blue-200 bg-blue-50/40 p-3 dark:bg-slate-800">
      <summary className="cursor-pointer font-semibold">Mapping assistant · optional</summary>
      <p className="my-2 text-sm">
        Ask for layout and field suggestions using {table.name}. You review each match before
        applying it; manual controls remain available.
      </p>
      <label className="block text-sm">
        What should one record represent? (optional)
        <textarea
          className="my-1 block w-full rounded border bg-transparent p-2"
          maxLength={1000}
          rows={2}
          value={guidance}
          disabled={busy}
          onChange={(e) => setGuidance(e.target.value)}
          placeholder="For example: one record per equipment row. Project and date are above the table; ignore totals."
        />
      </label>
      <p className="my-2 text-xs">
        When you click Ask, up to {sample.value?.cells.length || 0} cell samples (160 characters
        each), merged-cell layout, your guidance and the selected table schema are sent to OpenAI.
        The original Excel file is not sent.
        {sample.value?.sampled ? ' This sheet is sampled; review record boundaries carefully.' : ''}
      </p>
      <button
        type="button"
        className="rounded border px-3 py-2 text-sm font-medium"
        disabled={busy || !online || !sample.value?.cells.length}
        onClick={() => void ask()}
      >
        {busy ? 'Analysing sheet…' : 'Ask mapping assistant'}
      </button>
      {!online && (
        <p className="my-2 text-sm">
          AI suggestions require a connection and current table definitions. Suggest from labels and
          manual mapping work offline.
        </p>
      )}
      {(error || sample.error) && (
        <p role="alert" className="my-2 text-sm text-red-600">
          {error || sample.error}
        </p>
      )}
      {proposal && (
        <div className="mt-3 space-y-2">
          <h4 className="font-semibold">Review proposal</h4>
          <p className="text-sm">{proposal.summary}</p>
          <p className="text-xs">
            Suggested layout: {proposal.mode} · {proposal.mode === 'columns' ? 'columns' : 'rows'}{' '}
            {proposal.start + 1}–{proposal.end + 1}
            {proposal.mode === 'blocks' ? ` · ${proposal.blockSize} rows per block` : ''}.
            Confidence labels are review hints, not measured accuracy.
          </p>
          <ul className="list-disc pl-5 text-sm text-amber-800 dark:text-amber-200">
            {proposal.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left">Use</th>
                  <th className="p-2 text-left">Database field / source</th>
                  <th className="p-2 text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {proposal.fields.map((f) => (
                  <tr key={f.field} className="border-t">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        aria-label={`Use suggestion for ${f.field}`}
                        checked={included.includes(f.field)}
                        onChange={(e) =>
                          setIncluded((old) =>
                            e.target.checked
                              ? [...old, f.field]
                              : old.filter((name) => name !== f.field)
                          )
                        }
                      />
                    </td>
                    <td className="p-2">
                      {f.field}
                      <span className="block text-xs">
                        {f.kind === 'column'
                          ? `Column ${cellAddress(0, f.c).replace(/1$/, '')}`
                          : f.kind === 'row'
                            ? `Row ${f.r + 1}`
                            : `${f.kind === 'block' ? 'Each block' : 'Fixed cell'} ${cellAddress(f.r, f.c)}`}{' '}
                        · {f.confidence}
                      </span>
                    </td>
                    <td className="p-2">{f.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview?.error && (
            <p className="text-sm text-amber-700">
              {preview.error} Select suitable suggestions or adjust the mapping manually.
            </p>
          )}
          {preview?.data && (
            <>
              <p className="text-sm">
                {preview.data.rows.length} records would be extracted. Preview of the first 5:
              </p>
              <div className="max-h-48 overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {Object.keys(preview.data.mapping).map((name) => (
                        <th key={name} className="border p-2 text-left">
                          {name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.data.rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {row.map((value, j) => (
                          <td key={j} className="border p-2">
                            {value || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.data.issues.map((issue, i) => (
                <p key={i} className="text-sm text-red-600">
                  Record {issue.row}: {issue.message}
                </p>
              ))}
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm font-medium"
              disabled={!canApply}
              onClick={() => {
                if (preview?.layout) onApply(preview.layout);
              }}
            >
              Use proposed layout & selected mappings
            </button>
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm"
              disabled={!canApply || !preview?.layout || !compatibleLayout(layout, preview.layout)}
              onClick={() => {
                if (preview?.layout)
                  onApply({ ...layout, fields: { ...preview.layout.fields, ...layout.fields } });
              }}
            >
              Fill unmapped fields only
            </button>
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm"
              onClick={() => setProposal(null)}
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs">
            Applying updates the editor only and clears previous validation. Review and validate
            before saving the mapping.
          </p>
        </div>
      )}
    </details>
  );
}
