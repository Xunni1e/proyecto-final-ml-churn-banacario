// Capa de servicio · equivalente a `api.service.js · Axios` del diagrama.
// Todas las llamadas al backend pasan por aquí.

import axios from "axios";
import type {
  ClientInput,
  PredictionResult,
  BatchPredictionResponse,
  ChartData,
} from "./types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

/**
 * Extrae un mensaje legible de un error de axios.
 * Maneja en particular los 422 de Pydantic, que vienen como
 * { detail: [{ loc: ["body","age"], msg: "...", ... }, ...] }
 */
function extractError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { detail?: unknown } | undefined;
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) {
      return data.detail
        .map((d: { loc?: string[]; msg?: string }) => {
          const field = d.loc?.[d.loc.length - 1] ?? "campo";
          return `${field}: ${d.msg ?? "valor inválido"}`;
        })
        .join(" · ");
    }
    return err.message;
  }
  return fallback;
}

// POST /predict/single  · client_router.py
export async function predictSingle(input: ClientInput): Promise<PredictionResult> {
  try {
    const { data } = await api.post<PredictionResult>("/predict/single", input);
    return data;
  } catch (e) {
    throw new Error(extractError(e, "Error al predecir."));
  }
}

// POST /predict/batch  · dataset_router.py (multipart CSV)
export async function predictBatch(file: File): Promise<BatchPredictionResponse> {
  try {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<BatchPredictionResponse>(
      "/predict/batch",
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  } catch (e) {
    throw new Error(extractError(e, "Error al procesar el CSV."));
  }
}

// GET /charts  · chart_router.py
export async function getCharts(): Promise<ChartData> {
  try {
    const { data } = await api.get<ChartData>("/charts");
    return data;
  } catch (e) {
    throw new Error(extractError(e, "Error al cargar las gráficas."));
  }
}
