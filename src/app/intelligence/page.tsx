'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, BrainCircuit, Send, RefreshCw, Lock, Wrench, Fuel, Users, FolderKanban, Package, TrendingUp, Database, Search, Bot, User as UserIcon, X, Filter, MapPin, Building2, Calendar, Printer, Play, Tag, ExternalLink, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,  } from 'recharts';
import AppLayout from '@/components/AppLayout';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch } from '@/lib/api';
import { openUniversalFileViewer } from '@/lib/fileViewer';
import { useData, rows } from '@/components/DataUI';
import { toast } from 'sonner';

interface IntelligenceMetrics {
  fleet_utilization?: {
    total_assets?: number;
    operating?: number;
    available?: number;
    maintenance?: number;
    breakdown?: number;
    standby?: number;
    utilization_rate_pct?: number;
    open_defects_count?: number;
    critical_defects_count?: number;
    by_category?: Array<{ category: string; count: number }>;
  };
  fuel_efficiency?: {
    total_fuel_liters?: number;
    total_meter_hours?: number;
    fuel_consumption_liters_per_hour?: number;
  };
  drilling_performance?: {
    target_metres?: number;
    drilled_metres?: number;
    completion_pct?: number;
    by_status?: Array<{ status: string; count: number }>;
  };
  workforce_productivity?: {
    total_employees?: number;
    assigned_employees?: number;
    available_employees?: number;
    deployment_rate_pct?: number;
    by_department?: Array<{ department: string; count: number }>;
    by_project?: Array<{ project: string; count: number }>;
  };
  inventory_intelligence?: {
    total_catalog_items?: number;
    total_stock_valuation?: number;
    by_category?: Array<{ category: string; value: number }>;
  };
  financial_summary?: {
    total_projects?: number;
    total_contract_value?: number | null;
    total_locations?: number;
    total_clients?: number;
    active_maintenance_jobs?: number;
    open_defects_count?: number;
    critical_defects_count?: number;
  };
  defect_intelligence?: {
    open_defects_count?: number;
    critical_defects_count?: number;
    high_defects_count?: number;
    medium_defects_count?: number;
    low_defects_count?: number;
    defects_by_severity?: Array<{ severity: string; count: number }>;
    active_maintenance_jobs?: number;
  };
  site_intelligence?: {
    total_active_sites?: number;
    site_capacity_breakdown?: Array<{
      site_id: string;
      site_name: string;
      fleet_count: number;
      workforce_count: number;
      open_defects: number;
      stock_value: number;
    }>;
  };
  efficiency_analytics?: {
    fleet_availability_ratio?: number;
    workforce_idle_count?: number;
    estimated_fuel_cost_usd?: number;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: {
    document_title: string;
    file_name: string;
    location: string;
    snippet: string;
    relevance_score: number;
  }[];
  tools_used?: string[];
  suggested_filters?: {
    project_id?: string;
    project_name?: string;
    location_id?: string;
    location_name?: string;
    department_id?: string;
    category_id?: string;
    status?: string;
    label?: string;
  };
}

const SUGGESTED_PROMPTS = [
  'Analyze current fleet fuel efficiency and maintenance risks',
  'Summarize active project drilling performance vs targets',
  'Search safety compliance and operating policy documents',
  'What is our current workforce deployment and assignment ratio?',
];

const COLORS = ['var(--primary)', '#7C3AED', '#D97706', '#0891B2', '#15803D', '#DC2626', '#4B5563'];

const TOOL_NAME_MAP: Record<string, string> = {
  query_database_metrics: 'Live Database Telemetry',
  search_document_vector_store: 'Document Vector Search',
  read_table_schemas: 'Schema Inspection',
  schema_auto_corrected: 'Schema Alignment',
  smart_assistant_agent_loop: 'Operations Reasoning',
};

function formatToolName(name: string): string {
  if (TOOL_NAME_MAP[name]) return TOOL_NAME_MAP[name];
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function MarkdownText({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-2 text-xs leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-sm font-800 text-foreground pt-1 pb-0.5 border-b border-border/50">
              {formatInlineMarkdown(line.slice(4))}
            </h3>
          );
        }
        if (line.startsWith('#### ')) {
          return (
            <h4 key={idx} className="text-xs font-700 text-primary pt-1">
              {formatInlineMarkdown(line.slice(5))}
            </h4>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-base font-800 text-foreground pt-2">
              {formatInlineMarkdown(line.slice(3))}
            </h2>
          );
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-primary font-bold text-sm leading-none">•</span>
              <span className="flex-1">{formatInlineMarkdown(trimmed.slice(2))}</span>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-primary font-700">{numMatch[1]}.</span>
              <span className="flex-1">{formatInlineMarkdown(numMatch[2])}</span>
            </div>
          );
        }

        if (trimmed.startsWith('> ')) {
          return (
            <blockquote key={idx} className="pl-3 py-1 border-l-2 border-primary bg-muted/40 italic rounded-r text-muted-foreground">
              {formatInlineMarkdown(trimmed.slice(2))}
            </blockquote>
          );
        }

