'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Send, LoaderCircle, FileText, Table2, Network, RotateCcw, ChevronDown } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { openUniversalFileViewer } from '@/lib/fileViewer';
import type { FieldWorkbook } from '@/lib/fieldWorkbook';
import { quickAnswerContext } from '@/lib/workbookQuickAnswers';
import {useAuth} from './AuthProvider';
import WorkbookPageHeader from './WorkbookPageHeader';
import SearchableSelect from './SearchableSelect';

type Citation = { id: string; title: string; kind: string; incomplete: boolean; sheet_id?: string; document_id?: string };
type Answer = { reply: string; citations: Citation[]; warnings: string[]; tools_used: string[] };
type Message = { role: 'user' | 'assistant'; content: string; answer?: Answer };

// Rounded focus rings (box-shadow follows the corner radius) replace the square global outline.
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900';
// Compact header size and emerald focus for the shared custom dropdown.
const compactSelect = '[&_button[aria-haspopup=listbox]]:!min-h-[34px] [&_button[aria-haspopup=listbox]]:!rounded-lg [&_button[aria-haspopup=listbox]]:!py-1.5 [&_button[aria-haspopup=listbox]]:!text-xs [&_button[aria-haspopup=listbox]:focus-visible]:!ring-emerald-600/40 [&_button[aria-expanded=true]]:!border-emerald-600 [&_button[aria-expanded=true]]:!ring-emerald-600/20';

