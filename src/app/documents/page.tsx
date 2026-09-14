'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  FileText,
  Search,
  Upload,
  FolderOpen,
  Sparkles,
  LockKeyhole,
  Globe2,
  ShieldCheck,
  ArrowDownToLine,
  SlidersHorizontal,
  X,
  Grid2X2,
  List,
  RefreshCw,
  Tag,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileImage,
  File,
  Check,
  Loader2,
  Eye,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Modal } from '@/components/DataUI';
import { apiFetch, apiFetchBlob, downloadBlob, getAccessToken } from '@/lib/api';
import Icon from '@/components/ui/AppIcon';


interface DocumentRow {
  id: string;
  title: string;
  category: string;
  tags: string[];
  file_name: string;
  mime_type: string;
  size_bytes: number;
  visibility: 'PRIVATE' | 'PUBLIC' | 'SUPER_PRIVATE';
  index_status: string;
  index_message: string | null;
  created_at: string;
  source_type: string;
  owner_name?: string;
  can_manage: boolean;
  match?: { text: string; location: string };
}
interface Library {
  items: DocumentRow[];
  total: number;
  categories: { name: string; count: number }[];
  tags: string[];
  is_admin: boolean;
  search_warning: string | null;
}
const privacy = {
  PRIVATE: { label: 'Private', icon: LockKeyhole },
  PUBLIC: { label: 'Public', icon: Globe2 },
  SUPER_PRIVATE: { label: 'Super Private', icon: ShieldCheck },
};
const states: Record<string, string> = {
  PENDING: 'Indexing queued',
  READY: 'Search ready',
  FAILED: 'Indexing needs attention',
  UNSUPPORTED: 'Stored · text unavailable',
};
const size = (bytes: number) =>
  bytes >= 1048576
    ? (bytes / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(bytes / 1024)) +' KB';
function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase();
  const Icon = ['xlsx', 'xls', 'csv'].includes(ext || '')
    ? FileSpreadsheet
    : ['png', 'jpg', 'jpeg', 'tiff'].includes(ext || '')
      ? FileImage
      : ['pdf', 'docx', 'txt', 'doc', 'rtf'].includes(ext || '')
        ? FileText
        : File;
  return (
    <div className="w-12 h-14 bg-secondary border border-border text-primary flex items-center justify-center shrink-0">
      <Icon size={25} />
    </div>
  );
}

