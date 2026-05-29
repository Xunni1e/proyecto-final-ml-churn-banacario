"use client";

import { useState } from "react";
import SinglePrediction from "@/components/SinglePrediction";
import BatchPrediction from "@/components/BatchPrediction";
import Charts from "@/components/Charts";

const TABS = [
  { id: "single", label: "Predicción individual" },
  { id: "batch", label: "Predicción masiva" },
  { id: "charts", label: "Modelo" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function Home() {
  const [tab, setTab] = useState<Tab>("single");

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Header editorial */}
        <header className="mb-10 border-b border-border pb-8">
          <div className="flex items-baseline gap-3">
            <h1 className="font-serif text-3xl font-medium text-ink">
              Churn Predictor
            </h1>
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
              v1.0
            </span>
          </div>
          <p className="mt-2 text-sm text-muted">
            Bank Customer Churn · XGBoost optimizado · F1 = 0.597 · AUC = 0.849
          </p>
        </header>

        {/* Tabs */}
        <nav
          className="mb-8 inline-flex rounded-sm border border-border bg-surface p-1"
          role="tablist"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-[2px] px-4 py-1.5 text-sm transition ${
                tab === t.id
                  ? "bg-ink text-paper"
                  : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "single" && <SinglePrediction />}
        {tab === "batch" && <BatchPrediction />}
        {tab === "charts" && <Charts />}
      </div>
    </main>
  );
}
