import {
  Project,
  TemplateBlueprint,
  WorkspaceSettings,
  ArchitectureModule,
  FrameworkTarget,
  ProjectSettings,
} from '../types/saz';

export const AVAILABLE_FRAMEWORKS: FrameworkTarget[] = [
  'React + TypeScript + Tailwind',
  'Next.js App Router',
  'Mobile PWA + Offline Sync',
  'Express + Full-Stack Node',
];

export const AVAILABLE_MODULES: {
  id: ArchitectureModule;
  label: string;
  description: string;
}[] = [
  {
    id: 'Responsive UI',
    label: 'Responsive UI',
    description: 'Thumb-zone mobile ergonomics with 1440px desktop expansion.',
  },
  {
    id: 'Authentication & RBAC',
    label: 'Authentication & RBAC',
    description: 'Session guards, role permissions, and protected workspace routes.',
  },
  {
    id: 'Relational Schema',
    label: 'Relational Schema',
    description: 'Typed data models, migrations, and query repositories.',
  },
  {
    id: 'REST & Webhook API',
    label: 'REST & Webhook API',
    description: 'Typed server endpoints with request validation and error boundaries.',
  },
  {
    id: 'Offline Storage',
    label: 'Offline Storage',
    description: 'IndexedDB & localStorage sync queue for resilient mobile usage.',
  },
  {
    id: 'Realtime Sync',
    label: 'Realtime Sync',
    description: 'Optimistic state mutations and multi-client event broadcasting.',
  },
];

export const PROMPT_SUGGESTIONS: {
  label: string;
  category: string;
  prompt: string;
  framework: FrameworkTarget;
  modules: ArchitectureModule[];
}[] = [
  {
    label: 'Calculator App',
    category: 'Tools & Utilities',
    prompt: 'Create a calculator app',
    framework: 'React + TypeScript + Tailwind',
    modules: ['Responsive UI', 'Offline Storage', 'Realtime Sync'],
  },
  {
    label: 'Field Inspection Mobile PWA',
    category: 'Mobile & Touch',
    prompt:
      'Build a mobile-first field inspection checklist app with site photo logging, pass/fail severity toggles, offline queue counter, and instant supervisor sign-off.',
    framework: 'Mobile PWA + Offline Sync',
    modules: ['Responsive UI', 'Offline Storage', 'Relational Schema'],
  },
  {
    label: 'Multi-Currency Treasury Desk',
    category: 'FinTech & Ledger',
    prompt:
      'Create a multi-currency cashflow & invoice reconciliation console with tabular ledger rows, approval state filters, and instant FX conversion calculator.',
    framework: 'React + TypeScript + Tailwind',
    modules: ['Responsive UI', 'Relational Schema', 'Authentication & RBAC'],
  },
  {
    label: 'Clinic Patient Intake Queue',
    category: 'SaaS & Operations',
    prompt:
      'Design a triage and patient check-in coordinator with live wait-time calculations, room assignment buttons, and priority status filtering.',
    framework: 'Next.js App Router',
    modules: ['Responsive UI', 'Realtime Sync', 'REST & Webhook API'],
  },
  {
    label: 'Inventory & Reorder Scanner',
    category: 'Commerce & Booking',
    prompt:
      'Build a warehouse stock monitor with low-stock threshold alerts, one-tap purchase order generation, and SKU search.',
    framework: 'Express + Full-Stack Node',
    modules: ['Responsive UI', 'Relational Schema', 'REST & Webhook API'],
  },
];

