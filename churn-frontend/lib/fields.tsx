// Definición declarativa del formulario de predicción individual.
// Las claves coinciden con ClientInput y los rangos con la validación
// Pydantic del backend (sacados del EDA documentado).

import type { ClientInput } from "./types";

export type FieldType = "number" | "binary" | "segmented";
export type GroupId = "cliente" | "banco";

export interface FieldDef {
  name: keyof ClientInput;
  label: string;
  hint?: string;
  type: FieldType;
  min?: number;
  max?: number;
  step?: number;
  options?: number[];     // para segmented
  defaultValue: number;
  group: GroupId;
  fullWidth?: boolean;    // ocupa las 2 columnas
}

export const GROUPS: { id: GroupId; label: string }[] = [
  { id: "cliente", label: "Datos del cliente" },
  { id: "banco", label: "Relación con el banco" },
];

export const CLIENT_FIELDS: FieldDef[] = [
  // Cliente
  { name: "age", label: "Edad", type: "number", min: 18, max: 100, step: 1, defaultValue: 42, group: "cliente" },
  { name: "credit_score", label: "Score crediticio", hint: "350 – 850", type: "number", min: 350, max: 850, step: 1, defaultValue: 619, group: "cliente" },
  { name: "estimated_salary", label: "Salario estimado anual", type: "number", min: 0, step: 1000, defaultValue: 100000, group: "cliente", fullWidth: true },

  // Banco
  { name: "tenure", label: "Años como cliente", type: "number", min: 0, max: 10, step: 1, defaultValue: 5, group: "banco" },
  { name: "balance", label: "Saldo en cuenta", type: "number", min: 0, step: 100, defaultValue: 0, group: "banco" },
  { name: "products_number", label: "Productos contratados", type: "segmented", options: [1, 2, 3, 4], defaultValue: 1, group: "banco", fullWidth: true },
  { name: "credit_card", label: "Tarjeta de crédito", type: "binary", defaultValue: 1, group: "banco" },
  { name: "active_member", label: "Miembro activo", type: "binary", defaultValue: 1, group: "banco" },
];

export function buildInitialValues(): Record<string, number> {
  return CLIENT_FIELDS.reduce(
    (acc, f) => ({ ...acc, [f.name]: f.defaultValue }),
    {} as Record<string, number>
  );
}
