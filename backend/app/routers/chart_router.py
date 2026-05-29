"""chart_router · controller · GET /charts"""

from fastapi import APIRouter

from app.schemas.schemas import ChartData
from app.services import chart_service

router = APIRouter(tags=["charts"])


@router.get("/charts", response_model=ChartData)
def get_charts() -> ChartData:
    """Devuelve los datos para las gráficas (distribución e importancia)."""
    return ChartData(**chart_service.get_chart_data())