export default function WorkbookQuickAnswers({ book, activeSheetId, onLocate, backLabel, onBack }: { book?: FieldWorkbook; activeSheetId?: string; onLocate?: (id: string) => void; backLabel: string; onBack: () => void }) {
  const {user}=useAuth();
  const historyKey=JSON.stringify(['cestos-quick-answers',user?.id,book?.id||'platform']);
  const [loadedKey,setLoadedKey]=useState('');
  const [question, setQuestion] = useState(''), [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [scope, setScope] = useState<'sheet' | 'workbook' | 'platform'>(book ? 'workbook' : 'platform');
  const request = useRef<AbortController | null>(null), end = useRef<HTMLDivElement>(null), composer = useRef<HTMLTextAreaElement>(null);
  const context = useMemo(() => quickAnswerContext(book, activeSheetId, scope), [book, activeSheetId, scope]);
  function reset() { request.current?.abort(); request.current = null; setBusy(false); setError(''); setMessages([]); composer.current?.focus(); }
  function back() { request.current?.abort(); request.current = null; onBack(); }
  useEffect(()=>{request.current?.abort();setBusy(false);setError('');try{const stored=JSON.parse(localStorage.getItem(historyKey)||'[]');setMessages(Array.isArray(stored)?stored:[]);}catch{setMessages([]);}setLoadedKey(historyKey);},[historyKey]);
  useEffect(()=>{if(!user||loadedKey!==historyKey)return;try{localStorage.setItem(historyKey,JSON.stringify(messages));}catch{setError('Chat history could not be saved on this device. Keep this panel open.');}},[messages,historyKey,loadedKey,user]);
  useEffect(() => { composer.current?.focus(); return () => request.current?.abort(); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages, busy]);

  async function ask(text = question) {
    if (!text.trim() || busy || !context) return;
    if (!navigator.onLine) { setError('Quick answers needs an internet connection. Your workbook remains available offline.'); return; }
    const controller = new AbortController(); request.current = controller;
    setError(''); setBusy(true); setQuestion('');
    const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content.slice(0, 6000) }));
    setMessages(previous => [...previous, { role: 'user', content: text.trim() }]);
    try {
      const result = await apiFetch<Answer>('/api/v1/workbook-quick-answers', {
        method: 'POST', signal: controller.signal, body: JSON.stringify({ question: text.trim(), history, ...context }),
      }, true, { queueWhenOffline: false, cacheResponse: false, memoryCache: false });
      if (controller.signal.aborted) return;
      setMessages(previous => [...previous, { role: 'assistant', content: result.reply, answer: result }]);
    } catch (e) {
      if (!controller.signal.aborted) { setError(e instanceof ApiError && e.status === 404 ? 'Quick answers is not available on this server yet. The workbook Quick answers backend needs to be deployed. Your workbook has not changed.' : e instanceof Error ? e.message : 'Could not load an answer. Please retry.'); setQuestion(text); }
    } finally { if (request.current === controller) { setBusy(false); request.current = null; } }
  }
  const examples = book ? ['How are the records across these worksheets related?', 'Compare this workbook with live project and equipment records. What needs attention?', 'Find documents that explain the issues recorded here.', 'Summarise the totals in this workbook by project.'] : ['Which projects have outstanding expenses and related purchase orders?', 'Connect equipment maintenance issues with project assignments and supporting documents.', 'Find employees with experience relevant to our current project work.', 'Which sites have the most open actions this month?'];
  const coverage = context?.sheets.length ? `${context.sheets.length} worksheet${context.sheets.length === 1 ? '' : 's'} Â· ${context.sheets.reduce((n, s) => n + s.cells.length, 0).toLocaleString()} cells shared` : 'Live records and document search';
  const partial = !!(context?.omitted_sheets || context?.sheets.some(s => s.incomplete));

  return <div className="flex h-full min-h-0 flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <WorkbookPageHeader backLabel={backLabel} onBack={back} icon={<Sparkles size={18} />} title="Quick answers" subtitle="Ask questions that connect workbook data, live records and supporting documents. Read-only."
      actions={<>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"><span aria-hidden="true">Context</span>
          {/* A context is always required, so the dropdown's clear button is hidden and empty values ignored. */}
          <div className={`w-52 ${compactSelect} [&_[title="Clear_selection"]]:!hidden`}><SearchableSelect ariaLabel="Quick answers context" searchable={false} disabled={busy} value={scope} onChange={value => { if (value) setScope(value as typeof scope); }}
            options={[...(book ? [{ value: 'workbook', label: 'Whole workbook' }, { value: 'sheet', label: 'Current worksheet' }] : []), { value: 'platform', label: 'Platform records only' }]} /></div>
        </div>
        <button type="button" disabled={!messages.length && !error} onClick={reset} className={`inline-flex h-[34px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ${focusRing}`}><RotateCcw size={14} />New conversation</button>
      </>} />

    <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        {!messages.length && <div className="py-6">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Network size={24} /></span>
          <h3 className="text-xl font-semibold">Ask a question that connects the dots</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Quick answers follows relationships across projects, people, equipment and costs, then searches supporting documents. It uses your accountâ€™s existing access and never changes records or cells.</p>
          <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-slate-500">Try asking</p>
          <div className="grid gap-2 sm:grid-cols-2">{examples.map(text => <button type="button" key={text} onClick={() => void ask(text)} className={`rounded-lg border border-slate-200 bg-white p-3 text-left text-sm text-slate-700 ${focusRing} hover:border-emerald-400 hover:bg-emerald-50/60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-emerald-950/40`}>{text}</button>)}</div>
        </div>}

        <div className="space-y-5">{messages.map((message, i) => message.role === 'user'
          ? <div key={i} className="flex justify-end"><p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-emerald-700 px-4 py-2.5 text-sm leading-6 text-white">{message.content}</p></div>
          : <article key={i} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><Sparkles size={13} />Quick answers</p>
            <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800 dark:text-slate-100">{message.content}</div>
            {message.answer?.warnings.map(w => <p key={w} className="mt-3 rounded-md border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">{w}</p>)}
            {!!message.answer?.citations.length && <details className="group mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
              <summary className={`flex w-fit cursor-pointer list-none items-center gap-1 rounded-md px-1 py-0.5 text-xs font-semibold ${focusRing} text-slate-600 hover:text-emerald-700 dark:text-slate-300`}><ChevronDown size={14} className="transition-transform group-open:rotate-180" />Sources and evidence ({message.answer.citations.length})</summary>
              <ul className="mt-2 space-y-1.5">{message.answer.citations.map(source => <li key={source.id} className="flex items-start gap-2 rounded-md bg-slate-50 p-2 text-xs dark:bg-slate-950">
                <span className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">{source.id}</span>
                <div className="min-w-0 flex-1"><p className="break-words font-medium text-slate-800 dark:text-slate-100">{source.title}</p><p className="text-slate-500">{source.kind}{source.incomplete ? ' Â· Partial coverage' : ''}</p></div>
                {source.document_id && <button type="button" className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950" onClick={() => openUniversalFileViewer({ fileUrl: `/api/v1/documents/${encodeURIComponent(source.document_id!)}/download`, title: source.title, fileName: source.title })}><FileText size={13} />View</button>}
                {source.sheet_id && onLocate && <button type="button" className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950" onClick={() => onLocate(source.sheet_id!)}><Table2 size={13} />Open worksheet</button>}
              </li>)}</ul>
            </details>}
          </article>)}</div>
        {busy && <div role="status" className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><LoaderCircle size={16} className="animate-spin text-emerald-600" />Checking relationships and gathering evidenceâ€¦<button type="button" className="ml-auto rounded px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { request.current?.abort(); request.current = null; setBusy(false); }}>Stop</button></div>}
        <div ref={end} />
      </div>
    </div>

    <form onSubmit={e => { e.preventDefault(); void ask(); }} className="shrink-0 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
        {error && <p role="alert" className="mb-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
        <div className="flex items-end gap-2 rounded-xl border border-slate-300 bg-white p-2 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 dark:border-slate-600 dark:bg-slate-950">
          <label className="flex-1"><span className="sr-only">Ask quick answers</span><textarea ref={composer} maxLength={6000} rows={2} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask about records, relationships or supporting documentsâ€¦" className="block w-full resize-none border-0 bg-transparent px-2 py-1 text-sm text-slate-900 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none dark:text-white" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask(); } }} /></label>
          <button type="submit" disabled={busy || !question.trim()} className={`flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 ${focusRing}`}><Send size={15} />Ask</button>
        </div>
        <p className="mt-2 flex flex-wrap gap-x-2 text-[11px] text-slate-500"><span>{coverage}</span>{partial && <span className="font-medium text-amber-700 dark:text-amber-300">Â· Some source content is missing or exceeds the sharing limit. Answers will identify coverage gaps.</span>}<span>Â· AI can make mistakes. Check sources before acting. Enter to send, Shift+Enter for a new line.</span></p>
      </div>
    </form>
  </div>;
}
