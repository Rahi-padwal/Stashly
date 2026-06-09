"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

type Stats = {
  totalLinks: number;
  topDomains: { domain: string; count: number }[];
  topKeywords: { keyword: string; count: number }[];
  linksPerMonth: { month: string; count: number }[];
};

const PILL_COLORS = [
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-sky-100 text-sky-700 border-sky-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-pink-100 text-pink-700 border-pink-200",
  "bg-orange-100 text-orange-700 border-orange-200",
];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 truncate text-2xl font-bold text-slate-900" title={String(value)}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function MonthChart({ items }: { items: { month: string; count: number }[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="flex h-32 items-end justify-around gap-3 pt-2">
      {items.map(({ month, count }) => {
        const heightPct = Math.max(Math.round((count / max) * 100), 6);
        const label = new Date(`${month}-01`).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
        return (
          <div key={month} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs font-semibold text-indigo-600">{count}</span>
            <div className="flex h-20 w-full flex-col justify-end rounded-lg bg-slate-100">
              <div
                className="w-full rounded-lg bg-indigo-500"
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span className="text-xs text-slate-400">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function DomainList({ items }: { items: { domain: string; count: number }[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  const allSame = items.every((i) => i.count === items[0].count);

  if (allSame) {
    // All equal counts — show as ranked pill list, bars would be meaningless
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={item.domain}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${PILL_COLORS[i % PILL_COLORS.length]}`}
          >
            <span className="text-xs opacity-60">#{i + 1}</span>
            {item.domain}
          </span>
        ))}
      </div>
    );
  }

  // Different counts — show proportional bars
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const pct = Math.max(Math.round((item.count / max) * 100), 4);
        return (
          <div key={item.domain} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-right text-sm text-slate-500">
              {item.domain}
            </span>
            <div className="flex flex-1 items-center gap-2">
              <div
                className={`h-5 rounded-full ${PILL_COLORS[i % PILL_COLORS.length].split(" ")[0].replace("100", "500")} transition-all`}
                style={{ width: `${pct}%` }}
              />
              <span className="text-sm font-semibold text-slate-700">{item.count}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KeywordPills({ items }: { items: { keyword: string; count: number }[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => {
        const ratio = item.count / max;
        const sizeClass =
          ratio >= 0.8 ? "text-base px-4 py-2" : ratio >= 0.5 ? "text-sm px-3 py-1.5" : "text-xs px-3 py-1";
        return (
          <span
            key={item.keyword}
            className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClass} ${PILL_COLORS[i % PILL_COLORS.length]}`}
          >
            {item.keyword}
            {item.count > 1 && (
              <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-xs">{item.count}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token || !localStorage.getItem("userId")) {
      router.push("/auth");
      return;
    }
    fetch(`${API_BASE_URL}/links/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load stats.");
        return res.json() as Promise<Stats>;
      })
      .then(setStats)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load stats.")
      )
      .finally(() => setLoading(false));
  }, [router]);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const thisMonthEntry = stats?.linksPerMonth.find((m) => m.month === currentMonthKey);
  const thisMonthCount = thisMonthEntry?.count ?? 0;
  const uniqueDomains = stats?.topDomains.length ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Your Library
            </p>
            <h1 className="mt-0.5 text-2xl font-bold text-slate-900">Dashboard</h1>
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            ← Back
          </button>
        </header>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <p className="text-sm text-slate-400">Loading your stats...</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {stats && stats.totalLinks === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-slate-400">Save some links first and your stats will show up here.</p>
          </div>
        )}

        {stats && stats.totalLinks > 0 && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Total links" value={stats.totalLinks} />
              <StatCard label="Unique domains" value={uniqueDomains} sub="different sites" />
              <StatCard label="Saved this month" value={thisMonthCount} />
            </div>

            {stats.linksPerMonth.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold text-slate-700">
                  Activity — last 6 months
                </h2>
                <MonthChart items={stats.linksPerMonth} />
              </div>
            )}

            {stats.topDomains.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold text-slate-700">
                  Top domains
                </h2>
                <DomainList items={stats.topDomains} />
              </div>
            )}

            {stats.topKeywords.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold text-slate-700">
                  Top keywords
                </h2>
                <KeywordPills items={stats.topKeywords} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
