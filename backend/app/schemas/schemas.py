"""
Pydantic schemas · capa de validación del diagrama.

ClientSchema       -> validación de entrada (POST /predict/single)
PredictionSchema   -> respuesta con predicción + explicación SHAP individual
"""

from pydantic import BaseModel, Field


# ---------- Entrada ----------
class ClientSchema(BaseModel):
    """Datos de un cliente del banco (8 features)."""

    credit_score: int = Field(..., ge=350, le=850, description="Puntaje crediticio")
    age: int = Field(..., ge=18, le=100, description="Edad")
    tenure: int = Field(..., ge=0, le=10, description="Años como cliente")
    balance: float = Field(..., ge=0, description="Saldo en cuenta")
    products_number: int = Field(..., ge=1, le=4, description="Cantidad de productos")
    credit_card: int = Field(..., ge=0, le=1, description="Tarjeta: 0/1")
    active_member: int = Field(..., ge=0, le=1, description="Miembro activo: 0/1")
    estimated_salary: float = Field(..., ge=0, description="Salario estimado")

    model_config = {
        "json_schema_extra": {
            "example": {
                "credit_score": 600, "age": 45, "tenure": 2, "balance": 120000.0,
                "products_number": 1, "credit_card": 1, "active_member": 0,
                "estimated_salary": 80000.0,
            }
        }
    }


# ---------- Explicabilidad SHAP ----------
class ShapContribution(BaseModel):
    """Contribución SHAP de una feature a la predicción individual."""

    feature: str
    value: float = Field(..., description="Valor original del cliente (sin escalar)")
    shap_value: float = Field(..., description="Contribución en log-odds")
    delta_pp: float = Field(..., description="Impacto en puntos porcentuales (0..1)")


# ---------- Salida ----------
class PredictionSchema(BaseModel):
    """Resultado de una predicción individual con explicación SHAP."""

    churn: bool
    probability: float = Field(..., ge=0, le=1)
    label: str
    threshold: float
    # Explicación SHAP (devuelta SIEMPRE por /predict/single)
    base_value: float = Field(..., description="Log-odds promedio del modelo")
    base_probability: float = Field(..., description="sigmoid(base_value)")
    fx: float = Field(..., description="Log-odds final = base + suma(shap_values)")
    contributions: list[ShapContribution] = Field(
        ..., description="Contribuciones ordenadas por |shap_value| descendente"
    )


# ---------- Predicción masiva (sin SHAP para mantenerlo rápido) ----------
class BatchPredictionRow(ClientSchema):
    row_id: int
    churn: bool
    probability: float


class BatchPredictionResponse(BaseModel):
    total: int
    churn_count: int
    threshold: float
    rows: list[BatchPredictionRow]


# ---------- Gráficas globales ----------
class ChurnDistributionItem(BaseModel):
    label: str
    value: int


class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float


class ChartData(BaseModel):
    churn_distribution: list[ChurnDistributionItem]
    feature_importance: list[FeatureImportanceItem]