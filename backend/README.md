# Churn Predictor API

Backend FastAPI para servir el modelo de predicción de churn bancario
(XGBoost optimizado + RobustScaler + umbral 0.53).

## Estructura

```
backend/
├── main.py                  # FastAPI entrypoint + CORS + routers
├── requirements.txt
├── app/
│   ├── routers/             # Controllers (3 endpoints)
│   │   ├── client_router.py     POST /predict/single
│   │   ├── dataset_router.py    POST /predict/batch
│   │   └── chart_router.py      GET  /charts
│   ├── services/            # Lógica de negocio
│   │   ├── prediction_service.py
│   │   └── chart_service.py
│   └── schemas/             # Pydantic (ClientSchema, PredictionSchema, ...)
│       └── schemas.py
└── artifacts/               # Artefactos del modelo (los generas en Colab)
    ├── model.pkl                XGBClassifier
    ├── scaler.pkl               RobustScaler (fit en 6 features continuas)
    ├── metadata.json            features, threshold, churn_distribution
    └── clientes_ejemplo.csv     CSV de prueba para batch
```

## Quickstart

```bash
python -m venv venv
source venv/bin/activate                # Mac/Linux
# venv\Scripts\activate                 # Windows
pip install -r requirements.txt
# coloca model.pkl, scaler.pkl, metadata.json en artifacts/
uvicorn main:app --reload
```

Abre http://localhost:8000/docs para probar los endpoints en Swagger.

## Endpoints

| Método | Ruta             | Qué hace                                  |
|--------|------------------|-------------------------------------------|
| GET    | `/`              | Health check                              |
| POST   | `/predict/single`| Predice churn para un cliente             |
| POST   | `/predict/batch` | Predice churn desde un CSV con 8 columnas |
| GET    | `/charts`        | Distribución de churn + feature importance|

## Modelo

Ver `Pipeline_ML_Bank_Churn.docx` para la documentación completa.
Métricas en test: F1 = 0.597, Recall = 0.603, AUC = 0.849.