export const createDefaultProjectSettings = (overrides?: Partial<ProjectSettings>): ProjectSettings => ({
  version: '1.0.0',
  buildCommand: 'npm run build',
  devPort: 3000,
  mobileFirst: true,
  responsiveBreakpoint: '390px',
  envVariables: {
    NODE_ENV: 'development',
    API_PREFIX: '/api/v1',
  },
  allowPublicPreview: true,
  ...overrides,
});

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-kinetix-ops',
    name: 'Kinetix Field Dispatch',
    slug: 'kinetix-field-dispatch',
    summary: 'Mobile-first technician dispatch router with live SLA timers and checklist verification.',
    category: 'Mobile & Touch',
    framework: 'Mobile PWA + Offline Sync',
    modules: ['Responsive UI', 'Offline Storage', 'Realtime Sync'],
    status: 'Active',
    updatedAt: '2026-10-04T21:40:00Z',
    createdAt: '2026-10-01T14:20:00Z',
    starred: true,
    architectureNotes:
      'Thumb-zone bottom sheet controls paired with an offline-first local queue and optimistic dispatch status transitions.',
    settings: createDefaultProjectSettings({
      devPort: 3001,
      responsiveBreakpoint: '390px',
      envVariables: {
        DISPATCH_REGION: 'EU-CENTRAL',
        OFFLINE_STORAGE_VERSION: 'v2',
      },
    }),
    previewHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 font-sans min-h-screen p-4">
  <div class="max-w-xl mx-auto space-y-4">
    <header class="flex items-center justify-between border-b border-slate-800 pb-3">
      <div>
        <div class="text-xs text-amber-400 font-mono">Sector 04 · Munich North</div>
        <h1 class="text-lg font-bold">Kinetix Field Dispatch</h1>
      </div>
      <button id="newOrderBtn" class="px-3 py-2 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs">+ Dispatch Unit</button>
    </header>
    <div class="grid grid-cols-3 gap-2.5 text-center">
      <div class="p-3 rounded-xl border border-slate-800 bg-slate-900/50">
        <div class="text-xs text-slate-400">Open Orders</div>
        <div id="openCount" class="text-xl font-bold font-mono mt-0.5">4</div>
      </div>
      <div class="p-3 rounded-xl border border-slate-800 bg-slate-900/50">
        <div class="text-xs text-slate-400">On-Site SLA</div>
        <div class="text-xl font-bold font-mono text-emerald-400 mt-0.5">98.2%</div>
      </div>
      <div class="p-3 rounded-xl border border-slate-800 bg-slate-900/50">
        <div class="text-xs text-slate-400">Sync Queue</div>
        <div class="text-xl font-bold font-mono text-amber-400 mt-0.5">0</div>
      </div>
    </div>
    <div id="ordersList" class="space-y-2">
      <div class="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between">
        <div>
          <div class="text-sm font-medium">Substation Relay Calibration #409</div>
          <div class="text-xs text-slate-400">Bay 12 · ETA 14 mins · Tech: M. Weber</div>
        </div>
        <button onclick="this.textContent = this.textContent === 'En Route' ? 'Completed' : 'En Route'" class="px-2.5 py-1.5 rounded bg-slate-800 text-xs font-mono text-amber-400">En Route</button>
      </div>
      <div class="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between">
        <div>
          <div class="text-sm font-medium">Thermal Sensor Array Audit #410</div>
          <div class="text-xs text-slate-400">Sector B · Scheduled 15:30 · Tech: L. Chen</div>
        </div>
        <button onclick="this.textContent = this.textContent === 'Assigned' ? 'Completed' : 'Assigned'" class="px-2.5 py-1.5 rounded bg-slate-800 text-xs font-mono text-emerald-400">Assigned</button>
      </div>
    </div>
  </div>
  <script>
    let total = 4;
    document.getElementById('newOrderBtn').addEventListener('click', () => {
      total++;
      document.getElementById('openCount').textContent = String(total);
      const item = document.createElement('div');
      item.className = 'p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between';
      item.innerHTML = '<div><div class="text-sm font-medium">Rapid Field Check #' + (407 + total) + '</div><div class="text-xs text-slate-400">Dispatched just now · Priority Normal</div></div><button onclick="this.textContent = this.textContent === \\'En Route\\' ? \\'Completed\\' : \\'En Route\\'" class="px-2.5 py-1.5 rounded bg-slate-800 text-xs font-mono text-amber-400">En Route</button>';
      document.getElementById('ordersList').prepend(item);
    });
  </script>
