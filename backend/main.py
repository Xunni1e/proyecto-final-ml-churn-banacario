"""
main.py · punto de entrada de FastAPI.

Registra los tres routers (controllers) y habilita CORS para el frontend Next.js.
Levantar con:  uvicorn main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import chart_router, client_router, dataset_router

app = FastAPI(
    title="Churn Predictor API",
    description="API de predicción de abandono de clientes bancarios.",
    version="1.0.0",
)

# CORS: permite que el frontend (localhost:3000) consuma la API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Controllers
app.include_router(client_router.router)
app.include_router(dataset_router.router)
app.include_router(chart_router.router)


@app.get("/")
def health():
    return {"status": "ok", "service": "churn-predictor-api"}
