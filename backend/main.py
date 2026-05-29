import os
os.environ["JOBLIB_MULTIPROCESSING"] = "0"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chart_router, client_router, dataset_router

app = FastAPI(
    title="Churn Predictor API",
    description="API de predicción de abandono de clientes bancarios.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(client_router.router)
app.include_router(dataset_router.router)
app.include_router(chart_router.router)

@app.get("/")
def health():
    return {"status": "ok", "service": "churn-predictor-api"}

try:
    from mangum import Mangum
    handler = Mangum(app)
except ImportError:
    pass