        return <p key={idx}>{formatInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

function formatInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\)|\*.*?\*|`.*?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={index} className="font-700 text-foreground">
          {formatInlineMarkdown(inner)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <em key={index} className="italic">
          {formatInlineMarkdown(inner)}
        </em>
      );
    }
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        const label = match[1];
        const url = match[2];
        const isExternal = url.startsWith('http://') || url.startsWith('https://');
        const fileUrl = /\.(pdf|docx?|xlsx?|pptx?|csv|txt|png|jpe?g|gif|webp|svg)(?:[?#]|$)/i.test(url)
          || /\/(?:download|view|attachment|file)(?:\/|[?#]|$)/i.test(url);
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-700 underline underline-offset-2 hover:text-primary/80 transition-colors inline-flex items-center gap-0.5 mx-0.5"
            onClick={(e) => {
              if (fileUrl) {
                e.preventDefault();
                const fileName = decodeURIComponent(url.split(/[/?#]/).filter(Boolean).pop() || label);
                openUniversalFileViewer({ fileUrl: url, fileName, title: label });
              } else if (!isExternal) {
                e.preventDefault();
                window.open(url, '_blank');
              }
            }}
          >
            <span>{label}</span>
            <ExternalLink size={10} className="inline flex-shrink-0 opacity-80" />
          </a>
        );
      }
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={index} className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px] text-primary border border-border/60">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default function IntelligencePage() {
  const auth = useAuth();
  const [metrics, setMetrics] = useState<IntelligenceMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [projectId, setProjectId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const hasAccess = auth.can('intelligence.read');

  // Filter Option Lists
  const projectsRes = useData(hasAccess ? '/api/v1/projects' : null);
  const projectList = rows(projectsRes?.data);

  const locationsRes = useData(hasAccess ? '/api/v1/locations' : null);
  const locationList = rows(locationsRes?.data);

  const departmentsRes = useData(hasAccess ? '/api/v1/departments' : null);
  const departmentList = rows(departmentsRes?.data);

  const categoriesRes = useData(hasAccess ? '/api/v1/asset-categories' : null);
  const categoryList = rows(categoriesRes?.data);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Smart Assistant Modal State
  const [showAssistantModal, setShowAssistantModal] = useState(false);

  const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
    role: 'assistant',
    content:
      "Hello! I am your **Smart Assistant**. I can query live database metrics across Workforce, Fleet, Projects, and Inventory, as well as perform semantic vector search on company documents. How can I assist your operational decisions today?",
  };

  // Chat Assistant State
  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);
  const [inputQuery, setInputQuery] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchChatHistory = async () => {
    if (!hasAccess) return;
    try {
      const history = await apiFetch<ChatMessage[]>('/api/v1/intelligence/assistant/history');
      if (Array.isArray(history) && history.length > 0) {
        setMessages(history);
      } else {
        setMessages([DEFAULT_WELCOME_MESSAGE]);
      }
    } catch {
      // Keep default on error
    }
  };

  const handleResetHistory = async () => {
    try {
      await apiFetch('/api/v1/intelligence/assistant/history', { method: 'DELETE' });
      setMessages([DEFAULT_WELCOME_MESSAGE]);
      toast.success('Chat history reset successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset chat history');
    }
  };

  const fetchMetrics = () => {
    if (!hasAccess) {
      setLoadingMetrics(false);
      return;
    }

    setLoadingMetrics(true);
    const params = new URLSearchParams();
    if (projectId) params.set('project_id', projectId);
    if (locationId) params.set('location_id', locationId);
    if (departmentId) params.set('department_id', departmentId);
    if (categoryId) params.set('category_id', categoryId);
    if (status) params.set('status', status);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    const url = '/api/v1/intelligence/metrics' + (params.toString() ? '?' + params.toString() : '');
    apiFetch<IntelligenceMetrics>(url)
      .then((data) => setMetrics(data))
      .catch(() => {
        toast.error('Failed to load operational intelligence metrics');
      })
      .finally(() => setLoadingMetrics(false));
  };

  useEffect(() => {
    fetchMetrics();
    fetchChatHistory();
  }, [hasAccess, projectId, locationId, departmentId, categoryId, status, dateFrom, dateTo]);

  useEffect(() => {
    if (showAssistantModal) {
      fetchChatHistory();
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [showAssistantModal]);

  useEffect(() => {
    if (showAssistantModal) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setProjectId('');
    setLocationId('');
    setDepartmentId('');
    setCategoryId('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
  };

  const handleApplyAssistantFilter = (f: NonNullable<ChatMessage['suggested_filters']>) => {
    if (f.project_id) setProjectId(f.project_id);
    if (f.location_id) setLocationId(f.location_id);
    if (f.department_id) setDepartmentId(f.department_id);
    if (f.category_id) setCategoryId(f.category_id);
    if (f.status) setStatus(f.status);

    const labelName = f.project_name || f.label || 'Selected Filter Criteria';
    toast.success(`Applied dashboard filter: ${labelName}`);
    setShowAssistantModal(false);
    fetchMetrics();
  };

  const handleSendMessage = async (queryText?: string) => {
    const text = (queryText || inputQuery).trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInputQuery('');
    setSending(true);

    try {
      const res = await apiFetch<{
        reply: string;
        citations?: any[];
        tools_used?: string[];
        suggested_filters?: any;
      }>('/api/v1/intelligence/assistant', {
        method: 'POST',
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.reply || 'Analysis completed.',
        citations: res.citations || [],
        tools_used: res.tools_used || [],
        suggested_filters: res.suggested_filters || undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      toast.error(err.message || 'Could not complete assistant query');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an issue retrieving operational data. Please verify network or access permissions.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!hasAccess) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto my-12 text-center card p-8 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
            <Lock size={28} />
          </div>
          <h2 className="text-xl font-700 text-foreground">Executive Access Required</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The Operations Intelligence dashboard and Smart Assistant are restricted to high-level employees, executives, managers, and authorized personnel.
          </p>
          <div className="pt-2">
            <span className="badge badge-warning text-xs font-600">
              Requires Permission: intelligence.read
            </span>
          </div>
        </div>
      </AppLayout>
    );
  }

  const fu = metrics?.fleet_utilization;
  const fe = metrics?.fuel_efficiency;
  const dp = metrics?.drilling_performance;
  const wp = metrics?.workforce_productivity;
  const ii = metrics?.inventory_intelligence;
  const fs = metrics?.financial_summary;
  const di = metrics?.defect_intelligence;
  const si = metrics?.site_intelligence;
  const ea = metrics?.efficiency_analytics;

  const matchSearch = (textStr: string) => {
    if (!searchQuery.trim()) return true;
    return textStr.toLowerCase().includes(searchQuery.trim().toLowerCase());
  };

  const filteredFleetCats = (fu?.by_category || []).filter((c) => matchSearch(c.category));
  const filteredWorkforceDepts = (wp?.by_department || []).filter((d) => matchSearch(d.department));
  const filteredWorkforceProjs = (wp?.by_project || []).filter((p) => matchSearch(p.project));
  const filteredInvCats = (ii?.by_category || []).filter((c) => matchSearch(c.category));

  const activeFiltersCount = [projectId, locationId, departmentId, categoryId, status, dateFrom, dateTo].filter(Boolean).length;

  return (
    <AppLayout>
      {/* Global Print CSS */}
      <style jsx global>{`
        @media print {
          html, body, #__next, body > div, main {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }

          aside, header, nav, footer, .no-print, button, input, select, form, [role="dialog"], [aria-modal="true"], .modal-overlay {
            display: none !important;
          }

          .max-w-screen-2xl {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .card {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            background: #ffffff !important;
            color: #000000 !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 1.25rem !important;
          }

          .kpi-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 1px solid #cbd5e1 !important;
            padding: 0.75rem !important;
          }

          .print-header {
            display: flex !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div className="space-y-6 fade-in print:space-y-4 print:p-0">
        {/* Printable Executive Header */}
        <div className="hidden print-header print:flex items-center justify-between pb-4 mb-4 border-b-2 border-slate-900 w-full">
          <div className="flex items-center gap-3">
            <AppLogo size={32} />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Cestos Operations</h1>
              <p className="text-2xs font-bold text-slate-600 uppercase tracking-wider">
                Operations Intelligence Executive Report
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Generated: {new Date().toLocaleString()}</p>
            <p className="text-2xs mt-0.5">
              Data Scope: {activeFiltersCount > 0 ? `${activeFiltersCount} filter criteria applied` : 'Full Organization Scope'}
            </p>
          </div>
        </div>

        {/* Executive Header Banner */}
        <div className="card p-6 gradient-brand text-white shadow-md relative overflow-hidden no-print">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <BrainCircuit size={20} className="text-white fill-white/20" />
                </div>
                <span className="text-xs font-700 tracking-wider uppercase bg-white/10 px-2.5 py-0.5 rounded-full text-white/90">
                  Executive Operations Hub
                </span>
              </div>
              <h1 className="text-2xl font-800 text-white tracking-tight">Operations Intelligence</h1>
              <p className="text-xs text-white/80 mt-1 max-w-2xl leading-relaxed">
                Real-time cross-domain analytics, equipment telemetry, drilling target metrics, and interactive Smart Assistant for executive decision support.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Smart Assistant Launch Button */}
              <button
                onClick={() => setShowAssistantModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white text-primary hover:bg-white/90 shadow-md font-700 text-xs transition-all active:scale-95 border border-white/30"
              >
                <Sparkles size={15} className="text-primary fill-primary/20" />
                <span>Smart Assistant</span>
              </button>

              {/* Print Report Button */}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-600 border border-white/20 transition-all active:scale-95"
              >
                <Printer size={14} />
                <span>Print Report</span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={fetchMetrics}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-600 border border-white/20 transition-all active:scale-95"
              >
                <RefreshCw size={14} className={loadingMetrics ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Comprehensive Filter Bar & Search Controls */}
        <div className="card p-4 flex flex-wrap items-center justify-between gap-3 bg-card border border-border no-print">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search metrics, categories, departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 text-xs w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground text-xs"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Project Filter */}
            <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded border border-border">
              <FolderKanban size={13} className="text-muted-foreground" />
              <select
                aria-label="Filter by project"
                className="bg-transparent font-600 outline-none text-xs cursor-pointer max-w-[140px] truncate"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">All Projects</option>
                {projectList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Site / Location Filter */}
            <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded border border-border">
              <MapPin size={13} className="text-muted-foreground" />
              <select
                aria-label="Filter by location"
                className="bg-transparent font-600 outline-none text-xs cursor-pointer max-w-[130px] truncate"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">All Sites</option>
                {locationList.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded border border-border">
              <Building2 size={13} className="text-muted-foreground" />
              <select
                aria-label="Filter by department"
                className="bg-transparent font-600 outline-none text-xs cursor-pointer max-w-[130px] truncate"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">All Departments</option>
                {departmentList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded border border-border">
              <Tag size={13} className="text-muted-foreground" />
              <select
                aria-label="Filter by asset category"
                className="bg-transparent font-600 outline-none text-xs cursor-pointer max-w-[130px] truncate"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">All Categories</option>
                {categoryList.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded border border-border">
              <Filter size={13} className="text-muted-foreground" />
              <select
                aria-label="Filter by status"
                className="bg-transparent font-600 outline-none text-xs cursor-pointer"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="OPERATING">Operating</option>
                <option value="AVAILABLE">Available</option>
                <option value="ACTIVE">Active Staff</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>

            {/* Date Range Picker */}
            <div className="flex items-center gap-1 bg-muted/40 px-2 py-1 rounded border border-border">
              <Calendar size={13} className="text-muted-foreground" />
              <input
                type="date"
                aria-label="Date from"
                className="bg-transparent outline-none text-[11px] font-500 text-foreground"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <span className="text-muted-foreground text-2xs">to</span>
              <input
                type="date"
                aria-label="Date to"
                className="bg-transparent outline-none text-[11px] font-500 text-foreground"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {/* Clear All Filters */}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-600 text-xs transition-colors"
              >
                <X size={12} />
                <span>Reset ({activeFiltersCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Dashboard Filters Summary Banner */}
        {activeFiltersCount > 0 && (
          <div className="card p-3.5 bg-primary/5 border border-primary/20 flex flex-wrap items-center justify-between gap-3 no-print animate-in fade-in">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-700 text-primary flex items-center gap-1.5 mr-1">
                <Filter size={14} className="text-primary" />
                <span>Active Dashboard Filters ({activeFiltersCount}):</span>
              </span>

              {projectId && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border text-foreground font-600 text-xs shadow-2xs">
                  <FolderKanban size={13} className="text-primary" />
                  <span>Project:</span>
                  <strong className="text-primary font-700">
                    {projectList.find((p) => p.id === projectId)?.name || 'Selected Project'}
                  </strong>
                </span>
              )}

              {locationId && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border text-foreground font-600 text-xs shadow-2xs">
                  <MapPin size={13} className="text-primary" />
                  <span>Site:</span>
                  <strong className="text-primary font-700">
                    {locationList.find((l) => l.id === locationId)?.name || 'Selected Site'}
                  </strong>
                </span>
              )}

              {departmentId && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border text-foreground font-600 text-xs shadow-2xs">
                  <Building2 size={13} className="text-primary" />
                  <span>Department:</span>
                  <strong className="text-primary font-700">
                    {departmentList.find((d) => d.id === departmentId)?.name || 'Selected Department'}
                  </strong>
                </span>
              )}

              {categoryId && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border text-foreground font-600 text-xs shadow-2xs">
                  <Tag size={13} className="text-primary" />
                  <span>Category:</span>
                  <strong className="text-primary font-700">
                    {categoryList.find((c) => c.id === categoryId)?.name || 'Selected Category'}
                  </strong>
                </span>
              )}

              {status && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border text-foreground font-600 text-xs shadow-2xs">
                  <Filter size={13} className="text-primary" />
                  <span>Status:</span>
                  <strong className="text-primary font-700">
                    {status === 'OPERATING' ?'Operating Fleet'
                      : status === 'AVAILABLE' ?'Available Fleet'
                      : status === 'ACTIVE' ?'Active Personnel'
                      : status === 'IN_PROGRESS' ?'In Progress'
                      : status === 'MAINTENANCE' ?'Maintenance'
                      : status}
                  </strong>
                </span>
              )}

              {(dateFrom || dateTo) && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border text-foreground font-600 text-xs shadow-2xs">
                  <Calendar size={13} className="text-primary" />
                  <span>Date Range:</span>
                  <strong className="text-primary font-700">
                    {dateFrom || 'Start'} to {dateTo || 'End'}
                  </strong>
                </span>
              )}

              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border text-foreground font-600 text-xs shadow-2xs">
                  <Search size={13} className="text-primary" />
                  <span>Search Query:</span>
                  <strong className="text-primary font-700">&quot;{searchQuery}&quot;</strong>
                </span>
              )}
            </div>

            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 font-700 text-xs border border-rose-200 transition-colors shadow-2xs"
            >
              <X size={13} />
              <span>Clear All Filters</span>
            </button>
          </div>
        )}

        {/* Executive Bento KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Fleet Utilization */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label">Fleet Utilization</span>
              <div className="w-7 h-7 rounded flex items-center justify-center bg-blue-50 text-blue-700">
                <Wrench size={15} />
              </div>
            </div>
            <div className="kpi-value text-blue-700">
              {loadingMetrics ? '—' : `${fu?.utilization_rate_pct ?? 0}%`}
            </div>
            <div className="kpi-sub mt-1 text-2xs">
              {fu?.operating ?? 0} operating / {fu?.total_assets ?? 0} total fleet
            </div>
          </div>

          {/* Mechanical & Defect Risk */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label">Critical Defect Risk</span>
              <div className={`w-7 h-7 rounded flex items-center justify-center ${(fu?.critical_defects_count ?? 0) > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                <AlertTriangle size={15} />
              </div>
            </div>
            <div className={`kpi-value ${(fu?.critical_defects_count ?? 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {loadingMetrics ? '—' : (fu?.critical_defects_count ?? fs?.critical_defects_count ?? 0)}
            </div>
            <div className="kpi-sub mt-1 text-2xs">
              {(fu?.open_defects_count ?? fs?.open_defects_count ?? 0)} total open equipment defects
            </div>
          </div>

          {/* Fuel Index */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label">Fuel Consumption</span>
              <div className="w-7 h-7 rounded flex items-center justify-center bg-teal-50 text-teal-700">
                <Fuel size={15} />
              </div>
            </div>
            <div className="kpi-value text-teal-700">
              {loadingMetrics ? '—' : `${fe?.fuel_consumption_liters_per_hour ?? 0} L/h`}
            </div>
            <div className="kpi-sub mt-1 text-2xs">
              {fe?.total_fuel_liters?.toLocaleString() ?? 0} L total fuel
            </div>
          </div>

          {/* Drilling Target */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label">Drilling Progress</span>
              <div className="w-7 h-7 rounded flex items-center justify-center bg-green-50 text-green-700">
                <TrendingUp size={15} />
              </div>
            </div>
            <div className="kpi-value text-green-700">
              {loadingMetrics ? '—' : `${dp?.completion_pct ?? 0}%`}
            </div>
            <div className="kpi-sub mt-1 text-2xs">
              {dp?.drilled_metres?.toLocaleString() ?? 0} m drilled
            </div>
          </div>

          {/* Workforce Deployment */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label">Workforce Active</span>
              <div className="w-7 h-7 rounded flex items-center justify-center bg-indigo-50 text-indigo-700">
                <Users size={15} />
              </div>
            </div>
            <div className="kpi-value text-indigo-700">
              {loadingMetrics ? '—' : `${wp?.deployment_rate_pct ?? 0}%`}
            </div>
            <div className="kpi-sub mt-1 text-2xs">
              {wp?.assigned_employees ?? 0} assigned of {wp?.total_employees ?? 0} staff
            </div>
          </div>

          {/* Stock Valuation */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label">Stock Valuation</span>
              <div className="w-7 h-7 rounded flex items-center justify-center bg-purple-50 text-purple-700">
                <Package size={15} />
              </div>
            </div>
            <div className="kpi-value text-purple-700">
              {loadingMetrics ? '—' : `$${((ii?.total_stock_valuation ?? 0) / 1000).toFixed(1)}k`}
            </div>
            <div className="kpi-sub mt-1 text-2xs">
              {ii?.total_catalog_items ?? 0} catalog items ({fs?.total_locations ?? 0} sites)
            </div>
          </div>
        </div>

        {/* Visual Charts & Telemetry Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Chart 1: Equipment Fleet Category Breakdown */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-700 text-foreground">Fleet Assets by Category</p>
                <p className="text-xs text-muted-foreground">Distribution across operational asset categories</p>
              </div>
              <span className="badge badge-neutral">Equipment</span>
            </div>

            {loadingMetrics ? (
              <div className="h-[220px] bg-muted animate-pulse rounded" />
            ) : filteredFleetCats.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                No fleet equipment records found in database.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={filteredFleetCats} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
                  <Bar dataKey="count" name="Assets" radius={[3, 3, 0, 0]}>
                    {filteredFleetCats.map((entry, index) => (
                      <Cell key={`fc-cell-${entry.category}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Chart 2: Workforce Headcount by Department */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-700 text-foreground">Workforce Headcount by Department</p>
                <p className="text-xs text-muted-foreground">Staff distribution per organizational department</p>
              </div>
              <span className="badge badge-neutral">Workforce</span>
            </div>

            {loadingMetrics ? (
              <div className="h-[220px] bg-muted animate-pulse rounded" />
            ) : filteredWorkforceDepts.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                No department personnel records found in database.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={filteredWorkforceDepts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="department" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
                  <Bar dataKey="count" name="Employees" radius={[3, 3, 0, 0]}>
                    {filteredWorkforceDepts.map((entry, index) => (
                      <Cell key={`wd-cell-${entry.department}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Chart 3: Workforce Deployment per Operational Project */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-700 text-foreground">Workforce Deployment per Project</p>
                <p className="text-xs text-muted-foreground">Active personnel assigned to project sites</p>
              </div>
              <span className="badge badge-neutral">Deployment</span>
            </div>

            {loadingMetrics ? (
              <div className="h-[220px] bg-muted animate-pulse rounded" />
            ) : filteredWorkforceProjs.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                No project assignment records found in database.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={filteredWorkforceProjs} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="project" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
                  <Bar dataKey="count" name="Assigned Staff" radius={[3, 3, 0, 0]}>
                    {filteredWorkforceProjs.map((entry, index) => (
                      <Cell key={`wp-cell-${entry.project}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Chart 4: Inventory Valuation by Item Category */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-700 text-foreground">Inventory Stock Valuation by Category</p>
                <p className="text-xs text-muted-foreground">Total holding value in USD per item category</p>
              </div>
              <span className="badge badge-neutral">Inventory</span>
            </div>

            {loadingMetrics ? (
              <div className="h-[220px] bg-muted animate-pulse rounded" />
            ) : filteredInvCats.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                No inventory category valuation records found in database.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={filteredInvCats} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Valuation']}
                    cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                  />
                  <Bar dataKey="value" name="Valuation" radius={[3, 3, 0, 0]}>
                    {filteredInvCats.map((entry, index) => (
                      <Cell key={`ic-cell-${entry.category}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Chart 5: Equipment Defect Severity Breakdown */}
          <div className="card p-5 xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-700 text-foreground">Defect & Maintenance Risk Heatmap</p>
                <p className="text-xs text-muted-foreground">Open equipment defects classified by operational severity</p>
              </div>
              <span className="badge badge-warning">Defect Telemetry</span>
            </div>

            {loadingMetrics ? (
              <div className="h-[200px] bg-muted animate-pulse rounded" />
            ) : (di?.defects_by_severity || []).length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
                No active defect logs found in database for current scope.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={di?.defects_by_severity || []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="severity" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
                  <Bar dataKey="count" name="Open Defects" radius={[4, 4, 0, 0]}>
                    {(di?.defects_by_severity || []).map((entry, index) => (
                      <Cell
                        key={`def-cell-${entry.severity}-${index}`}
                        fill={entry.severity === 'Critical' ? '#DC2626' : entry.severity === 'High' ? '#D97706' : entry.severity === 'Medium' ? '#2563EB' : '#16A34A'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Site Operational Capacity & Risk Matrix Table */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-border">
            <div>
              <h3 className="text-sm font-700 text-foreground flex items-center gap-2">
                <MapPin size={17} className="text-primary" />
                <span>Site Operational Capacity & Risk Matrix</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comparative analytical breakdown of fleet equipment, active workforce, open defects, and stock valuation per site
              </p>
            </div>
            <span className="badge badge-neutral text-xs">
              {si?.total_active_sites ?? 0} Operational Sites
            </span>
          </div>

          {loadingMetrics ? (
            <div className="h-32 bg-muted animate-pulse rounded" />
          ) : (si?.site_capacity_breakdown || []).length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No active operational site telemetry available for current filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-600">
                    <th className="py-2.5 px-3">Site / Location Name</th>
                    <th className="py-2.5 px-3 text-center">Fleet Assets</th>
                    <th className="py-2.5 px-3 text-center">Assigned Workforce</th>
                    <th className="py-2.5 px-3 text-center">Open Defects</th>
                    <th className="py-2.5 px-3 text-right">Stock Valuation ($)</th>
                    <th className="py-2.5 px-3 text-center">Interactive Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-500">
                  {(si?.site_capacity_breakdown || []).map((site, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-700 text-foreground flex items-center gap-2">
                        <MapPin size={13} className="text-primary flex-shrink-0" />
                        <span>{site.site_name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="badge badge-neutral">{site.fleet_count} assets</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="badge badge-info">{site.workforce_count} staff</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {site.open_defects > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-2xs font-700 bg-rose-100 text-rose-800">
                            <AlertTriangle size={10} />
                            <span>{site.open_defects} open</span>
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-600">0 defects</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-700 text-foreground">
                        ${(site.stock_value || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setLocationId(site.site_id)}
                          className="px-2.5 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 text-xs font-600 transition-colors"
                        >
                          Filter Site
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Operational Efficiency & Cost Projections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0">
              <Fuel size={20} />
            </div>
            <div>
              <span className="text-2xs font-700 text-muted-foreground uppercase tracking-wider block">Est. Fuel Cost Projection</span>
              <span className="text-lg font-800 text-foreground block mt-0.5">
                ${(ea?.estimated_fuel_cost_usd ?? 0).toLocaleString()}
              </span>
              <span className="text-2xs text-muted-foreground">Based on logged consumption ($1.45/L)</span>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0">
              <Users size={20} />
            </div>
            <div>
              <span className="text-2xs font-700 text-muted-foreground uppercase tracking-wider block">Idle Workforce Personnel</span>
              <span className="text-lg font-800 text-foreground block mt-0.5">
                {ea?.workforce_idle_count ?? 0} staff available
              </span>
              <span className="text-2xs text-muted-foreground">Unassigned to active projects</span>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <Wrench size={20} />
            </div>
            <div>
              <span className="text-2xs font-700 text-muted-foreground uppercase tracking-wider block">Fleet Ready Availability</span>
              <span className="text-lg font-800 text-emerald-700 block mt-0.5">
                {ea?.fleet_availability_ratio ?? 0}% ready
              </span>
              <span className="text-2xs text-muted-foreground">Assets available for dispatch</span>
            </div>
          </div>
        </div>

        {/* Operational Telemetry Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fleet Status Breakdown */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-border">
              <div className="flex items-center gap-2">
                <Wrench size={17} className="text-primary" />
                <h3 className="text-sm font-700 text-foreground">Equipment Fleet Health Status</h3>
              </div>
              <span className="text-xs text-muted-foreground font-500">Asset Distribution</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-lg border bg-emerald-50/50 border-emerald-200">
                <span className="text-2xs font-700 text-emerald-700 uppercase tracking-wider block">Operating</span>
                <span className="text-xl font-800 text-emerald-800 mt-1 block">{fu?.operating ?? 0}</span>
                <span className="text-[11px] text-emerald-600 mt-0.5 block font-500">Assets in active operation</span>
              </div>

              <div className="p-3.5 rounded-lg border bg-blue-50/50 border-blue-200">
                <span className="text-2xs font-700 text-blue-700 uppercase tracking-wider block">Available</span>
                <span className="text-xl font-800 text-blue-800 mt-1 block">{fu?.available ?? 0}</span>
                <span className="text-[11px] text-blue-600 mt-0.5 block font-500">Ready for project dispatch</span>
              </div>

              <div className="p-3.5 rounded-lg border bg-amber-50/50 border-amber-200">
                <span className="text-2xs font-700 text-amber-700 uppercase tracking-wider block">Under Maintenance</span>
                <span className="text-xl font-800 text-amber-800 mt-1 block">{fu?.maintenance ?? 0}</span>
                <span className="text-[11px] text-amber-600 mt-0.5 block font-500">Service work orders in progress</span>
              </div>

              <div className="p-3.5 rounded-lg border bg-rose-50/50 border-rose-200">
                <span className="text-2xs font-700 text-rose-700 uppercase tracking-wider block">Breakdown</span>
                <span className="text-xl font-800 text-rose-800 mt-1 block">{fu?.breakdown ?? 0}</span>
                <span className="text-[11px] text-rose-600 mt-0.5 block font-500">Requires defect resolution</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={14} className={(fu?.critical_defects_count ?? fs?.critical_defects_count ?? 0) > 0 ? "text-rose-600 animate-pulse" : "text-emerald-600"} />
                <span className="font-600 text-foreground">Equipment Defect Telemetry:</span>
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{fu?.open_defects_count ?? fs?.open_defects_count ?? 0}</strong> open defects
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-2xs font-700 ${(fu?.critical_defects_count ?? fs?.critical_defects_count ?? 0) > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {fu?.critical_defects_count ?? fs?.critical_defects_count ?? 0} Critical
              </span>
            </div>
          </div>

          {/* Operational Delivery & Progress Bar */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-border">
              <div className="flex items-center gap-2">
                <FolderKanban size={17} className="text-primary" />
                <h3 className="text-sm font-700 text-foreground">Operational Target Progress</h3>
              </div>
              <span className="text-xs text-muted-foreground font-500">Telemetry</span>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <div className="flex justify-between text-xs font-600 mb-1">
                  <span>Drilling Meterage Completion</span>
                  <span className="text-primary font-700">{dp?.completion_pct ?? 0}%</span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(dp?.completion_pct ?? 0, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-600 mb-1">
                  <span>Workforce Active Deployment</span>
                  <span className="text-indigo-600 font-700">{wp?.deployment_rate_pct ?? 0}%</span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(wp?.deployment_rate_pct ?? 0, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-600 mb-1">
                  <span>Equipment Operating Ratio</span>
                  <span className="text-blue-600 font-700">{fu?.utilization_rate_pct ?? 0}%</span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(fu?.utilization_rate_pct ?? 0, 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  Active Clients: <strong className="text-foreground font-700">{fs?.total_clients ?? 0}</strong>
                </div>
                <div>
                  Maintenance Jobs:{' '}
                  <strong className="text-foreground font-700">{fs?.active_maintenance_jobs ?? 0}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Assistant Large Modal Popup */}
        {showAssistantModal && mounted && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in no-print">
            <div className="card w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] shadow-black/50 ring-1 ring-black/10 dark:ring-white/10 border border-primary/20 bg-card overflow-hidden z-[10000]">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border gradient-brand text-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Sparkles size={20} className="text-white fill-white/20" />
                  </div>
                  <div>
                    <h2 className="text-base font-800 text-white flex items-center gap-2">
                      <span>Smart Assistant</span>

                    </h2>
                    <p className="text-xs text-white/80">
                      Reasoning · Live DB metrics · Document Aware
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetHistory}
                    className="text-xs px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-600 transition-colors"
                  >
                    Reset History
                  </button>
                  <button
                    onClick={() => setShowAssistantModal(false)}
                    className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4 scrollbar-thin">
                {/* Suggested Prompts */}
                <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
                  {SUGGESTED_PROMPTS.map((promptText, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(promptText)}
                      disabled={sending}
                      className="text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-primary/10 hover:text-primary border border-border text-foreground font-500 transition-all text-left"
                    >
                      💡 {promptText}
                    </button>
                  ))}
                </div>

                {/* Messages List */}
                <div className="space-y-4">
                  {messages.map((msg, index) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div
                        key={index}
                        className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isUser ? 'bg-primary text-white' : 'gradient-brand text-white'
                          }`}
                        >
                          {isUser ? <UserIcon size={16} /> : <Bot size={16} />}
                        </div>

                        <div
                          className={`p-4 rounded-2xl text-xs leading-relaxed space-y-3 ${
                            isUser
                              ? 'bg-primary text-white rounded-tr-none' :'bg-card border border-border text-foreground shadow-sm rounded-tl-none'
                          }`}
                        >
                          {/* Tool Badges */}
                          {msg.tools_used && msg.tools_used.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-border/50">
                              {msg.tools_used.map((toolName, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-600 bg-primary/10 text-primary border border-primary/20"
                                >
                                  <Database size={10} />
                                  <span>{formatToolName(toolName)}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Markdown Response Text */}
                          {isUser ? (
                            <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                          ) : (
                            <MarkdownText content={msg.content} />
                          )}

                          {/* Actionable Play Button for Filter Application */}
                          {msg.suggested_filters && (
                            <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between flex-wrap gap-2">
                              <span className="text-[11px] text-muted-foreground font-500 flex items-center gap-1">
                                <Filter size={11} className="text-primary" />
                                Actionable Filter:{' '}
                                <strong className="text-foreground font-600">
                                  {msg.suggested_filters.project_name || msg.suggested_filters.label || 'Target Scope'}
                                </strong>
                              </span>
                              <button
                                onClick={() => handleApplyAssistantFilter(msg.suggested_filters!)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white font-700 text-xs hover:bg-primary/90 transition-all active:scale-95 shadow-sm"
                              >
                                <Play size={12} className="fill-white" />
                                <span>Apply Filter to Dashboard</span>
                              </button>
                            </div>
                          )}

                          {/* Vector Citations */}
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border space-y-2">
                              <span className="text-[11px] font-700 text-primary flex items-center gap-1">
                                <Search size={12} /> Cited Document Excerpts ({msg.citations.length}):
                              </span>
                              <div className="space-y-1.5">
                                {msg.citations.map((c, cIdx) => (
                                  <div key={cIdx} className="p-2 rounded bg-muted/50 border border-border/60 text-[11px]">
                                    <div className="flex items-center justify-between text-foreground font-600">
                                      <span>{c.document_title}</span>
                                      <span className="text-2xs text-muted-foreground">{c.location}</span>
                                    </div>
                                    <p className="text-2xs text-muted-foreground mt-1 line-clamp-2 italic">
                                      &quot;{c.snippet}&quot;
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Modal Footer / Input Bar */}
              <div className="p-4 border-t border-border bg-card flex items-center gap-2">
                <input
                  type="text"
                  className="flex-1 px-4 py-3 bg-muted/30 border border-border rounded-xl text-xs font-500 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Ask Smart Assistant about workforce, machinery, projects, inventory, or search documents..."
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={sending || !inputQuery.trim()}
                  className="btn-primary text-xs py-3 px-5 flex items-center gap-2 rounded-xl active:scale-95 disabled:opacity-50"
                >
                  {sending ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <>
                      <span>Ask Assistant</span>
                      <Send size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </AppLayout>
  );
}
