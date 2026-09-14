'use client';

import React, { useState, useMemo } from 'react';
import { Search, Play, Zap, Users, FolderKanban, Wrench, Package, ShieldCheck, Building2, Lock, PlusCircle, Clock, ArrowRightLeft, Fuel, Gauge, Receipt, Truck, DollarSign, UserPlus, Briefcase, MapPin, CheckCircle2, MinusCircle, SlidersHorizontal, Boxes, Tag, ClipboardCheck,  } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/components/AuthProvider';
import RecordForm from '@/components/RecordForm';
import AssetAssignmentModal from '@/components/AssetAssignmentModal';
import { operation } from '@/components/ResourceWorkspace';
import { Row } from '@/components/DataUI';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';


type CategoryKey = 'ALL' | 'WORKFORCE' | 'PROJECTS' | 'FLEET' | 'INVENTORY' | 'ADMIN';

interface CommandDef {
  id: string;
  title: string;
  description: string;
  category: CategoryKey;
  categoryName: string;
  permission: string;
  icon: React.ElementType;
  resource?: string;
  path?: string;
  method?: string;
  customModalType?: 'assignment' | null;
  tags: string[];
}

const COMMAND_REGISTRY: CommandDef[] = [
  // --- Workforce & HR ---
  {
    id: 'create-employee',
    title: 'Create Employee Profile',
    description: 'Register a new employee, set employment details, position, department, and contact information.',
    category: 'WORKFORCE',
    categoryName: 'Workforce & HR',
    permission: 'employees.create',
    icon: UserPlus,
    resource: 'employees',
    path: '/api/v1/employees',
    tags: ['employee', 'staff', 'add employee', 'register', 'personnel', 'hr', 'hire'],
  },
  {
    id: 'record-salary',
    title: 'Record Employee Salary & Compensation',
    description: 'Assign or update employee salary details, pay rate, pay period, currency, and effective start date.',
    category: 'WORKFORCE',
    categoryName: 'Workforce & HR',
    permission: 'employees.contracts.manage',
    icon: DollarSign,
    resource: 'hr/salaries',
    path: '/api/v1/hr/salaries',
    tags: ['salary', 'pay', 'compensation', 'wage', 'contract', 'payroll', 'hr'],
  },
  {
    id: 'record-timelog',
    title: 'Log Employee Attendance / Time',
    description: 'Record daily shift hours, overtime logs, and work activity hours for field personnel.',
    category: 'WORKFORCE',
    categoryName: 'Workforce & HR',
    permission: 'employees.manage',
    icon: Clock,
    resource: 'hr/time-logs',
    path: '/api/v1/hr/time-logs',
    tags: ['time', 'attendance', 'hours', 'clock', 'shift', 'timelog'],
  },
  {
    id: 'request-leave',
    title: 'Request Employee Leave',
    description: 'File an annual, sick, or rotation leave request for an employee.',
    category: 'WORKFORCE',
    categoryName: 'Workforce & HR',
    permission: 'employees.manage',
    icon: Users,
    resource: 'hr/leave-requests',
    path: '/api/v1/hr/leave-requests',
    tags: ['leave', 'vacation', 'time off', 'sick leave', 'rotation'],
  },
  {
    id: 'create-department',
    title: 'Create Department',
    description: 'Add a new organizational department within the company hierarchy.',
    category: 'WORKFORCE',
    categoryName: 'Workforce & HR',
    permission: 'departments.manage',
    icon: Building2,
    resource: 'departments',
    path: '/api/v1/departments',
    tags: ['department', 'unit', 'org', 'organization', 'structure'],
  },
  {
    id: 'create-position',
    title: 'Create Position / Job Title',
    description: 'Define a new employment position title, job classification, and rank.',
    category: 'WORKFORCE',
    categoryName: 'Workforce & HR',
    permission: 'positions.manage',
    icon: Briefcase,
    resource: 'positions',
    path: '/api/v1/positions',
    tags: ['position', 'role', 'title', 'job', 'rank'],
  },

  // --- Projects & Sites ---
  {
    id: 'create-project',
    title: 'Create Active Project',
    description: 'Initialize a new field operation project, assign project manager, location, and dates.',
    category: 'PROJECTS',
    categoryName: 'Projects & Sites',
    permission: 'projects.create',
    icon: FolderKanban,
    resource: 'projects',
    path: '/api/v1/projects',
    tags: ['project', 'new project', 'contract', 'site', 'operation', 'add project'],
  },
  {
    id: 'create-client',
    title: 'Register Client Company',
    description: 'Add a client enterprise profile, commercial contacts, and tax details.',
    category: 'PROJECTS',
    categoryName: 'Projects & Sites',
    permission: 'projects.manage',
    icon: Building2,
    resource: 'clients',
    path: '/api/v1/clients',
    tags: ['client', 'customer', 'company', 'partner', 'vendor'],
  },
  {
    id: 'create-location',
    title: 'Add Operating Location / Site',
    description: 'Define a physical work location, mining pit, camp site, or storage depot coordinates.',
    category: 'PROJECTS',
    categoryName: 'Projects & Sites',
    permission: 'projects.manage',
    icon: MapPin,
    resource: 'locations',
    path: '/api/v1/locations',
    tags: ['location', 'site', 'depot', 'coordinates', 'address', 'camp', 'pit'],
  },

  // --- Fleet & Equipment ---
  {
    id: 'register-asset',
    title: 'Register Fleet Equipment / Vehicle',
    description: 'Add heavy machinery, drill rig, vehicle, or tool to the equipment asset register.',
    category: 'FLEET',
    categoryName: 'Fleet & Equipment',
    permission: 'assets.create',
    icon: Wrench,
    resource: 'assets',
    path: '/api/v1/assets',
    tags: ['asset', 'equipment', 'vehicle', 'rig', 'drill', 'truck', 'machinery', 'add asset'],
  },
  {
    id: 'assign-asset',
    title: 'Assign Equipment to Project',
    description: 'Deploy an asset to a project site and assign primary operator personnel.',
    category: 'FLEET',
    categoryName: 'Fleet & Equipment',
    permission: 'assets.assignments.manage',
    icon: ArrowRightLeft,
    customModalType: 'assignment',
    tags: ['assign asset', 'equipment assignment', 'deploy', 'operator', 'fleet'],
  },
  {
    id: 'create-maintenance-log',
    title: 'Record Maintenance Log / Work Order',
    description: 'Log preventative maintenance, repair work order, or service completed on an asset.',
    category: 'FLEET',
    categoryName: 'Fleet & Equipment',
    permission: 'assets.logs.write',
    icon: Wrench,
    resource: 'maintenance/work-orders',
    path: '/api/v1/assets/maintenance-logs',
    tags: ['maintenance', 'repair', 'service', 'work order', 'breakdown', 'fix'],
  },
  {
    id: 'log-meter-reading',
    title: 'Log Equipment Meter / Odometer Reading',
    description: 'Record hour meter or mileage reading for usage tracking and maintenance scheduling.',
    category: 'FLEET',
    categoryName: 'Fleet & Equipment',
    permission: 'assets.logs.write',
    icon: Gauge,
    resource: 'assets/meter-readings',
    path: '/api/v1/assets/meter-readings',
    tags: ['meter', 'hour meter', 'odometer', 'usage', 'reading', 'hours'],
  },
  {
    id: 'record-fuel',
    title: 'Record Fuel Dispatch / Refueling',
    description: 'Log fuel liters delivered, cost, supplier, and meter reading at refueling.',
    category: 'FLEET',
    categoryName: 'Fleet & Equipment',
    permission: 'assets.logs.write',
    icon: Fuel,
    resource: 'fuel-logs',
    path: '/api/v1/assets/fuel-logs',
    tags: ['fuel', 'diesel', 'petrol', 'refuel', 'liters', 'consumption'],
  },
  {
    id: 'request-asset-transfer',
    title: 'Request Equipment Transfer',
    description: 'Initiate inter-site or inter-project transfer of heavy equipment or vehicles.',
    category: 'FLEET',
    categoryName: 'Fleet & Equipment',
    permission: 'assets.transfers.manage',
    icon: Truck,
    resource: 'assets/transfers',
    path: '/api/v1/assets/transfers',
    tags: ['transfer', 'equipment transfer', 'relocate', 'demobilize', 'mobilize'],
  },

  // --- Inventory & Supplies ---
  {
    id: 'pick-stock-item',
    title: 'Take / Pick Stock (-)',
    description: 'Report items taken or picked from inventory for project consumption, equipment maintenance, or employee use.',
    category: 'INVENTORY',
    categoryName: 'Inventory & Supplies',
    permission: 'inventory.manage',
    icon: MinusCircle,
    resource: 'inventory/issues',
    path: '/api/v1/inventory/issues',
    tags: ['pick', 'take stock', 'pick item', 'issue', 'stock out', 'consume', 'parts', 'tools', 'usage'],
  },
  {
    id: 'receive-stock-intake',
    title: 'Receive Stock Intake (+)',
    description: 'Record incoming vendor shipment, purchase order delivery, or stock intake to increase store quantities.',
    category: 'INVENTORY',
    categoryName: 'Inventory & Supplies',
    permission: 'inventory.manage',
    icon: PlusCircle,
    resource: 'inventory/receipts',
    path: '/api/v1/inventory/receipts',
    tags: ['receive', 'receipt', 'stock in', 'vendor', 'intake', 'delivery', 'grn', 'purchase order'],
  },
  {
    id: 'adjust-stock-count',
    title: 'Adjust Stock Count / Reconciliation',
    description: 'Reconcile recorded stock levels with actual physical counts, report damaged/broken goods, or quarantine holds.',
    category: 'INVENTORY',
    categoryName: 'Inventory & Supplies',
    permission: 'inventory.manage',
    icon: SlidersHorizontal,
    resource: 'inventory/adjustments',
    path: '/api/v1/inventory/adjustments',
    tags: ['adjust', 'reconcile', 'stock count', 'audit count', 'damage', 'loss', 'quarantine', 'variance'],
  },
  {
    id: 'create-stock-transfer',
    title: 'Transfer Inventory Stock',
    description: 'Transfer inventory stock between two warehouses, project site stores, or storage bins.',
    category: 'INVENTORY',
    categoryName: 'Inventory & Supplies',
    permission: 'inventory.manage',
    icon: ArrowRightLeft,
    resource: 'inventory/transfers',
    path: '/api/v1/inventory/transfers',
    tags: ['stock transfer', 'store transfer', 'relocate stock', 'move items', 'transfer'],
  },
  {
    id: 'issue-material-request',
    title: 'Create Material Requisition Request',
    description: 'Submit an internal request for items, spare parts, or consumables to be fulfilled from central store.',
    category: 'INVENTORY',
    categoryName: 'Inventory & Supplies',
    permission: 'inventory.manage',
    icon: Receipt,
    resource: 'inventory/requests',
    path: '/api/v1/inventory/requests',
    tags: ['request', 'material request', 'requisition', 'order', 'supplies'],
  },
  {
    id: 'create-item',
    title: 'Create Catalog Item',
    description: 'Add a new spare part, consumable, material, or tool to the inventory catalog.',
    category: 'INVENTORY',
    categoryName: 'Inventory & Supplies',
    permission: 'inventory.manage',
    icon: Package,
    resource: 'inventory/items',
    path: '/api/v1/inventory/items',
    tags: ['item', 'inventory', 'spare part', 'catalog', 'stock', 'supplies'],
  },
  {
    id: 'create-store',
    title: 'Create Store / Warehouse Facility',
    description: 'Register a central warehouse, field store, container, or yard location.',
    category: 'INVENTORY',
    categoryName: 'Inventory & Supplies',
    permission: 'inventory.manage',
    icon: Building2,
    resource: 'inventory/stores',
    path: '/api/v1/inventory/stores',
    tags: ['store', 'warehouse', 'depot', 'storage', 'facility', 'yard'],
  },
  {
    id: 'create-storage-bin',
    title: 'Add Storage Bin Location',
    description: 'Define a specific rack, shelf, bay, or bin code within a warehouse facility (e.g. BAY-01-A).',
    category: 'INVENTORY',
    categoryName: 'Inventory & Supplies',
    permission: 'inventory.manage',
    icon: Boxes,
    resource: 'inventory/bins',
    path: '/api/v1/inventory/bins',
    tags: ['bin', 'shelf', 'rack', 'storage location', 'bay', 'bin code', 'warehouse'],
  },
  {
    id: 'create-supplier',
    title: 'Register Supplier / Vendor',
    description: 'Add vendor details, supplier contacts, lead times, and unit purchase pricing.',
    category: 'INVENTORY',
    categoryName: 'Inventory & Supplies',
    permission: 'inventory.manage',
    icon: Truck,
    resource: 'inventory/suppliers',
    path: '/api/v1/inventory/suppliers',
    tags: ['supplier', 'vendor', 'contractor', 'pricing', 'lead time', 'purchase order'],
  },
  {
    id: 'create-unit-measure',
    title: 'Add Base Unit of Measure (UOM)',
    description: 'Define a base unit of measure (e.g. liters, kg, meters, boxes, pieces).',
    category: 'INVENTORY',
    categoryName: 'Inventory & Supplies',
    permission: 'inventory.manage',
    icon: Tag,
    resource: 'inventory/units',
    path: '/api/v1/inventory/units',
    tags: ['unit', 'uom', 'measure', 'liters', 'kg', 'boxes', 'pcs'],
  },
  {
    id: 'create-item-category',
    title: 'Add Item Category',
    description: 'Organize catalog items into functional categories (e.g. Lubricants, Mechanical Spares, PPE).',
    category: 'INVENTORY',
    categoryName: 'Inventory & Supplies',
    permission: 'inventory.manage',
    icon: FolderKanban,
    resource: 'inventory/categories',
    path: '/api/v1/inventory/categories',
    tags: ['category', 'classification', 'group', 'type', 'catalog'],
  },
  {
    id: 'initiate-stock-count',
    title: 'Initiate Physical Stock Audit',
    description: 'Launch a physical inventory audit or cycle count for a store location to reconcile stock.',
    category: 'INVENTORY',
    categoryName: 'Inventory & Supplies',
    permission: 'inventory.manage',
    icon: ClipboardCheck,
    resource: 'inventory/stock-counts',
    path: '/api/v1/inventory/stock-counts',
    tags: ['stock count', 'audit', 'cycle count', 'stocktake', 'reconciliation', 'inventory audit'],
  },

  // --- Administration & Security ---
  {
    id: 'create-role',
    title: 'Create Custom Security Role',
    description: 'Define a custom security role with granular permission toggles across system modules.',
    category: 'ADMIN',
    categoryName: 'Administration & System',
    permission: 'roles.manage',
    icon: ShieldCheck,
    resource: 'users/roles',
    path: '/api/v1/users/roles',
    tags: ['role', 'security', 'permission', 'rbac', 'access', 'admin', 'create role'],
  },
  {
    id: 'create-user',
    title: 'Register System User Account',
    description: 'Provision a login account for an employee and attach security roles.',
    category: 'ADMIN',
    categoryName: 'Administration & System',
    permission: 'users.manage',
    icon: UserPlus,
    resource: 'users',
    path: '/api/v1/users',
    tags: ['user', 'account', 'login', 'access', 'register user', 'admin'],
  },
];

