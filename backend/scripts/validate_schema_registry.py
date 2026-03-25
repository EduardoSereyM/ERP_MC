"""
Valida que SCHEMA_MAP.md esté actualizado con las migraciones existentes.
Ejecutar desde la raíz del monorepo: python backend/scripts/validate_schema_registry.py
"""

import re
import sys
from pathlib import Path

MIGRATIONS_DIR = Path("supabase/migrations")
SCHEMA_MAP = Path("docs/SCHEMA_MAP.md")

errors = 0

if not MIGRATIONS_DIR.exists():
    print("ERROR: No se encontró supabase/migrations/")
    sys.exit(1)

if not SCHEMA_MAP.exists():
    print("ERROR: No se encontró docs/SCHEMA_MAP.md")
    sys.exit(1)

schema_content = SCHEMA_MAP.read_text(encoding="utf-8")
migrations = sorted(MIGRATIONS_DIR.glob("*.sql"))

print(f"Validando {len(migrations)} migraciones contra SCHEMA_MAP.md...")

for migration in migrations:
    # Extraer nombre de tabla del archivo SQL (heurística básica)
    sql = migration.read_text(encoding="utf-8")
    tablas = re.findall(r"create table (?:public\.)?(\w+)", sql, re.IGNORECASE)
    for tabla in tablas:
        if tabla not in schema_content:
            print(f"⚠️  Tabla '{tabla}' en {migration.name} no aparece en SCHEMA_MAP.md")
            errors += 1

if errors == 0:
    print("✅  SCHEMA_MAP.md está actualizado")
else:
    print(f"⚠️  {errors} tablas sin documentar en SCHEMA_MAP.md")
    sys.exit(1)
