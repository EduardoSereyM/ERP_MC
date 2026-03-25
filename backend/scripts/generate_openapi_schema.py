"""
Exporta el schema OpenAPI de FastAPI a un archivo JSON.
Usar desde la raíz del proyecto: python backend/scripts/generate_openapi_schema.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app

schema = app.openapi()
output = Path(__file__).parent.parent / "openapi.json"
output.write_text(json.dumps(schema, indent=2, ensure_ascii=False))
print(f"Schema exportado a {output}")
