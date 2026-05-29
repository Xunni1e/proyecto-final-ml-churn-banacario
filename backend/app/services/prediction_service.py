"""
prediction_service · capa de servicios del diagrama.

Carga el modelo XGBoost, el scaler y el config UNA vez al importar el módulo,
y expone funciones de predicción individual y por lote.

Artefactos esperados en artifacts/:
  - modelo_churn.pkl   : XGBClassifier optimizado
  - scaler.pkl         : RobustScaler ajustado con las 6 features continuas
  - config_modelo.json : {modelo, umbral_optimo, features, variables_escaladas, ...}

El orden de las features se toma SIEMPRE del config (campo "features"), nunca
se asume — ese orden es el que aprendió XGBoost durante el entrenamiento.
"""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

ARTIFACTS_DIR = Path(__file__).resolve().parents[2] / "artifacts"

# Carga única (singleton de módulo)
_model = joblib.load(ARTIFACTS_DIR / "modelo_churn.pkl")
_scaler = joblib.load(ARTIFACTS_DIR / "scaler.pkl")

with open(ARTIFACTS_DIR / "config_modelo.json", encoding="utf-8") as f:
    _config = json.load(f)

# Lectura tolerante: acepta claves en español (las tuyas) o inglés (por si más
# adelante regeneras el config con otro script).
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


def _to_label(is_churn: bool) -> str:
    return "Churn" if is_churn else "No churn"


def _prepare(df: pd.DataFrame) -> np.ndarray:
    """Reordena columnas según FEATURES, aplica RobustScaler solo a las
    continuas y devuelve la matriz numpy lista para XGBoost."""
    out = df[FEATURES].copy().astype(float)
    out[FEATURES_TO_SCALE] = _scaler.transform(out[FEATURES_TO_SCALE].values)
    return out.values


def predict_single(client: dict) -> dict:
    """Predice churn para un solo cliente."""
    df = pd.DataFrame([client])
    X = _prepare(df)
    proba = float(_model.predict_proba(X)[0][1])
    is_churn = proba >= THRESHOLD
    return {
        "churn": is_churn,
        "probability": proba,
        "label": _to_label(is_churn),
        "threshold": THRESHOLD,
    }


def predict_batch(df: pd.DataFrame) -> dict:
    """Predice churn para un DataFrame con múltiples clientes."""
    missing = [c for c in FEATURES if c not in df.columns]
    if missing:
        raise ValueError(f"El CSV no tiene las columnas requeridas: {missing}")

    X = _prepare(df)
    probas = _model.predict_proba(X)[:, 1]
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
    """Acceso al modelo para el chart_service (importancia de features)."""
    return _model


def get_config() -> dict:
    return _config