</body>
</html>`,
    files: [
      {
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kinetix Field Dispatch</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="styles.css" />
</head>
<body class="bg-slate-950 text-slate-100 font-sans min-h-screen p-4 select-none">
  <div class="max-w-xl mx-auto space-y-4">
    <header class="flex items-center justify-between border-b border-slate-800 pb-3">
      <div>
        <div class="text-xs text-amber-400 font-mono">Sector 04 · Munich North</div>
        <h1 class="text-lg font-bold">Kinetix Field Dispatch</h1>
      </div>
      <button id="newOrderBtn" class="px-3 py-2 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs hover:bg-amber-400 cursor-pointer transition-colors">+ Dispatch Unit</button>
    </header>
    <div class="grid grid-cols-3 gap-2.5 text-center">
      <div class="p-3 rounded-xl border border-slate-800 bg-slate-900/50">
        <div class="text-xs text-slate-400">Open Orders</div>
        <div id="openCount" class="text-xl font-bold font-mono mt-0.5">4</div>
      </div>
      <div class="p-3 rounded-xl border border-slate-800 bg-slate-900/50">
        <div class="text-xs text-slate-400">On-Site SLA</div>
        <div class="text-xl font-bold font-mono text-emerald-400 mt-0.5">98.2%</div>
      </div>
      <div class="p-3 rounded-xl border border-slate-800 bg-slate-900/50">
        <div class="text-xs text-slate-400">Sync Queue</div>
        <div id="syncCount" class="text-xl font-bold font-mono text-amber-400 mt-0.5">0</div>
      </div>
    </div>
    <div id="ordersList" class="space-y-2">
      <div class="order-card p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between">
        <div>
          <div class="text-sm font-medium">Substation Relay Calibration #409</div>
          <div class="text-xs text-slate-400">Bay 12 · ETA 14 mins · Tech: M. Weber</div>
        </div>
        <button class="status-btn px-2.5 py-1.5 rounded bg-slate-800 text-xs font-mono text-amber-400">En Route</button>
      </div>
      <div class="order-card p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between">
        <div>
          <div class="text-sm font-medium">Thermal Sensor Array Audit #410</div>
          <div class="text-xs text-slate-400">Sector B · Scheduled 15:30 · Tech: L. Chen</div>
        </div>
        <button class="status-btn px-2.5 py-1.5 rounded bg-slate-800 text-xs font-mono text-emerald-400">Assigned</button>
      </div>
    </div>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      },
      {
        path: 'styles.css',
        language: 'css',
        content: `/* Kinetix Custom Field Dispatch Styles */
.order-card {
  transition: transform 0.15s ease, border-color 0.15s ease;
}
.order-card:hover {
  border-color: rgba(245, 158, 11, 0.4);
}
.status-btn {
  transition: background-color 0.15s ease;
}
.status-btn:active {
  transform: scale(0.96);
}
`,
      },
      {
        path: 'app.js',
        language: 'js',
        content: `// Kinetix Dispatch Runtime Controller
console.log('[Kinetix Dispatch] Initializing Field Dispatch controller...');

let orderTotal = 4;
const newBtn = document.getElementById('newOrderBtn');
const openCountEl = document.getElementById('openCount');
const syncCountEl = document.getElementById('syncCount');
const ordersList = document.getElementById('ordersList');

function setupStatusButtons() {
  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.onclick = () => {
      if (btn.textContent === 'Assigned') {
        btn.textContent = 'En Route';
        btn.className = 'status-btn px-2.5 py-1.5 rounded bg-amber-500/20 text-xs font-mono text-amber-400';
        console.log('[Kinetix] Order updated to En Route');
      } else if (btn.textContent === 'En Route') {
        btn.textContent = 'Completed';
        btn.className = 'status-btn px-2.5 py-1.5 rounded bg-emerald-500/20 text-xs font-mono text-emerald-400';
        console.log('[Kinetix] Order marked as Completed');
      } else {
        btn.textContent = 'Assigned';
        btn.className = 'status-btn px-2.5 py-1.5 rounded bg-slate-800 text-xs font-mono text-slate-400';
      }
    };
  });
}

setupStatusButtons();

