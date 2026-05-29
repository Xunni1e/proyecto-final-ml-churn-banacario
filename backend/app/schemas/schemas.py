"""
Pydantic schemas · capa de validación del diagrama.

ClientSchema    -> validación de entrada (POST /predict/single)
PredictionSchema -> estructura de respuesta del modelo

Las 8 features y su orden DEBEN coincidir con el pipeline documentado en
Pipeline_ML_Bank_Churn.docx (sección 2.2). Los rangos de validación salen
del EDA. country y gender se EXCLUYEN por criterio ético (GDPR).
"""

from pydantic import BaseModel, Field


# ---------- Entrada ----------
class ClientSchema(BaseModel):
    """Datos de un cliente del banco para predecir churn (8 features)."""

    credit_score: int = Field(..., ge=350, le=850, description="Puntaje crediticio")
    age: int = Field(..., ge=18, le=100, description="Edad del cliente")
    tenure: int = Field(..., ge=0, le=10, description="Años como cliente")
    balance: float = Field(..., ge=0, description="Saldo en cuenta")
    products_number: int = Field(..., ge=1, le=4, description="Cantidad de productos")
    credit_card: int = Field(..., ge=0, le=1, description="Tiene tarjeta: 0/1")
    active_member: int = Field(..., ge=0, le=1, description="Miembro activo: 0/1")
    estimated_salary: float = Field(..., ge=0, description="Salario anual estimado")

    model_config = {
        "json_schema_extra": {
            "example": {
                "credit_score": 619,
                "age": 42,
                "tenure": 2,
                "balance": 0.0,
                "products_number": 1,
                "credit_card": 1,
                "active_member": 1,
                "estimated_salary": 101348.88,
            }
        }
    }


# ---------- Salida ----------
class PredictionSchema(BaseModel):
    """Resultado de una predicción individual."""

    churn: bool = Field(..., description="True si prob >= umbral del modelo (0.53)")
    probability: float = Field(..., ge=0, le=1, description="Probabilidad de churn 0..1")
    label: str = Field(..., description="'Churn' | 'No churn'")
    threshold: float = Field(..., description="Umbral aplicado (informativo)")


# ---------- Predicción masiva ----------
class BatchPredictionRow(ClientSchema):
    """Una fila del CSV enriquecida con su predicción."""

    row_id: int
    churn: bool
    probability: float


class BatchPredictionResponse(BaseModel):
    total: int
    churn_count: int
    threshold: float
    rows: list[BatchPredictionRow]


# ---------- Gráficas ----------
class ChurnDistributionItem(BaseModel):
    label: str
    value: int


class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float


class ChartData(BaseModel):
    churn_distribution: list[ChurnDistributionItem]
    feature_importance: list[FeatureImportanceItem]
