"use client";

import { useState } from "react";
import {
  CLIENT_FIELDS,
  GROUPS,
  buildInitialValues,
  type FieldDef,
} from "@/lib/fields";
import { predictSingle } from "@/lib/api";
import type {
  ClientInput,
  PredictionResult,
  ShapContribution,
} from "@/lib/types";
import WaterfallChart from "./WaterfallChart";

const ACCENT = { risk: "#c44536", safe: "#5a7a3a" };

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
    // Grid proporcional: form compacto a la izquierda, resultado ancho a la
    // derecha (donde ahora también vive el waterfall).
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      {/* Formulario */}
      <section className="rounded-sm border border-border bg-surface p-8">
        <header className="mb-6">
          <h2 className="font-serif text-xl text-ink">
            Información del cliente
          </h2>
          <p className="mt-1 text-sm text-muted">
            Diligencia los 8 atributos del modelo para estimar la
            probabilidad de abandono.
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

      {/* Resultado (ahora ancho, contiene también la explicación SHAP) */}
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

/* ---------- Result panel (ahora incluye toda la explicación SHAP) ---------- */

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
        <div className="flex min-h-[400px] items-center justify-center text-center">
          <p className="text-sm text-muted">
            La predicción y su explicación aparecerán tras enviar el formulario.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex min-h-[400px] items-center justify-center text-sm text-muted">
          Calculando predicción…
        </div>
      )}

      {result && !loading && (
        <div className="space-y-8">
          <ResultDisplay result={result} />
          <ExplanationSection result={result} />
        </div>
      )}
    </aside>
  );
}

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
      <div className="relative max-w-md pt-5">
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

      {/* Etiqueta + recomendación */}
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
        <p className="mt-3 max-w-md text-xs leading-relaxed text-muted">
          {result.churn
            ? "El modelo recomienda acción de retención sobre este cliente."
            : "Cliente con baja probabilidad de abandono. No se requiere acción."}
        </p>
      </div>
    </div>
  );
}

/* ---------- Sección de explicación SHAP (waterfall + interpretación) ---------- */

function ExplanationSection({ result }: { result: PredictionResult }) {
  return (
    <div className="border-t border-border pt-8">
      <header className="mb-5">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted">
          Explicación SHAP
        </h3>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">
          Contribución de cada variable en log-odds. Base{" "}
          <span className="font-mono text-ink">
            {result.base_value.toFixed(3)}
          </span>{" "}
          ({(result.base_probability * 100).toFixed(1)}% esperado sin conocer
          al cliente) → f(x){" "}
          <span className="font-mono text-ink">{result.fx.toFixed(3)}</span> (
          {(result.probability * 100).toFixed(1)}% predicha).
        </p>
      </header>

      <WaterfallChart
        baseValue={result.base_value}
        fx={result.fx}
        contributions={result.contributions}
        label={result.label}
      />

      <Interpretation contributions={result.contributions} />
    </div>
  );
}

/* ---------- Interpretación rápida (top 3 aumentan / reducen) ---------- */

function Interpretation({
  contributions,
}: {
  contributions: ShapContribution[];
}) {
  const aumentan = contributions.filter((c) => c.shap_value > 0).slice(0, 3);
  const reducen = contributions.filter((c) => c.shap_value < 0).slice(0, 3);

  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2">
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted">
          <span
            className="inline-block h-2 w-2"
            style={{ background: ACCENT.risk }}
          />
          Aumentan el riesgo
        </h4>
        <ul className="space-y-2">
          {aumentan.length === 0 && (
            <li className="text-sm text-muted">
              Ninguna feature aumenta el riesgo.
            </li>
          )}
          {aumentan.map((c) => (
            <ContribItem key={c.feature} c={c} sign="+" />
          ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted">
          <span
            className="inline-block h-2 w-2"
            style={{ background: ACCENT.safe }}
          />
          Reducen el riesgo
        </h4>
        <ul className="space-y-2">
          {reducen.length === 0 && (
            <li className="text-sm text-muted">
              Ninguna feature reduce el riesgo.
            </li>
          )}
          {reducen.map((c) => (
            <ContribItem key={c.feature} c={c} sign="" />
          ))}
        </ul>
      </div>
    </div>
  );
}

function ContribItem({ c, sign }: { c: ShapContribution; sign: "+" | "" }) {
  const ppPct = (c.delta_pp * 100).toFixed(1);
  const ppSign = c.delta_pp >= 0 ? "+" : "";
  const color = c.shap_value > 0 ? ACCENT.risk : ACCENT.safe;

  return (
    <li className="flex items-baseline justify-between gap-3 text-sm">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-ink">{c.feature}</span>
        <span className="font-mono text-xs text-muted">
          = {formatVal(c.value)}
        </span>
      </div>
      <div className="text-right font-mono text-xs">
        <span style={{ color }}>
          {sign}
          {c.shap_value.toFixed(3)}
        </span>
        <span className="ml-2 text-muted">
          {ppSign}
          {ppPct} pp
        </span>
      </div>
    </li>
  );
}

function formatVal(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