if (newBtn && ordersList && openCountEl) {
  newBtn.addEventListener('click', () => {
    orderTotal++;
    openCountEl.textContent = String(orderTotal);
    if (syncCountEl) {
      syncCountEl.textContent = String(parseInt(syncCountEl.textContent || '0', 10) + 1);
    }
    
    const newCard = document.createElement('div');
    newCard.className = 'order-card p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between';
    newCard.innerHTML = \`
      <div>
        <div class="text-sm font-medium">Rapid Response Unit #\${407 + orderTotal}</div>
        <div class="text-xs text-slate-400">Priority Dispatch · Allocated Just Now</div>
      </div>
      <button class="status-btn px-2.5 py-1.5 rounded bg-amber-500/20 text-xs font-mono text-amber-400">En Route</button>
    \`;
    ordersList.prepend(newCard);
    setupStatusButtons();
    console.info('[Kinetix Dispatch] Dispatched Unit #', 407 + orderTotal);
  });
}
`,
      },
      {
        path: 'src/App.tsx',
        language: 'tsx',
        content: `import React, { useState } from 'react';

export default function KinetixDispatchApp() {
  const [orders, setOrders] = useState([
    { id: '409', title: 'Substation Relay Calibration', bay: 'Bay 12', status: 'En Route' },
    { id: '410', title: 'Thermal Sensor Array Audit', bay: 'Sector B', status: 'Assigned' },
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4">
      <h1 className="text-lg font-bold">Kinetix Field Dispatch</h1>
      <div className="mt-4 space-y-2">
        {orders.map((o) => (
          <div key={o.id} className="p-3.5 rounded-xl border border-slate-800 flex justify-between">
            <span>{o.title}</span>
            <span className="font-mono text-xs text-amber-400">{o.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
`,
      },
      {
        path: 'src/sync/offlineQueue.ts',
        language: 'ts',
        content: `export interface DispatchMutation {
  orderId: string;
  nextStatus: 'Assigned' | 'En Route' | 'Completed';
  queuedAt: number;
}

export const syncQueue: DispatchMutation[] = [];
`,
      },
    ],
    promptHistory: [
      {
        id: 'turn-1',
        prompt: 'Build a mobile-first technician dispatch router with live SLA timers and checklist verification.',
        timestamp: '2026-10-04T21:40:00Z',
        summary: 'Generated Kinetix Field Dispatch with offline sync queue and interactive status toggles.',
      },
    ],
  },
  {
    id: 'proj-meridian-ledger',
    name: 'Meridian Treasury Ledger',
    slug: 'meridian-treasury-ledger',
    summary: 'B2B invoice reconciliation console with multi-currency settlement and audit trail export.',
    category: 'FinTech & Ledger',
    framework: 'React + TypeScript + Tailwind',
    modules: ['Responsive UI', 'Relational Schema', 'Authentication & RBAC'],
    status: 'Active',
    updatedAt: '2026-10-04T18:15:00Z',
    createdAt: '2026-09-29T09:00:00Z',
    starred: true,
    architectureNotes:
      'Strict tabular-nums ledger layout with role-based settlement approvals and deterministic currency rounding.',
    settings: createDefaultProjectSettings({
      devPort: 3002,
      responsiveBreakpoint: '768px',
      envVariables: {
        CURRENCY_BASE: 'EUR',
        AUDIT_LOG_ENABLED: 'true',
      },
    }),
    previewHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 font-sans min-h-screen p-5">
  <div class="max-w-2xl mx-auto space-y-5">
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <div>
        <div class="text-xs text-slate-400 font-mono">Q4 Settlement Cycle · EUR / USD</div>
        <h1 class="text-lg font-bold">Meridian Treasury Ledger</h1>
      </div>
      <button id="approveAllBtn" class="px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs">Approve Pending</button>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40">
        <div class="text-xs text-slate-400">Cleared Volume (30d)</div>
        <div class="text-xl font-bold font-mono mt-1">$1,482,900.00</div>
      </div>
      <div class="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40">
        <div class="text-xs text-slate-400">Pending Invoices</div>
        <div id="pendingStat" class="text-xl font-bold font-mono text-amber-400 mt-1">2</div>
      </div>
    </div>
    <div class="border border-slate-800 rounded-xl overflow-hidden">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-900 text-slate-400 border-b border-slate-800">
          <tr>
            <th class="p-3">Counterparty</th>
            <th class="p-3">Reference</th>
            <th class="p-3 text-right">Amount</th>
            <th class="p-3 text-right">State</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800 font-mono" id="ledgerBody">
          <tr>
            <td class="p-3 font-sans font-medium">Nordic Components GmbH</td>
            <td class="p-3 text-slate-400">INV-8821</td>
            <td class="p-3 text-right">$42,500.00</td>
            <td class="p-3 text-right text-amber-400 status-cell">Pending</td>
          </tr>
          <tr>
            <td class="p-3 font-sans font-medium">Aether Cloud Systems</td>
            <td class="p-3 text-slate-400">INV-8822</td>
            <td class="p-3 text-right">$18,920.00</td>
            <td class="p-3 text-right text-amber-400 status-cell">Pending</td>
          </tr>
          <tr>
            <td class="p-3 font-sans font-medium">Vanguard Freight Ltd</td>
            <td class="p-3 text-slate-400">INV-8819</td>
            <td class="p-3 text-right">$94,100.00</td>
            <td class="p-3 text-right text-emerald-400">Settled</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <script>
    document.getElementById('approveAllBtn').addEventListener('click', () => {
      document.querySelectorAll('.status-cell').forEach(el => {
        el.textContent = 'Settled';
        el.className = 'p-3 text-right text-emerald-400';
      });
      document.getElementById('pendingStat').textContent = '0';
    });
  </script>
</body>
</html>`,
    files: [
      {
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meridian Treasury Ledger</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="styles.css" />
</head>
<body class="bg-slate-950 text-slate-100 font-sans min-h-screen p-5">
  <div class="max-w-2xl mx-auto space-y-5">
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <div>
        <div class="text-xs text-slate-400 font-mono">Q4 Settlement Cycle · EUR / USD</div>
        <h1 class="text-lg font-bold">Meridian Treasury Ledger</h1>
      </div>
      <button id="approveAllBtn" class="px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400 cursor-pointer transition-colors">Approve Pending</button>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40">
        <div class="text-xs text-slate-400">Cleared Volume (30d)</div>
        <div id="clearedVolume" class="text-xl font-bold font-mono mt-1">$1,482,900.00</div>
      </div>
      <div class="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40">
        <div class="text-xs text-slate-400">Pending Invoices</div>
        <div id="pendingStat" class="text-xl font-bold font-mono text-amber-400 mt-1">2</div>
      </div>
    </div>
    <div class="border border-slate-800 rounded-xl overflow-hidden">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-900 text-slate-400 border-b border-slate-800">
          <tr>
            <th class="p-3">Counterparty</th>
            <th class="p-3">Reference</th>
            <th class="p-3 text-right">Amount</th>
            <th class="p-3 text-right">State</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800 font-mono" id="ledgerBody">
          <tr>
            <td class="p-3 font-sans font-medium">Nordic Components GmbH</td>
            <td class="p-3 text-slate-400">INV-8821</td>
            <td class="p-3 text-right">$42,500.00</td>
            <td class="p-3 text-right text-amber-400 status-cell">Pending</td>
          </tr>
          <tr>
            <td class="p-3 font-sans font-medium">Aether Cloud Systems</td>
            <td class="p-3 text-slate-400">INV-8822</td>
            <td class="p-3 text-right">$18,920.00</td>
            <td class="p-3 text-right text-amber-400 status-cell">Pending</td>
          </tr>
          <tr>
            <td class="p-3 font-sans font-medium">Vanguard Freight Ltd</td>
            <td class="p-3 text-slate-400">INV-8819</td>
            <td class="p-3 text-right">$94,100.00</td>
            <td class="p-3 text-right text-emerald-400">Settled</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      },
      {
        path: 'styles.css',
        language: 'css',
        content: `/* Meridian Treasury Custom Table Styles */
table {
  font-variant-numeric: tabular-nums;
}
.status-cell {
  font-weight: 600;
}
`,
      },
      {
        path: 'app.js',
        language: 'js',
        content: `// Meridian Treasury Settlement Logic
console.info('[Meridian] Treasury Ledger runtime active.');

const approveBtn = document.getElementById('approveAllBtn');
if (approveBtn) {
  approveBtn.addEventListener('click', () => {
    const pendingCells = document.querySelectorAll('.status-cell');
    pendingCells.forEach(el => {
      el.textContent = 'Settled';
      el.className = 'p-3 text-right text-emerald-400 font-semibold';
    });
    
    const pendingStat = document.getElementById('pendingStat');
    if (pendingStat) pendingStat.textContent = '0';
    
    console.log('[Meridian] Approved all pending settlements (2 invoices transitioned).');
  });
}
`,
      },
      {
        path: 'src/LedgerTable.tsx',
        language: 'tsx',
        content: `import React from 'react';

export function LedgerTable() {
  return (
    <div className="border border-slate-800 rounded-xl p-4 font-mono tabular-nums">
      Meridian Treasury Ledger Component
    </div>
  );
}
`,
      },
    ],
    promptHistory: [
      {
        id: 'turn-2',
        prompt: 'Create a B2B invoice reconciliation console with multi-currency settlement.',
        timestamp: '2026-10-04T18:15:00Z',
        summary: 'Created Meridian Treasury Ledger with batch approval handler.',
      },
    ],
  },
  {
    id: 'proj-pulse-intake',
    name: 'Pulse Clinic Triage',
    slug: 'pulse-clinic-triage',
    summary: 'Outpatient intake and examination room coordinator with live wait-time telemetry.',
    category: 'SaaS & Operations',
    framework: 'Next.js App Router',
    modules: ['Responsive UI', 'Realtime Sync', 'REST & Webhook API'],
    status: 'Draft',
    updatedAt: '2026-10-03T11:05:00Z',
    createdAt: '2026-09-25T16:45:00Z',
    starred: false,
    architectureNotes:
      'Server-driven room status board with mobile tablet check-in view and HIPAA-ready audit boundary.',
    settings: createDefaultProjectSettings({
      devPort: 3003,
      responsiveBreakpoint: '390px',
      envVariables: {
        TRIAGE_STATION: 'STATION_A',
      },
    }),
    previewHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 font-sans min-h-screen p-5">
  <div class="max-w-xl mx-auto space-y-4">
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <h1 class="text-lg font-bold">Pulse Clinic Triage</h1>
      <span class="text-xs font-mono text-emerald-400">Avg Wait: 08m</span>
    </div>
    <div class="space-y-2">
      <div class="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 flex justify-between items-center">
        <div>
          <div class="text-sm font-medium">Exam Room 01 · Cardiology</div>
          <div class="text-xs text-slate-400">Dr. Aris Thorne · Patient Checked In</div>
        </div>
        <span class="text-xs font-mono text-amber-400">In Session</span>
      </div>
      <div class="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 flex justify-between items-center">
        <div>
          <div class="text-sm font-medium">Exam Room 02 · General Triage</div>
          <div class="text-xs text-slate-400">Sanitized · Ready for next intake</div>
        </div>
        <span class="text-xs font-mono text-emerald-400">Available</span>
      </div>
    </div>
  </div>
</body>
</html>`,
    files: [
      {
        path: 'app/page.tsx',
        language: 'tsx',
        content: `export default function TriagePage() {
  return <main className="p-6">Pulse Clinic Triage Board</main>;
}
`,
      },
    ],
    promptHistory: [
      {
        id: 'turn-3',
        prompt: 'Outpatient intake and examination room coordinator.',
        timestamp: '2026-10-03T11:05:00Z',
        summary: 'Scaffolded room coordinator view.',
      },
    ],
  },
];