const CATEGORIES: { key: CategoryKey; label: string; icon: React.ElementType }[] = [
  { key: 'ALL', label: 'All Commands', icon: Zap },
  { key: 'WORKFORCE', label: 'Workforce & HR', icon: Users },
  { key: 'PROJECTS', label: 'Projects & Sites', icon: FolderKanban },
  { key: 'FLEET', label: 'Fleet & Equipment', icon: Wrench },
  { key: 'INVENTORY', label: 'Inventory & Supplies', icon: Package },
  { key: 'ADMIN', label: 'Administration & System', icon: ShieldCheck },
];

export default function CommandCenterPage() {
  const auth = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('ALL');

  // Modal execution state
  const [activeCommand, setActiveCommand] = useState<CommandDef | null>(null);
  const [showAssetAssignment, setShowAssetAssignment] = useState(false);

  // Filter commands by search and category
  const filteredCommands = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return COMMAND_REGISTRY.filter((cmd) => {
      // Category match
      if (selectedCategory !== 'ALL' && cmd.category !== selectedCategory) {
        return false;
      }
      // Text query match
      if (!query) return true;
      const matchTitle = cmd.title.toLowerCase().includes(query);
      const matchDesc = cmd.description.toLowerCase().includes(query);
      const matchTags = cmd.tags.some((t) => t.toLowerCase().includes(query));
      const matchCat = cmd.categoryName.toLowerCase().includes(query);
      return matchTitle || matchDesc || matchTags || matchCat;
    });
  }, [searchQuery, selectedCategory]);

  const canRun = (cmd: CommandDef): boolean => {
    return auth.can(cmd.permission);
  };

  const authorizedCount = useMemo(() => {
    return COMMAND_REGISTRY.filter((c) => auth.can(c.permission)).length;
  }, [auth]);

  const handleRunCommand = (cmd: CommandDef) => {
    if (!canRun(cmd)) {
      toast.error(`Permission Required: ${cmd.permission}`);
      return;
    }

    if (cmd.customModalType === 'assignment') {
      setShowAssetAssignment(true);
      return;
    }

    if (cmd.path && cmd.resource) {
      setActiveCommand(cmd);
    }
  };

  const activeOp: Row | null = useMemo(() => {
    if (!activeCommand?.path) return null;
    const method = activeCommand.method || 'POST';
    return operation(activeCommand.path, method) || { title: activeCommand.title, properties: {} };
  }, [activeCommand]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Executive Header */}
        <div className="card p-6 gradient-brand text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Zap size={20} className="text-white fill-white/20" />
                </div>
                <span className="text-xs font-700 tracking-wider uppercase bg-white/10 px-2.5 py-0.5 rounded-full text-white/90">
                  Unified Action Center
                </span>
              </div>
              <h1 className="text-2xl font-800 text-white tracking-tight">Operations Command Center</h1>
              <p className="text-xs text-white/80 mt-1 max-w-2xl leading-relaxed">
                Discover and execute any operational action instantly. Role and permissions aware across Workforce, Projects, Fleet, Inventory, and Administration.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-3 rounded-lg border border-white/20 text-white text-xs">
              <div>
                <span className="block font-700 text-base">{COMMAND_REGISTRY.length}</span>
                <span className="text-white/70">Total Commands</span>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <span className="block font-700 text-base text-emerald-300">{authorizedCount}</span>
                <span className="text-white/70">Authorized to Run</span>
              </div>
            </div>
          </div>
        </div>

        {/* Command Search Bar */}
        <div className="card p-4 flex flex-col md:flex-row items-center gap-3 shadow-sm">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-lg text-sm font-500 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              placeholder="Search command or action (e.g. 'Add employee', 'Create project', 'Log maintenance', 'Transfer', 'Role')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-600"
              >
                Clear
              </button>
            )}
          </div>
          <div className="text-xs text-muted-foreground font-500 whitespace-nowrap">
            Showing <strong className="text-foreground font-700">{filteredCommands.length}</strong> commands
          </div>
        </div>

        {/* Main Grid: Category Sidebar + Command Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Command Category Sidebar */}
          <div className="card p-3 space-y-1 lg:sticky lg:top-6">
            <div className="px-3 py-2 text-2xs font-700 text-muted-foreground uppercase tracking-wider">
              Command Categories
            </div>
            {CATEGORIES.map((cat) => {
              const IconComponent = cat.icon;
              const isSelected = selectedCategory === cat.key;
              const count = cat.key === 'ALL'
                ? COMMAND_REGISTRY.length
                : COMMAND_REGISTRY.filter((c) => c.category === cat.key).length;

              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-600 transition-all ${
                    isSelected
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-foreground hover:bg-muted/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComponent size={16} className={isSelected ? 'text-white' : 'text-primary'} />
                    <span>{cat.label}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Commands List Area */}
          <div className="lg:col-span-3 space-y-4">
            {filteredCommands.length === 0 ? (
              <div className="card p-12 text-center space-y-3 border-dashed">
                <Zap size={32} className="mx-auto text-muted-foreground/50" />
                <h3 className="text-base font-700 text-foreground">No matching commands found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  No operational actions matched &quot;{searchQuery}&quot;. Try searching for terms like &quot;employee&quot;, &quot;asset&quot;, &quot;project&quot;, or &quot;maintenance&quot;.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                  }}
                  className="btn-secondary text-xs mt-2"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCommands.map((cmd) => {
                  const Icon = cmd.icon;
                  const authorized = canRun(cmd);

                  return (
                    <div
                      key={cmd.id}
                      className={`card p-5 flex flex-col justify-between transition-all border hover:shadow-md ${
                        authorized
                          ? 'hover:border-primary/40 bg-card' :'opacity-75 bg-muted/20 border-border/80'
                      }`}
                    >
                      <div>
                        {/* Header Badge Row */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="badge badge-secondary text-[10px] font-600 flex items-center gap-1">
                            <Icon size={12} className="text-primary" />
                            {cmd.categoryName}
                          </span>

                          {authorized ? (
                            <span className="badge badge-neutral text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              Ready
                            </span>
                          ) : (
                            <span className="badge badge-warning text-[10px] flex items-center gap-1">
                              <Lock size={11} />
                              Restricted
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            authorized ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                            <Icon size={18} />
                          </div>
                          <div>
                            <h3 className="text-sm font-700 text-foreground leading-snug">{cmd.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1 leading-normal line-clamp-2">
                              {cmd.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Footer Action Bar */}
                      <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-2">
                        <div className="text-[11px] text-muted-foreground truncate max-w-[180px]" title={`Permission: ${cmd.permission}`}>
                          <span className="font-500">Requires:</span>{' '}
                          <code className="text-[10px] bg-muted px-1 py-0.5 rounded text-foreground font-mono">{cmd.permission}</code>
                        </div>

                        <button
                          onClick={() => handleRunCommand(cmd)}
                          disabled={!authorized}
                          className={`btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 transition-transform active:scale-95 ${
                            !authorized ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground border-transparent' : ''
                          }`}
                          title={authorized ? `Execute ${cmd.title}` : `Requires ${cmd.permission} permission`}
                        >
                          {authorized ? (
                            <>
                              <Play size={13} className="fill-white" />
                              <span>Run Command</span>
                            </>
                          ) : (
                            <>
                              <Lock size={13} />
                              <span>Locked</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schema-driven Creation Form Modal */}
      {activeCommand && activeCommand.resource && activeCommand.path && activeOp && (
        <RecordForm
          resource={activeCommand.resource}
          operation={activeOp}
          path={activeCommand.path}
          method={activeCommand.method || 'POST'}
          title={activeCommand.title}
          onClose={() => setActiveCommand(null)}
          onSaved={() => {
            toast.success(`${activeCommand.title} completed successfully!`);
            setActiveCommand(null);
          }}
        />
      )}

      {/* Custom Asset Assignment Modal */}
      {showAssetAssignment && (
        <AssetAssignmentModal
          onClose={() => setShowAssetAssignment(false)}
          onSaved={() => {
            toast.success('Equipment assigned successfully!');
            setShowAssetAssignment(false);
          }}
        />
      )}
    </AppLayout>
  );
}
