import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Cpu, Database, Gauge, HardDrive, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { getAdminMetric, getAdminMetricCatalog, getAdminReadiness } from '@/lib/api/endpoints';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FullPageLoader } from '@/components/ui/spinner';
import type { AdminMetric } from '@/lib/api/schemas';

const METRICS = [
  { name: 'process.uptime', label: 'Process uptime', icon: Activity, format: (metric: AdminMetric) => duration(value(metric, 'VALUE')) },
  { name: 'system.cpu.usage', label: 'System CPU', icon: Cpu, format: (metric: AdminMetric) => `${(value(metric, 'VALUE') * 100).toFixed(1)}%` },
  { name: 'jvm.memory.used', label: 'JVM memory used', icon: HardDrive, format: (metric: AdminMetric) => `${(value(metric, 'VALUE') / 1024 / 1024).toFixed(0)} MiB` },
  { name: 'jvm.threads.live', label: 'Live JVM threads', icon: Gauge, format: (metric: AdminMetric) => Math.round(value(metric, 'VALUE')).toLocaleString() },
  { name: 'jdbc.connections.active', label: 'Active DB connections', icon: Database, format: (metric: AdminMetric) => Math.round(value(metric, 'VALUE')).toLocaleString() },
  { name: 'http.server.requests', label: 'HTTP requests', icon: Server, format: (metric: AdminMetric) => Math.round(value(metric, 'COUNT')).toLocaleString() },
];

function value(metric: AdminMetric, statistic: string) { return metric.measurements.find((item) => item.statistic === statistic)?.value ?? 0; }
function duration(seconds: number) {
  const total = Math.floor(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function AdminSystemPage() {
  const queryClient = useQueryClient();
  const readiness = useQuery({ queryKey: ['admin', 'readiness'], queryFn: getAdminReadiness, refetchInterval: 15000, retry: false });
  const catalog = useQuery({ queryKey: ['admin', 'metric-catalog'], queryFn: getAdminMetricCatalog, refetchInterval: 60000, retry: false });
  const metrics = useQueries({ queries: METRICS.map((metric) => ({
    queryKey: ['admin', 'metric', metric.name], queryFn: () => getAdminMetric(metric.name), enabled: Boolean(catalog.data?.names.includes(metric.name)), retry: false, staleTime: 10000,
  })) });
  const ready = readiness.data?.status === 'UP';

  if (readiness.isLoading && catalog.isLoading) return <FullPageLoader label="Checking backend health…" />;

  return <div className="space-y-5">
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Service monitor</p><h2 className="mt-1 text-lg font-semibold text-ink">Backend readiness</h2><p className="mt-1 text-sm text-muted">Read-only health checks and runtime metrics from the Spring operations endpoints.</p></div><Button variant="outline" size="sm" onClick={() => { void queryClient.invalidateQueries({ queryKey: ['admin', 'readiness'] }); void queryClient.invalidateQueries({ queryKey: ['admin', 'metric'] }); }}><RefreshCw className="h-4 w-4" /> Refresh</Button></div>
      <div className={`mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 ${ready ? 'border-ok-line bg-ok-soft' : readiness.isError ? 'border-wl-line bg-wl-soft' : 'border-line bg-paper'}`}>
        <div className="flex items-center gap-3"><span className={`grid h-11 w-11 place-items-center rounded-xl ${ready ? 'bg-ok text-white' : readiness.isError ? 'bg-wl text-white' : 'bg-surface text-muted'}`}><ShieldCheck className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-ink">{ready ? 'Application and database ready' : readiness.isError ? 'Readiness check failed' : 'Checking service status'}</p><p className="mt-0.5 text-xs text-muted">{readiness.isError ? (readiness.error as Error).message : 'Spring Boot readiness probe'}</p></div></div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${ready ? 'bg-ok text-white' : 'bg-paper text-muted'}`}>{readiness.data?.status || (readiness.isError ? 'DOWN' : 'CHECKING')}</span>
      </div>
    </section>

    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="mb-4"><p className="eyebrow">Runtime</p><h2 className="mt-1 text-lg font-semibold text-ink">Live application metrics</h2><p className="mt-1 text-sm text-muted">Metrics are sampled from the running backend. Some meters appear after the service records activity.</p></div>
      {catalog.isError && <Alert tone="warning" title="Metrics are unavailable">The backend may not have metrics enabled, or the operations endpoint could not be reached.</Alert>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {METRICS.map((metric, index) => {
          const result = metrics[index];
          const Icon = metric.icon;
          return <article key={metric.name} className="rounded-xl border border-line bg-paper/60 p-4"><div className="flex items-center justify-between"><p className="text-xs font-medium text-muted">{metric.label}</p><Icon className="h-4 w-4 text-brand" /></div><p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{result?.data ? metric.format(result.data) : result?.isLoading ? '…' : '—'}</p><p className="mt-1 font-mono text-2xs text-muted">{metric.name}</p></article>;
        })}
      </div>
      <p className="mt-5 flex items-start gap-2 rounded-xl bg-brand-soft px-4 py-3 text-xs leading-5 text-body"><Activity className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> Prometheus scraping remains an infrastructure task. This page shows selected metrics for staff troubleshooting and does not expose secrets or runtime configuration.</p>
    </section>
  </div>;
}