export const INITIAL_TEMPLATES: TemplateBlueprint[] = [
  {
    id: 'tpl-mobile-habit-tracker',
    name: 'Offline-First Field & Habit Tracker',
    category: 'Mobile & Touch',
    summary: 'Thumb-zone mobile PWA with bottom tab navigation, daily streak rings, and local storage sync.',
    framework: 'Mobile PWA + Offline Sync',
    modules: ['Responsive UI', 'Offline Storage'],
    estimatedSetup: '30 sec synthesis',
    architectureNotes:
      'Designed for 375px–430px viewports with 44px minimum touch targets, bottom sheet drawers, and zero-latency local persistence.',
    defaultPrompt:
      'Build a mobile-first daily field & habit tracker with interactive completion toggles, streak counter, and quick note entry.',
    previewHtml: INITIAL_PROJECTS[0].previewHtml,
    files: INITIAL_PROJECTS[0].files,
  },
  {
    id: 'tpl-saas-revenue-cockpit',
    name: 'B2B Treasury & Invoice Console',
    category: 'FinTech & Ledger',
    summary: 'High-density financial ledger with tabular numerals, batch approvals, and multi-currency filters.',
    framework: 'React + TypeScript + Tailwind',
    modules: ['Responsive UI', 'Relational Schema', 'Authentication & RBAC'],
    estimatedSetup: '45 sec synthesis',
    architectureNotes:
      'Single-elevation surface hierarchy with tabular-nums alignment, keyboard shortcut hooks, and CSV export pipeline.',
    defaultPrompt:
      'Create a B2B treasury and invoice reconciliation console with batch settlement approval and currency filter tabs.',
    previewHtml: INITIAL_PROJECTS[1].previewHtml,
    files: INITIAL_PROJECTS[1].files,
  },
  {
    id: 'tpl-ops-triage-queue',
    name: 'Live Operations & Triage Queue',
    category: 'SaaS & Operations',
    summary: 'Real-time service desk queue with room/agent assignment, SLA countdowns, and intake forms.',
    framework: 'Next.js App Router',
    modules: ['Responsive UI', 'Realtime Sync', 'REST & Webhook API'],
    estimatedSetup: '40 sec synthesis',
    architectureNotes:
      'Event-driven queue store with optimistic UI mutations and modular webhook notification triggers.',
    defaultPrompt:
      'Design a live operations and clinic triage queue with room status assignments and wait-time tracking.',
    previewHtml: INITIAL_PROJECTS[2].previewHtml,
    files: INITIAL_PROJECTS[2].files,
  },
  {
    id: 'tpl-commerce-inventory',
    name: 'Warehouse SKU & Reorder Engine',
    category: 'Commerce & Booking',
    summary: 'Stock level monitor with threshold alerts, barcode-ready SKU search, and one-tap supplier PO generation.',
    framework: 'Express + Full-Stack Node',
    modules: ['Responsive UI', 'Relational Schema', 'REST & Webhook API'],
    estimatedSetup: '45 sec synthesis',
    architectureNotes:
      'Full-stack Express + React architecture with RESTful inventory endpoints and transactional stock adjustments.',
    defaultPrompt:
      'Build a warehouse SKU inventory tracker with low-stock filters, quantity adjustment buttons, and purchase order generator.',
    previewHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 font-sans min-h-screen p-5">
  <div class="max-w-xl mx-auto space-y-4">
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <h1 class="text-lg font-bold">Warehouse SKU & Reorder Engine</h1>
      <span class="text-xs font-mono text-amber-400">3 Low-Stock Alerts</span>
    </div>
    <div class="space-y-2 font-mono text-xs">
      <div class="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 flex justify-between items-center">
        <div>
          <div class="font-sans text-sm font-medium">Brushless Servo Actuator 24V</div>
          <div class="text-slate-400">SKU-9041 · Bin A-14 · Qty: 6</div>
        </div>
        <button onclick="this.textContent='PO Sent ✓'" class="px-3 py-1.5 rounded bg-amber-500 text-slate-950 font-sans font-semibold">Reorder +50</button>
      </div>
    </div>
  </div>
</body>
</html>`,
    files: [
      {
        path: 'src/InventoryApp.tsx',
        language: 'tsx',
        content: `export default function InventoryApp() {
  return <div className="p-6">Warehouse SKU & Reorder Engine</div>;
}
`,
      },
    ],
  },
  {
    id: 'tpl-devtools-webhook-inspector',
    name: 'API & Webhook Payload Inspector',
    category: 'Developer Tools',
    summary: 'Inspect, replay, and validate incoming webhook payloads with schema diffing and latency metrics.',
    framework: 'Express + Full-Stack Node',
    modules: ['Responsive UI', 'REST & Webhook API', 'Realtime Sync'],
    estimatedSetup: '35 sec synthesis',
    architectureNotes:
      'Structured JSON payload tree viewer with one-click request replay and signature verification helpers.',
    defaultPrompt:
      'Build an API and webhook payload inspector with request replay buttons, status code filter, and JSON body viewer.',
    previewHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 font-sans min-h-screen p-5">
  <div class="max-w-xl mx-auto space-y-4">
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <h1 class="text-lg font-bold">Webhook Payload Inspector</h1>
      <span class="text-xs font-mono text-emerald-400">200 OK · 18ms</span>
    </div>
    <pre class="p-4 rounded-xl border border-slate-800 bg-slate-900 text-xs font-mono text-amber-300 overflow-x-auto">{
  "event": "invoice.settled",
  "webhookId": "wh_99281a",
  "verified": true
}</pre>
  </div>
</body>
</html>`,
    files: [
      {
        path: 'src/WebhookInspector.tsx',
        language: 'tsx',
        content: `export default function WebhookInspector() {
  return <div className="p-6 font-mono">Webhook Payload Inspector</div>;
}
`,
      },
    ],
  },
];

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  workspaceName: 'SAZ Core Studio',
  builderHandle: '@saz-architect',
  defaultFramework: 'React + TypeScript + Tailwind',
  defaultModules: ['Responsive UI', 'Relational Schema', 'REST & Webhook API'],
  autoOpenStudioOnBuild: true,
  mobilePreviewDefault: false,
  codeFormatting: '2-spaces',
  strictTypeChecking: true,
  telemetryOptIn: false,
  themeMode: 'dark',
};
