#!/bin/bash
# Valida la arquitectura espejo: cada módulo en frontend debe existir en backend y viceversa.
# Ejecutar desde la raíz del monorepo.

FRONTEND_DIR="frontend/src/modules"
BACKEND_DIR="backend/app/modules"
ERRORS=0

echo "Validando arquitectura espejo..."

if [ ! -d "$FRONTEND_DIR" ] || [ ! -d "$BACKEND_DIR" ]; then
  echo "ERROR: No se encontraron los directorios de módulos."
  exit 1
fi

# Frontend → Backend
for module_path in "$FRONTEND_DIR"/*/; do
  module=$(basename "$module_path")
  if [ ! -d "$BACKEND_DIR/$module" ]; then
    echo "❌  frontend/src/modules/$module  →  SIN espejo en backend/app/modules/$module"
    ERRORS=$((ERRORS + 1))
  fi
done

# Backend → Frontend
for module_path in "$BACKEND_DIR"/*/; do
  module=$(basename "$module_path")
  if [ ! -d "$FRONTEND_DIR/$module" ]; then
    echo "❌  backend/app/modules/$module  →  SIN espejo en frontend/src/modules/$module"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ $ERRORS -eq 0 ]; then
  echo "✅  Arquitectura espejo validada correctamente ($(ls $FRONTEND_DIR | wc -l | tr -d ' ') módulos)"
  exit 0
else
  echo "❌  Se encontraron $ERRORS violaciones de arquitectura espejo"
  exit 1
fi
