"""client_router · controller · POST /predict/single"""

from fastapi import APIRouter

from app.schemas.schemas import ClientSchema, PredictionSchema
from app.services import prediction_service

router = APIRouter(tags=["prediction"])


@router.post("/predict/single", response_model=PredictionSchema)
def predict_single(client: ClientSchema) -> PredictionSchema:
    """Predice la probabilidad de churn de un único cliente."""
    result = prediction_service.predict_single(client.model_dump())
    return PredictionSchema(**result)
