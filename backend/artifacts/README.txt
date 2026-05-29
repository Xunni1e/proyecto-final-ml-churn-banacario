Coloca aquí los 3 artefactos del modelo (los que tienes en Drive):

  modelo_churn.pkl     <- XGBClassifier optimizado
  scaler.pkl           <- RobustScaler ajustado (6 features continuas)
  config_modelo.json   <- {modelo, umbral_optimo, features, variables_escaladas, ...}

El backend NO arranca sin estos archivos (prediction_service los carga al importar).

clientes_ejemplo.csv ya viene incluido y sirve para probar POST /predict/batch.