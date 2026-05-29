"""dataset_router · controller · POST /predict/batch"""

import io

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.schemas import BatchPredictionResponse
from app.services import prediction_service

router = APIRouter(tags=["prediction"])


@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(file: UploadFile = File(...)) -> BatchPredictionResponse:
    """Recibe un CSV con varios clientes y devuelve sus predicciones."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Se espera un archivo .csv")

    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"No se pudo leer el CSV: {exc}")

    try:
        result = prediction_service.predict_batch(df)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return BatchPredictionResponse(**result)
