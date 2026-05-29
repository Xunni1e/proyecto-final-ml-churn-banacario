"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getCharts } from "@/lib/api";
import type { ChartData } from "@/lib/types";

const COLOR_SAFE = "#5a7a3a";
const COLOR_RISK = "#c44536";

export default function Charts() {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCharts()
      .then(setData)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-muted">Cargando datos del modelo…</p>;
  }

  if (error) {
    return (
      <p className="rounded-sm border border-risk/30 bg-risk/[0.06] px-3 py-2 text-sm text-risk">
        {error}
      </p>
    );
  }

  if (!data) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChurnDistribution data={data.churn_distribution} />
      <FeatureImportance data={data.feature_importance} />
    </div>
  );
}

/* ---------- Distribución de churn ---------- */

function ChurnDistribution({
  data,
}: {
  data: ChartData["churn_distribution"];
}) {
  const total = data.reduce((a, b) => a + b.value, 0);

  return (
    <section className="rounded-sm border border-border bg-surface p-8">
      <header className="mb-5">
        <h2 className="font-serif text-xl text-ink">Distribución de churn</h2>
        <p className="mt-1 text-sm text-muted">
          Composición del dataset de entrenamiento ({total.toLocaleString()}{" "}
          clientes).
        </p>
      </header>

      <div className="flex items-center gap-6">
        <div className="h-[220px] w-[220px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.label === "Churn" ? COLOR_RISK : COLOR_SAFE}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e8e3d7",
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="flex-1 space-y-3">
          {data.map((d) => {
            const pct = ((d.value / total) * 100).toFixed(1);
            const color = d.label === "Churn" ? COLOR_RISK : COLOR_SAFE;
            return (
              <li key={d.label} className="flex items-baseline gap-3">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <div>
                  <div className="text-sm text-ink">{d.label}</div>
                  <div className="font-mono text-xs text-muted">
                    {d.value.toLocaleString()} · {pct}%
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Importancia de variables ---------- */

function FeatureImportance({
  data,
}: {
  data: ChartData["feature_importance"];
}) {
  const max = Math.max(...data.map((d) => d.importance), 0.0001);

  return (
    <section className="rounded-sm border border-border bg-surface p-8">
      <header className="mb-5">
        <h2 className="font-serif text-xl text-ink">
          Importancia de variables
        </h2>
        <p className="mt-1 text-sm text-muted">
          Aporte de cada feature al modelo XGBoost (normalizado).
        </p>
      </header>

      <div className="space-y-2.5">
        {data.map((d) => (
          <div key={d.feature} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate font-mono text-xs text-ink">
              {d.feature}
            </span>
            <div className="relative h-2 flex-1 bg-paper">
              <div
                className="h-full bg-ink"
                style={{ width: `${(d.importance / max) * 100}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right font-mono text-xs text-muted tabular-nums">
              {(d.importance * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
