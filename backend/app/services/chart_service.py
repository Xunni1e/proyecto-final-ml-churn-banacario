"""
chart_service · genera los datos para las gráficas del frontend.

- churn_distribution: viene del config si está definida (clave 'distribucion_churn'
  o 'churn_distribution'). Si no, usa los valores documentados del dataset Kaggle
  Bank Customer Churn como fallback. Esos valores son una propiedad fija del
  dataset de entrenamiento; mientras no se reentrene con otro dataset, son válidos.

- feature_importance: se calcula desde el modelo cargado.
    - Modelos arbóreos (XGBoost, RandomForest, LightGBM): model.feature_importances_
    - Modelos lineales (LogisticRegression):              |model.coef_[0]|
  Se normaliza a que sume 1.0 para que sea comparable entre modelos.
"""

import numpy as np

from app.services import prediction_service

# Distribución conocida del dataset Bank Customer Churn (10,000 clientes, 20.4% churn).
# Documentada en Pipeline_ML_Bank_Churn.docx sección 2.1 y verificada en la salida
# del preprocesamiento (Interpretacion_Resultados_Churn.docx sección 1.1).
DEFAULT_CHURN_DIST = {"0": 7963, "1": 2037}


def _extract_importances(model) -> np.ndarray:
    """Devuelve un vector de importancias absolutas, sin normalizar.
    Soporta árboles (feature_importances_) y lineales (coef_)."""
    if hasattr(model, "feature_importances_"):
        return np.asarray(model.feature_importances_, dtype=float)
    if hasattr(model, "coef_"):
        return np.abs(np.asarray(model.coef_[0], dtype=float))
    raise AttributeError(
        f"El modelo {type(model).__name__} no expone feature_importances_ ni coef_"
    )


def get_chart_data() -> dict:
    model = prediction_service.get_model()
    config = prediction_service.get_config()
    features = config["features"]

    # ---- Distribución de churn ----
    dist = (
        config.get("distribucion_churn")
        or config.get("churn_distribution")
        or DEFAULT_CHURN_DIST
    )
    churn_distribution = [
        {"label": "No churn", "value": int(dist.get("0", 0))},
        {"label": "Churn", "value": int(dist.get("1", 0))},
    ]

    # ---- Importancia de variables (normalizada) ----
    raw = _extract_importances(model)
    total = raw.sum() or 1.0
    importance = raw / total

    feature_importance = sorted(
        [
            {"feature": f, "importance": round(float(imp), 4)}
            for f, imp in zip(features, importance)
        ],
        key=lambda x: x["importance"],
        reverse=True,
    )

    return {
        "churn_distribution": churn_distribution,
        "feature_importance": feature_importance,
    }