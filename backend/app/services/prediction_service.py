"""
prediction_service · capa de servicios del diagrama.

Carga modelo + scaler + config UNA vez al importar y deja además inicializado
un `shap.TreeExplainer` para explicar predicciones individuales en log-odds.

TreeExplainer sobre XGBoost es exacto (no muestral) y muy rápido (~ms por
predicción), así que se puede correr en cada `/predict/single` sin penalidad.
"""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import shap

ARTIFACTS_DIR = Path(__file__).resolve().parents[2] / "artifacts"

# --- Carga única (singleton de módulo) ---
_model = joblib.load(ARTIFACTS_DIR / "modelo_churn.pkl")
_scaler = joblib.load(ARTIFACTS_DIR / "scaler.pkl")

with open(ARTIFACTS_DIR / "config_modelo.json", encoding="utf-8") as f:
    _config = json.load(f)

FEATURES: list[str] = _config["features"]
FEATURES_TO_SCALE: list[str] = (
    _config.get("variables_escaladas") or _config.get("features_to_scale")
)
THRESHOLD: float = float(
    _config.get("umbral_optimo") or _config.get("threshold") or 0.5
)

if FEATURES_TO_SCALE is None:
    raise RuntimeError(
        "config_modelo.json no contiene 'variables_escaladas' ni 'features_to_scale'"
    )

# Explainer SHAP inicializado una sola vez (operación costosa).
_explainer = shap.TreeExplainer(_model)


# ---------- Helpers ----------
def _sigmoid(z: float) -> float:
    """Convierte log-odds a probabilidad."""
    return float(1.0 / (1.0 + np.exp(-z)))


def _to_label(is_churn: bool) -> str:
    return "Churn" if is_churn else "No churn"


def _prepare(df: pd.DataFrame) -> pd.DataFrame:
    """Reordena columnas al orden de FEATURES y aplica el scaler solo a las continuas.
    Devuelve un DataFrame (no numpy) porque SHAP funciona mejor con DF."""
    out = df[FEATURES].copy().astype(float)
    out[FEATURES_TO_SCALE] = _scaler.transform(out[FEATURES_TO_SCALE].values)
    return out


# ---------- Predicciones ----------
def predict_single(client: dict) -> dict:
    """Predice churn + computa SHAP individual para el cliente."""
    df_raw = pd.DataFrame([client])
    df_prepared = _prepare(df_raw)

    # Probabilidad y decisión
    proba = float(_model.predict_proba(df_prepared.values)[0][1])
    is_churn = proba >= THRESHOLD

    # Explicación SHAP en log-odds
    explanation = _explainer(df_prepared)
    sv = explanation[0]
    base_value = float(np.asarray(sv.base_values).item())
    shap_vals = np.asarray(sv.values, dtype=float)
    fx = base_value + float(shap_vals.sum())

    base_prob = _sigmoid(base_value)

    # Construir contribuciones con delta_pp por feature.
    # delta_pp_i = sigmoid(base + phi_i) - sigmoid(base)
    contributions = []
    for feat, phi in zip(FEATURES, shap_vals):
        contributions.append(
            {
                "feature": feat,
                "value": float(client[feat]),  # valor original sin escalar
                "shap_value": float(phi),
                "delta_pp": _sigmoid(base_value + float(phi)) - base_prob,
            }
        )

    # Ordenar por magnitud descendente (lo más importante primero).
    contributions.sort(key=lambda c: abs(c["shap_value"]), reverse=True)

    return {
        "churn": is_churn,
        "probability": proba,
        "label": _to_label(is_churn),
        "threshold": THRESHOLD,
        "base_value": base_value,
        "base_probability": base_prob,
        "fx": fx,
        "contributions": contributions,
    }


def predict_batch(df: pd.DataFrame) -> dict:
    """Predice churn para múltiples clientes. No incluye SHAP (sería lento y poco
    accionable: no se grafica una explicación individual por cada fila del lote)."""
    missing = [c for c in FEATURES if c not in df.columns]
    if missing:
        raise ValueError(f"El CSV no tiene las columnas requeridas: {missing}")

    df_prepared = _prepare(df)
    probas = _model.predict_proba(df_prepared.values)[:, 1]
    preds = probas >= THRESHOLD

    int_features = {"credit_score", "age", "tenure", "products_number",
                    "credit_card", "active_member"}

    rows = []
    for i in range(len(df)):
        row = {"row_id": i + 1}
        for f in FEATURES:
            val = df.iloc[i][f]
            row[f] = int(val) if f in int_features else float(val)
        row["churn"] = bool(preds[i])
        row["probability"] = float(probas[i])
        rows.append(row)

    return {
        "total": len(rows),
        "churn_count": int(preds.sum()),
        "threshold": THRESHOLD,
        "rows": rows,
    }


def get_model():
    return _model


def get_config() -> dict:
    return _config