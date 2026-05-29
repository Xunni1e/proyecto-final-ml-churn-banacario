"use client";

import type { ShapContribution } from "@/lib/types";

/**
 * SHAP waterfall chart construido en SVG puro.
 *
 * Cada barra arranca donde terminó la anterior (cumsum), partiendo del valor
 * base del modelo y terminando en f(x). El orden visual es |shap| ascendente
 * de abajo hacia arriba, así la feature más determinante queda arriba.
 */

const ACCENT = { risk: "#c44536", safe: "#5a7a3a" };

interface Props {
  baseValue: number;
  fx: number;
  contributions: ShapContribution[];
  label: string; // "Churn" | "No churn"
}

export default function WaterfallChart({
  baseValue,
  fx,
  contributions,
  label,
}: Props) {
  // Orden ascendente por |shap| para que la mayor quede arriba.
  const sorted = [...contributions].sort(
    (a, b) => Math.abs(a.shap_value) - Math.abs(b.shap_value)
  );

  // Cumsum: cada barra arranca donde acabó la anterior.
  const starts: number[] = [baseValue];
  for (let i = 0; i < sorted.length - 1; i++) {
    starts.push(starts[i] + sorted[i].shap_value);
  }
  const ends = starts.map((s, i) => s + sorted[i].shap_value);

  // Dominio X con padding para que las etiquetas quepan.
  const allX = [baseValue, fx, ...starts, ...ends];
  const xMin = Math.min(...allX);
  const xMax = Math.max(...allX);
  const span = xMax - xMin || 1;
  const xDomMin = xMin - span * 0.18;
  const xDomMax = xMax + span * 0.18;

  // Dimensiones (en unidades del viewBox).
  const W = 820;
  const ML = 150; // margen izquierdo (labels de features)
  const MR = 50;
  const MT = 20;
  const MB = 70; // espacio para eje X + anotaciones base/fx
  const RH = 38; // alto de cada fila
  const BH = 22; // alto de cada barra
  const H = MT + sorted.length * RH + MB;
  const PW = W - ML - MR;

  const scaleX = (v: number) => ML + ((v - xDomMin) / (xDomMax - xDomMin)) * PW;

  // Y por índice (i=0 abajo, i=n-1 arriba).
  const rowY = (i: number) => MT + (sorted.length - 1 - i) * RH + RH / 2;

  // Ticks del eje X: 5 valores uniformes, redondeados.
  const ticks = Array.from({ length: 5 }, (_, k) => {
    const v = xDomMin + (k / 4) * (xDomMax - xDomMin);
    return Number(v.toFixed(2));
  });

  const isChurn = label === "Churn";
  const titleColor = isChurn ? ACCENT.risk : ACCENT.safe;

  return (
    <div className="w-full">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h3
          className="font-serif text-lg"
          style={{ color: titleColor }}
        >
          Contribución de variables — {label.toUpperCase()}
        </h3>
        <div className="flex items-center gap-4 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5"
              style={{ background: ACCENT.risk }}
            />
            Aumenta churn
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5"
              style={{ background: ACCENT.safe }}
            />
            Reduce churn
          </span>
        </div>
      </header>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {/* Grid vertical (ticks) */}
        {ticks.map((t) => (
          <line
            key={t}
            x1={scaleX(t)}
            y1={MT}
            x2={scaleX(t)}
            y2={H - MB}
            stroke="#e8e3d7"
            strokeWidth={1}
          />
        ))}

        {/* Línea base (vertical punteada gris) */}
        <line
          x1={scaleX(baseValue)}
          y1={MT}
          x2={scaleX(baseValue)}
          y2={H - MB + 8}
          stroke="#b8b3a8"
          strokeWidth={1.2}
          strokeDasharray="4 4"
        />
        {/* Línea f(x) (vertical punteada más oscura) */}
        <line
          x1={scaleX(fx)}
          y1={MT}
          x2={scaleX(fx)}
          y2={H - MB + 8}
          stroke="#1a1f2e"
          strokeWidth={1.2}
          strokeDasharray="2 3"
        />

        {/* Barras */}
        {sorted.map((c, i) => {
          const y = rowY(i);
          const start = starts[i];
          const end = ends[i];
          const positive = c.shap_value >= 0;
          const x = scaleX(Math.min(start, end));
          const wRaw = Math.abs(scaleX(end) - scaleX(start));
          const w = Math.max(wRaw, 2); // mínimo visual 2px para que se vean
          const color = positive ? ACCENT.risk : ACCENT.safe;

          // Etiqueta: positiva → derecha del bar; negativa → izquierda.
          const labelX = positive ? scaleX(end) + 6 : scaleX(end) - 6;
          const labelAnchor = positive ? "start" : "end";
          const sign = positive ? "+" : "";

          return (
            <g key={c.feature}>
              {/* Nombre de feature (izquierda) */}
              <text
                x={ML - 10}
                y={y}
                textAnchor="end"
                alignmentBaseline="central"
                fontSize="12"
                fill="#1a1f2e"
              >
                {c.feature}
              </text>

              {/* Conector punteado a la siguiente barra (cumsum visual) */}
              {i < sorted.length - 1 && (
                <line
                  x1={scaleX(end)}
                  y1={y - BH / 2}
                  x2={scaleX(end)}
                  y2={rowY(i + 1) + BH / 2}
                  stroke="#d0cabd"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                />
              )}

              {/* Barra */}
              <rect
                x={x}
                y={y - BH / 2}
                width={w}
                height={BH}
                fill={color}
                opacity={0.88}
                rx={1}
              />

              {/* Valor numérico */}
              <text
                x={labelX}
                y={y}
                textAnchor={labelAnchor}
                alignmentBaseline="central"
                fontSize="11"
                fill="#1a1f2e"
                fontWeight="500"
              >
                {sign}
                {c.shap_value.toFixed(3)}
              </text>
            </g>
          );
        })}

        {/* Eje X: línea horizontal */}
        <line
          x1={ML}
          y1={H - MB + 8}
          x2={W - MR}
          y2={H - MB + 8}
          stroke="#b8b3a8"
          strokeWidth={1}
        />
        {/* Ticks numéricos */}
        {ticks.map((t) => (
          <text
            key={t}
            x={scaleX(t)}
            y={H - MB + 22}
            textAnchor="middle"
            fontSize="10"
            fill="#6b6760"
          >
            {t.toFixed(2)}
          </text>
        ))}
        {/* Etiqueta del eje */}
        <text
          x={(ML + W - MR) / 2}
          y={H - 8}
          textAnchor="middle"
          fontSize="10"
          fill="#6b6760"
          style={{ fontFamily: "var(--font-sans)", fontStyle: "italic" }}
        >
          Log-odds
        </text>

        {/* Anotaciones base y f(x) */}
        <text
          x={scaleX(baseValue)}
          y={H - MB + 42}
          textAnchor="middle"
          fontSize="10"
          fill="#9b958a"
        >
          base
        </text>
        <text
          x={scaleX(baseValue)}
          y={H - MB + 54}
          textAnchor="middle"
          fontSize="10"
          fill="#9b958a"
        >
          {baseValue.toFixed(3)}
        </text>
        <text
          x={scaleX(fx)}
          y={H - MB + 42}
          textAnchor="middle"
          fontSize="10"
          fill="#1a1f2e"
          fontWeight="600"
        >
          f(x)
        </text>
        <text
          x={scaleX(fx)}
          y={H - MB + 54}
          textAnchor="middle"
          fontSize="10"
          fill="#1a1f2e"
          fontWeight="600"
        >
          {fx.toFixed(3)}
        </text>
      </svg>
    </div>
  );
}