export default function DocumentsPage() {
  const [view, setView] = useState('for-you');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [data, setData] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<DocumentRow | null>(null);
  const [reading, setReading] = useState<DocumentRow | null>(null);
  const [text, setText] = useState<{ text: string; location: string }[]>([]);
  const [textPage, setTextPage] = useState(1);
  const [textTotal, setTextTotal] = useState(0);
  const [textLoading, setTextLoading] = useState(false);
  const refresh = () => setVersion((v) => v + 1);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlQ = urlParams.get('q') || urlParams.get('search');
      if (urlQ) {
        setQuery(urlQ);
        setSearch(urlQ);
      }
      const docId = urlParams.get('doc_id') || urlParams.get('id');
      if (docId) {
        apiFetch<DocumentRow>(`/api/v1/documents/${docId}`)
          .then((doc) => setReading(doc))
          .catch(() => {});
      }
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ view, category, tag, q: search, page: String(page) });
    apiFetch<Library>('/api/v1/documents?' + params)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => {
        if (active) {
          setData(null);
          setError(e.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [view, category, tag, search, page, version]);
  useEffect(() => {
    if (!data?.items.some((d) => d.index_status === 'PENDING')) return;
    const timer = setTimeout(refresh, 10000);
    return () => clearTimeout(timer);
  }, [data]);
  useEffect(() => {
    if (!reading) return;
    let active = true;
    setTextLoading(true);
    setText([]);
    apiFetch<{ chunks: { text: string; location: string }[]; total: number }>(
      `/api/v1/documents/${reading.id}/text?page=${textPage}`
    )
      .then((r) => {
        if (active) {
          setText(r.chunks);
          setTextTotal(r.total);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setTextLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reading, textPage]);
  const choose = (next: string, cat = '') => {
    setView(next);
    setCategory(cat);
    setTag('');
    setPage(1);
  };
  const download = async (row: DocumentRow) => {
    try {
      downloadBlob(await apiFetchBlob(`/api/v1/documents/${row.id}/download`), row.file_name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    }
  };
  const handleViewDocument = (row: DocumentRow) => {
    const token = getAccessToken();
    const cleanFilename = row.file_name || `${row.title || 'document'}.pdf`;
    const viewUrl = `/api/v1/documents/${row.id}/view/${encodeURIComponent(cleanFilename)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.open(viewUrl, '_blank', 'noopener,noreferrer');
  };
  const title =
    category ||
    (view === 'for-you'
      ? 'For you'
      : view === 'super-private' ?'Super Private'
        : view === 'public' ?'Shared with everyone' :'All documents');
  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] font-semibold text-muted-foreground mb-1">
              <FolderOpen size={14} /> Your knowledge, organized
            </div>
            <h1 className="page-title">Documents</h1>
            <p className="text-sm text-muted-foreground mt-1">
              One home for files across your workspace. Find the detail you need.
            </p>
          </div>
          <button
            className="btn-primary flex items-center justify-center gap-2 px-5 py-2.5"
            onClick={() => setUploading(true)}
          >
            <Upload size={16} /> Upload documents
          </button>
        </header>

        <div className="bg-primary p-5 md:p-6 text-primary-foreground flex flex-col md:flex-row gap-5 md:items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/10">
              <Sparkles size={22} />
            </div>
            <div>
              <p className="font-semibold text-base">Search beyond the filename</p>
              <p className="text-primary-foreground/70 text-sm mt-1">
                Find words inside documents, or describe what you're looking for.
              </p>
            </div>
          </div>
          <label className="relative md:w-[48%] block">
            <Search className="absolute left-4 top-3.5 text-muted-foreground" size={18} />
            <input
              aria-label="Search documents and their contents"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={"Try \"drilling progress at the north site\""}
              className="w-full bg-card text-foreground placeholder:text-muted-foreground pl-11 pr-10 py-3 outline-none focus:ring-2 focus:ring-primary/40 border border-border"
            />
            {query && (
              <button
                aria-label="Clear search"
                className="absolute right-3 top-3.5 text-muted-foreground"
                onClick={() => setQuery('')}
              >
                <X size={18} />
              </button>
            )}
          </label>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6">
          <aside className="space-y-6 lg:border-r lg:pr-5 border-border">
            <nav aria-label="Document collections" className="space-y-1">
              {[
                { key: 'for-you', label: 'For you', Icon: Sparkles },
                { key: 'all', label: 'All documents', Icon: FolderOpen },
                { key: 'public', label: 'Public documents', Icon: Globe2 },
                ...(data?.is_admin
                  ? [{ key: 'super-private', label: 'Super Private', Icon: ShieldCheck }]
                  : []),
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => choose(key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${view === key && !category ? 'bg-secondary text-primary font-semibold' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>
            <div>
              <h2 className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground px-3 mb-3">
                Categories
              </h2>
              <div className="space-y-1">
                {(data?.categories || []).map((c) => (
                  <button
                    key={c.name}
                    onClick={() => choose('all', c.name)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${category === c.name ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    <FolderOpen size={14} />
                    <span className="flex-1 text-left">{c.name}</span>
                    <span className="text-xs tabular-nums">{c.count}</span>
                  </button>
                ))}
              </div>
            </div>
            {!!data?.tags.length && (
              <div>
                <h2 className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground px-3 mb-3">
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2 px-2">
                  {data.tags.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTag(tag === t ? '' : t);
                        setPage(1);
                      }}
                      className={`text-xs px-2 py-1 border transition-colors ${tag === t ? 'bg-secondary border-primary/30 text-primary font-semibold' : 'border-border text-muted-foreground hover:bg-muted'}`}
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-muted p-4 flex gap-2 text-xs text-muted-foreground leading-relaxed">
              <LockKeyhole size={15} className="shrink-0 mt-0.5" />
              <p>New documents are private. You control sharing from each file's settings.</p>
            </div>
          </aside>

          <main className="min-w-0">
            <div className="flex flex-wrap justify-between gap-3 items-center mb-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{search ? 'Search results' : title}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {search
                    ? `Within ${title.toLowerCase()} · `
                    : view === 'for-you'
                      ? 'Files you uploaded or attached to your employee profile · ' :''}
                  {data?.total ?? '—'} documents
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  className="p-2 hover:bg-muted text-muted-foreground transition-colors"
                  aria-label="Refresh documents"
                  onClick={refresh}
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  className={`p-2 transition-colors ${layout === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setLayout('grid')}
                  aria-label="Grid view"
                >
                  <Grid2X2 size={16} />
                </button>
                <button
                  className={`p-2 transition-colors ${layout === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setLayout('list')}
                  aria-label="List view"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
            {tag && (
              <button
                className="mb-4 inline-flex items-center gap-2 text-xs bg-muted px-3 py-1.5 text-muted-foreground hover:bg-border transition-colors"
                onClick={() => setTag('')}
              >
                <Tag size={12} />
                {tag}
                <X size={12} />
              </button>
            )}
            {error && (
              <p role="alert" className="p-4 mb-4 bg-red-50 text-red-800 text-sm border border-red-200">
                {error}
                <button className="ml-3 underline" onClick={refresh}>
                  Retry
                </button>
              </p>
            )}
            {data?.search_warning && (
              <p role="status" className="text-sm text-amber-800 bg-amber-50 p-3 mb-4 border border-amber-200">
                {data.search_warning}
              </p>
            )}
            {loading ? (
              <div role="status" className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-52 bg-muted animate-pulse" />
                ))}
                <span className="sr-only">Loading documents</span>
              </div>
            ) : (
              <div
                className={
                  layout === 'grid' ? 'grid sm:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'
                }
              >
                {data?.items.map((row) => {
                  const PrivacyIcon = privacy[row.visibility].icon;
                  return (
                    <article
                      key={row.id}
                      className={`border border-border bg-card p-5 card-hover transition-shadow ${layout === 'list' ? 'sm:flex sm:gap-5 sm:items-start' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <FileIcon name={row.file_name} />
                        {layout === 'grid' && (
                          <span
                            title={privacy[row.visibility].label}
                            className="text-muted-foreground bg-muted p-1.5"
                          >
                            <PrivacyIcon size={14} />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <button
                          className="font-semibold text-sm text-left hover:text-primary line-clamp-2 break-words transition-colors"
                          onClick={() => {
                            setReading(row);
                            setTextPage(1);
                          }}
                        >
                          {row.title}
                        </button>
                        <p
                          className="text-xs text-muted-foreground truncate mt-1"
                          title={row.file_name}
                        >
                          {row.file_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {row.category} · {size(row.size_bytes)} ·{' '}
                          {new Date(row.created_at).toLocaleDateString()}
                        </p>
                        {row.owner_name && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Uploaded by {row.owner_name}
                          </p>
                        )}
                        {row.match && (
                          <div className="bg-secondary/60 border-l-2 border-primary/40 px-3 py-2 mt-3">
                            <p className="text-[10px] uppercase font-semibold text-primary mb-1">
                              {row.match.location}
                            </p>
                            <p className="text-xs leading-relaxed text-foreground/80 line-clamp-4">
                              {row.match.text}
                            </p>
                          </div>
                        )}
                        {!!row.tags.length && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {row.tags.map((t) => (
                              <button
                                key={t}
                                className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 hover:bg-border transition-colors"
                                onClick={() => {
                                  setTag(t);
                                  setPage(1);
                                }}
                              >
                                #{t}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="border-t border-border mt-4 pt-3 flex items-center justify-between gap-2">
                          <span
                            className={`text-[10px] flex items-center gap-1 ${row.index_status === 'READY' ? 'text-primary' : 'text-muted-foreground'}`}
                            title={row.index_message || undefined}
                          >
                            {row.index_status === 'READY' ? (
                              <Check size={12} />
                            ) : row.index_status === 'PENDING' ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <FileText size={12} />
                            )}
                            {states[row.index_status] || row.index_status}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              className="btn-secondary text-xs flex items-center gap-1 py-1 px-2.5"
                              onClick={() => handleViewDocument(row)}
                              title={`View document ${row.title}`}
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>
                            <button
                              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => void download(row)}
                              aria-label={`Download ${row.title}`}
                              title={`Download ${row.title}`}
                            >
                              <ArrowDownToLine size={16} />
                            </button>
                            {row.can_manage && (
                              <button
                                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => setSelected(row)}
                                aria-label={`Manage ${row.title}`}
                                title={`Manage ${row.title}`}
                              >
                                <SlidersHorizontal size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            {!loading && !error && !data?.items.length && (
              <div className="text-center border border-dashed border-border py-20 px-6">
                <FolderOpen size={36} className="mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-foreground">
                  {search ? 'No matching documents' : 'A home for your documents'}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                  {search
                    ? 'Try another phrase, remove a filter, or search All documents.'
                    : 'Upload a file to get started. Documents from across the platform appear here automatically when you have access.'}
                </p>
                <button
                  className="btn-secondary mt-5"
                  onClick={() => (search ? choose('all') : setUploading(true))}
                >
                  {search ? 'Search all documents' : 'Upload a document'}
                </button>
              </div>
            )}
            {!!data?.total && (
              <div className="flex justify-between items-center mt-6 text-xs text-muted-foreground">
                <span>
                  Page {page} of {Math.ceil(data.total / 24)}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    className="btn-secondary p-2 disabled:opacity-40"
                    aria-label="Previous page"
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={page * 24 >= data.total}
                    className="btn-secondary p-2 disabled:opacity-40"
                    aria-label="Next page"
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>

        {uploading && (
          <UploadModal
            categories={data?.categories.map((c) => c.name) || []}
            close={() => setUploading(false)}
            saved={() => {
              setUploading(false);
              choose('for-you');
              refresh();
            }}
          />
        )}
        {selected && (
          <ManageModal
            row={selected}
            admin={!!data?.is_admin}
            close={() => setSelected(null)}
            saved={() => {
              setSelected(null);
              refresh();
            }}
          />
        )}
        {reading && (
          <Modal name={reading.title} onClose={() => setReading(null)}>
            <div className="flex flex-wrap justify-between gap-3 mb-5 border-b pb-3">
              <p className="text-sm text-muted-foreground">Document content & extracted text · {reading.file_name}</p>
              <div className="flex items-center gap-2">
                <button
                  className="btn-secondary text-xs flex items-center gap-1.5"
                  onClick={async () => {
                    try {
                      const blob = await apiFetchBlob(`/api/v1/documents/${reading.id}/download`);
                      const url = URL.createObjectURL(blob);
                      window.open(url, '_blank', 'noopener,noreferrer');
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Could not view file');
                    }
                  }}
                >
                  <Eye size={13} />
                  Open File Preview
                </button>
                <button className="btn-primary text-xs flex items-center gap-1.5" onClick={() => void download(reading)}>
                  <ArrowDownToLine size={13} />
                  Download original
                </button>
              </div>
            </div>
            {textLoading ? (
              <p role="status">Loading text…</p>
            ) : text.length ? (
              <div className="space-y-5">
                {text.map((chunk, i) => (
                  <section key={i}>
                    <h3 className="text-xs font-semibold text-primary mb-2">
                      {chunk.location}
                    </h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{chunk.text}</p>
                  </section>
                ))}
                <div className="flex justify-between pt-4">
                  <button
                    disabled={textPage === 1}
                    onClick={() => setTextPage((p) => p - 1)}
                    className="btn-secondary disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={textPage * 20 >= textTotal}
                    onClick={() => setTextPage((p) => p + 1)}
                    className="btn-secondary disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <p className="bg-muted p-5 text-sm text-muted-foreground">
                {reading.index_message ||
                  'Text is not ready yet. You can download the original file.'}
              </p>
            )}
          </Modal>
        )}
      </div>
    </AppLayout>
  );
}

function UploadModal({
  categories,
  close,
  saved,
}: {
  categories: string[];
  close: () => void;
  saved: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState('General');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    let done = 0;
    try {
      for (const file of files) {
        setProgress(`Uploading ${done + 1} of ${files.length}: ${file.name}`);
        const form = new FormData();
        form.append('file', file);
        form.append('category', category);
        form.append('tags', tags);
        await apiFetch('/api/v1/documents', { method: 'POST', body: form });
        done++;
      }
      saved();
    } catch (e) {
      setFiles((current) => current.slice(done));
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      name="Upload documents"
      onClose={() => {
        if (!busy) close();
      }}
    >
      <form onSubmit={submit} className="space-y-5">
        <label className="block border-2 border-dashed border-border bg-muted/50 p-8 text-center cursor-pointer hover:bg-muted transition-colors">
          <Upload size={28} className="mx-auto mb-3 text-primary" />
          <span className="block font-semibold text-sm">Choose your files</span>
          <span className="block text-xs text-muted-foreground mt-2">
            Any file format · text extraction depends on the format
          </span>
          <input
            type="file"
            multiple
            required
            disabled={busy}
            className="block max-w-full text-xs mx-auto mt-4"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
        </label>
        {files.length > 0 && (
          <ul className="max-h-36 overflow-auto space-y-1 text-xs text-muted-foreground">
            {files.map((f, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="truncate">{f.name}</span>
                <span>{size(f.size)}</span>
              </li>
            ))}
          </ul>
        )}
        <label className="block text-sm font-medium">
          Category
          <input
            list="document-categories"
            className="input-field w-full mt-2"
            maxLength={60}
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="document-categories">
            {['General', ...categories].map((c, i) => (
              <option key={i} value={c} />
            ))}
          </datalist>
        </label>
        <label className="block text-sm font-medium">
          Tags
          <input
            className="input-field w-full mt-2"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="contract, drilling, 2026"
          />
          <span className="text-xs text-muted-foreground font-normal">
            Separate tags with commas.
          </span>
        </label>
        <p className="flex gap-2 text-xs bg-muted p-3 text-muted-foreground">
          <LockKeyhole size={16} className="shrink-0" />
          Files start private. After uploading, use file settings to change visibility.
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {busy && (
          <p role="status" className="text-xs text-muted-foreground">
            {progress}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" disabled={busy} onClick={close} className="btn-secondary">
            Cancel
          </button>
          <button disabled={busy || !files.length} className="btn-primary">
            {busy ? 'Uploading…' : 'Upload documents'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ManageModal({
  row,
  admin,
  close,
  saved,
}: {
  row: DocumentRow;
  admin: boolean;
  close: () => void;
  saved: () => void;
}) {
  const [title, setTitle] = useState(row.title);
  const [category, setCategory] = useState(row.category);
  const [tags, setTags] = useState(row.tags.join(', '));
  const [visibility, setVisibility] = useState(row.visibility);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch(`/api/v1/documents/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title,
          category,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          visibility,
        }),
      });
      saved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };
  const reindex = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/documents/${row.id}/reindex`, { method: 'POST' });
      saved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retry failed');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal name="Document settings" onClose={close}>
      <form className="space-y-5" onSubmit={save}>
        <label className="block text-sm font-medium">
          Title
          <input
            className="input-field w-full mt-2"
            required
            maxLength={250}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block text-sm font-medium">
            Category
            <input
              className="input-field w-full mt-2"
              required
              maxLength={60}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Tags
            <input
              className="input-field w-full mt-2"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </label>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold mb-3">Who can see this document?</legend>
          {(
            [
              'PRIVATE',
              'PUBLIC',
              ...(admin ? ['SUPER_PRIVATE'] : []),
            ] as DocumentRow['visibility'][]
          ).map((value) => {
            const Icon = privacy[value].icon;
            return (
              <label
                key={value}
                className={`flex gap-3 p-4 border cursor-pointer transition-colors ${visibility === value ? 'border-primary bg-secondary/50' : 'border-border hover:bg-muted'}`}
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === value}
                  onChange={() => setVisibility(value)}
                />
                <Icon size={18} className={visibility === value ? 'text-primary' : 'text-muted-foreground'} />
                <span>
                  <span className="text-sm font-semibold block">{privacy[value].label}</span>
                  <span className="text-xs text-muted-foreground">
                    {value === 'PRIVATE' ?'Uploader, the employee it belongs to, and authorized oversight roles.'
                      : value === 'PUBLIC' ?'Everyone signed in to your organization.' :'Only you, the administrator marking this file. Other administrators and the original owner lose access.'}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
        <div className="text-xs text-muted-foreground bg-muted p-3">
          {states[row.index_status]}
          {row.index_message && <p className="mt-1">{row.index_message}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={() => void reindex()}
            className="underline mt-2"
          >
            Rebuild search index
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={close}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
