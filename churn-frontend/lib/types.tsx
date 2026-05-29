// Espejo de los Pydantic schemas del backend FastAPI.
// Las 8 features del modelo XGBoost + RobustScaler + umbral 0.53.

export interface ClientInput {
  credit_score: number;
  age: number;
  tenure: number;
  balance: number;
  products_number: number;
  credit_card: number;     // 0 | 1
  active_member: number;   // 0 | 1
  estimated_salary: number;
}

export interface PredictionResult {
  churn: boolean;
  probability: number;     // 0..1
  label: string;           // "Churn" | "No churn"
  threshold: number;       // 0.53

  // Explicabilidad SHAP individual (siempre presente en /predict/single).
  base_value: number;            // log-odds promedio del modelo
  base_probability: number;      // sigmoid(base_value)
  fx: number;                    // log-odds final = base + suma(shap)
  contributions: ShapContribution[];  // ordenadas por |shap| desc
}

export interface ShapContribution {
  feature: string;
  value: number;       // valor original del cliente (sin escalar)
  shap_value: number;  // contribución en log-odds
  delta_pp: number;    // impacto en puntos porcentuales (0..1)
}

export interface BatchPredictionRow extends ClientInput {
  row_id: number;
  churn: boolean;
  probability: number;
}

export interface BatchPredictionResponse {
  total: number;
  churn_count: number;
  threshold: number;
  rows: BatchPredictionRow[];
}

export interface ChurnDistributionItem {
  label: string;
  value: number;
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
}

export interface ChartData {
  churn_distribution: ChurnDistributionItem[];
  feature_importance: FeatureImportanceItem[];
}