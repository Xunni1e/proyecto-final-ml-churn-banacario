"use client";

import { useRef, useState } from "react";
import { predictBatch } from "@/lib/api";
import type { BatchPredictionResponse, BatchPredictionRow } from "@/lib/types";

const REQUIRED_COLS = [
  "credit_score",
  "age",
  "tenure",
  "balance",
  "products_number",
  "credit_card",
  "active_member",
  "estimated_salary",
];

export default function BatchPrediction() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<BatchPredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await predictBatch(file);
      setData(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    if (!data) return;
    const headers = [...REQUIRED_COLS, "probability", "churn"];
    const lines = [headers.join(",")];
    for (const r of data.rows) {
      const row = r as unknown as Record<string, number | boolean>;
      lines.push(
        headers
          .map((h) => (h === "churn" ? (r.churn ? 1 : 0) : row[h]))
          .join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "predicciones.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Upload */}
      <section className="rounded-sm border border-border bg-surface p-8">
        <header className="mb-5">
          <h2 className="font-serif text-xl text-ink">Carga de archivo</h2>
          <p className="mt-1 text-sm text-muted">
            CSV con las 8 columnas del modelo. Orden indiferente; el backend
            reordena al orden del entrenamiento.
          </p>
          <p className="mt-2 font-mono text-[11px] text-muted">
            {REQUIRED_COLS.join(" · ")}
          </p>
        </header>

        <div
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-sm border-2 border-dashed border-border bg-paper px-4 py-10 text-center transition hover:border-ink/40"
        >
          <span className="font-mono text-sm text-ink">
            {file ? file.name : "Seleccionar archivo CSV"}
          </span>
          <span className="text-xs text-muted">o arrastra aquí el archivo</span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={upload}
            disabled={!file || loading}
            className="rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:opacity-90 disabled:opacity-40"
          >
            {loading ? "Procesando…" : "Predecir lote"}
          </button>
          {data && (
            <button
              onClick={exportCsv}
              className="rounded-sm border border-border px-5 py-2.5 text-sm text-ink transition hover:bg-paper"
            >
              Exportar resultados (CSV)
            </button>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-sm border border-risk/30 bg-risk/[0.06] px-3 py-2 text-sm text-risk">
            {error}
          </p>
        )}
      </section>

      {/* Resumen + tabla */}
      {data && (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total" value={data.total.toLocaleString()} />
            <Stat
              label="Con churn"
              value={data.churn_count.toLocaleString()}
              accent="risk"
            />
            <Stat
              label="Tasa de churn"
              value={`${Math.round((data.churn_count / data.total) * 100)}%`}
            />
            <Stat label="Umbral" value={data.threshold.toFixed(2)} mono />
          </section>

          <section className="overflow-hidden rounded-sm border border-border bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs">
                <thead className="border-b border-border text-[11px] uppercase tracking-wider text-muted">
                  <tr>
                    {[
                      "#",
                      "score",
                      "edad",
                      "años",
                      "saldo",
                      "prod",
                      "tc",
                      "activo",
                      "salario",
                      "prob",
                      "predicción",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-3 text-left font-normal"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <Row key={r.row_id} r={r} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: string;
  accent?: "risk";
  mono?: boolean;
}) {
  return (
    <div className="rounded-sm border border-border bg-surface p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <div
        className={`mt-1 ${mono ? "font-mono" : "font-serif"} text-2xl ${
          accent === "risk" ? "text-risk" : "text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// Mismos hex que las CSS vars --color-risk / --color-safe.
const ACCENT = { risk: "#c44536", safe: "#5a7a3a" };

function Row({ r }: { r: BatchPredictionRow }) {
  const color = r.churn ? ACCENT.risk : ACCENT.safe;
  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-paper/60">
      <td className="px-3 py-2.5 text-muted">{r.row_id}</td>
      <td className="px-3 py-2.5 text-ink">{r.credit_score}</td>
      <td className="px-3 py-2.5 text-ink">{r.age}</td>
      <td className="px-3 py-2.5 text-ink">{r.tenure}</td>
      <td className="px-3 py-2.5 text-ink">{r.balance.toLocaleString()}</td>
      <td className="px-3 py-2.5 text-ink">{r.products_number}</td>
      <td className="px-3 py-2.5 text-ink">{r.credit_card ? "Sí" : "No"}</td>
      <td className="px-3 py-2.5 text-ink">{r.active_member ? "Sí" : "No"}</td>
      <td className="px-3 py-2.5 text-ink">
        {r.estimated_salary.toLocaleString()}
      </td>
      <td className="px-3 py-2.5 text-ink">
        {(r.probability * 100).toFixed(1)}%
      </td>
      <td className="px-3 py-2.5">
        <span
          className="inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px]"
          style={{ background: `${color}15`, color }}
        >
          <span
            className="h-1 w-1 rounded-full"
            style={{ background: color }}
          />
          {r.churn ? "Churn" : "No churn"}
        </span>
      </td>
    </tr>
  );
}
