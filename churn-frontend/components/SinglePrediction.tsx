"use client";

import { useState } from "react";
import {
  CLIENT_FIELDS,
  GROUPS,
  buildInitialValues,
  type FieldDef,
} from "@/lib/fields";
import { predictSingle } from "@/lib/api";
import type { ClientInput, PredictionResult } from "@/lib/types";

export default function SinglePrediction() {
  const [values, setValues] = useState<Record<string, number>>(
    buildInitialValues()
  );
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(name: string, v: number) {
    setValues((s) => ({ ...s, [name]: v }));
  }

  async function submit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await predictSingle(values as unknown as ClientInput);
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Formulario */}
      <section className="rounded-sm border border-border bg-surface p-8">
        <header className="mb-6">
          <h2 className="font-serif text-xl text-ink">Información del cliente</h2>
          <p className="mt-1 text-sm text-muted">
            Diligencia los 8 atributos del modelo para estimar la probabilidad
            de abandono.
          </p>
        </header>

        <div className="space-y-7">
          {GROUPS.map((g) => (
            <div key={g.id}>
              <h3 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted">
                {g.label}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {CLIENT_FIELDS.filter((f) => f.group === g.id).map((f) => (
                  <div
                    key={f.name}
                    className={f.fullWidth ? "sm:col-span-2" : ""}
                  >
                    <Field
                      field={f}
                      value={values[f.name]}
                      onChange={(v) => setField(f.name, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="mt-8 w-full rounded-sm bg-ink px-4 py-3 text-sm font-medium text-paper transition hover:opacity-90 disabled:opacity-40"
        >
          {loading ? "Calculando…" : "Predecir churn"}
        </button>

        {error && (
          <p className="mt-4 rounded-sm border border-risk/30 bg-risk/[0.06] px-3 py-2 text-sm text-risk">
            {error}
          </p>
        )}
      </section>

      {/* Resultado */}
      <ResultPanel result={result} loading={loading} />
    </div>
  );
}

/* ---------- Field renderer ---------- */

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: number;
  onChange: (v: number) => void;
}) {
  if (field.type === "binary") {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-ink">{field.label}</label>
        <div className="inline-flex rounded-sm border border-border bg-paper p-0.5">
          {[
            { label: "Sí", v: 1 },
            { label: "No", v: 0 },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              aria-pressed={value === o.v}
              onClick={() => onChange(o.v)}
              className={`flex-1 rounded-[2px] px-4 py-1.5 text-sm transition ${
                value === o.v
                  ? "bg-ink text-paper"
                  : "text-muted hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "segmented") {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-ink">{field.label}</label>
        <div className="inline-flex rounded-sm border border-border bg-paper p-0.5">
          {field.options!.map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={value === o}
              onClick={() => onChange(o)}
              className={`flex-1 rounded-[2px] px-4 py-1.5 font-mono text-sm transition ${
                value === o ? "bg-ink text-paper" : "text-muted hover:text-ink"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-ink">{field.label}</label>
      <input
        type="number"
        value={value}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-sm border border-border bg-paper px-3 py-2 font-mono text-sm text-ink transition focus:border-ink focus:outline-none"
      />
      {field.hint && (
        <span className="font-mono text-[11px] text-muted">{field.hint}</span>
      )}
    </div>
  );
}

/* ---------- Result panel ---------- */

function ResultPanel({
  result,
  loading,
}: {
  result: PredictionResult | null;
  loading: boolean;
}) {
  return (
    <aside className="rounded-sm border border-border bg-surface p-8">
      <header className="mb-6">
        <h2 className="font-serif text-xl text-ink">Resultado</h2>
      </header>

      {!result && !loading && (
        <div className="flex min-h-[280px] items-center justify-center text-center">
          <p className="text-sm text-muted">
            La predicción aparecerá tras enviar el formulario.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex min-h-[280px] items-center justify-center text-sm text-muted">
          Calculando predicción…
        </div>
      )}

      {result && !loading && <ResultDisplay result={result} />}
    </aside>
  );
}

// Mismos hex que las CSS vars --color-risk / --color-safe en globals.css.
// Se duplican aquí porque se usan en `style={{}}` inline (las CSS vars no se
// pueden concatenar con sufijos de alpha como `${var}15`).
const ACCENT = { risk: "#c44536", safe: "#5a7a3a" };

function ResultDisplay({ result }: { result: PredictionResult }) {
  const pct = result.probability * 100;
  const tPct = result.threshold * 100;
  const color = result.churn ? ACCENT.risk : ACCENT.safe;

  return (
    <div className="space-y-8">
      {/* Probabilidad */}
      <div>
        <div
          className="font-mono text-5xl font-light leading-none tabular-nums"
          style={{ color }}
        >
          {pct.toFixed(2)}%
        </div>
        <div className="mt-2 text-sm text-muted">probabilidad de churn</div>
      </div>

      {/* Barra con marca del umbral */}
      <div className="relative pt-5">
        <div
          className="absolute top-0 -translate-x-1/2 font-mono text-[10px] text-muted"
          style={{ left: `${tPct}%` }}
        >
          {result.threshold.toFixed(2)}
        </div>
        <div className="relative h-1.5 bg-paper">
          <div
            className="absolute -top-1 h-3.5 w-px bg-ink/30"
            style={{ left: `${tPct}%` }}
            aria-hidden
          />
          <div
            className="h-full transition-all"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted">
          <span>0.00</span>
          <span>1.00</span>
        </div>
      </div>

      {/* Etiqueta */}
      <div>
        <div
          className="inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium"
          style={{ background: `${color}15`, color }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: color }}
          />
          {result.label}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {result.churn
            ? "El modelo recomienda acción de retención sobre este cliente."
            : "Cliente con baja probabilidad de abandono. No se requiere acción."}
        </p>
      </div>
    </div>
  );
}
