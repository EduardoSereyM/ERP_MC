-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0018: Fase 1B — SAC, ContactoObra, OrdenTrabajo, Checklist
-- ─────────────────────────────────────────────────────────────────────────────

-- ── SAC (Servicio de Atención al Cliente / Instalación) ──────────────────────

CREATE TABLE IF NOT EXISTS sac (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo              VARCHAR(20) NOT NULL UNIQUE,
    venta_id            UUID        NULL REFERENCES public.ventas(id),
    cliente_id          UUID        NOT NULL REFERENCES public.clientes(id),
    coordinador_id      UUID        NULL REFERENCES public.usuarios(id),

    estado              VARCHAR(30) NOT NULL DEFAULT 'CREADO',
    -- CREADO | REVISION_INFO | EN_GESTION_VTA | EN_COORDINACION |
    -- PROGRAMADO | REPROGRAMADO | EN_EJECUCION | COMPLETADO |
    -- GESTION_COBRO | CERRADO | CERRADO_SIN_EJECUTAR | CERRADO_SIN_TERMINAR

    tipo                VARCHAR(30) NOT NULL DEFAULT 'suministro_instalacion',
    -- suministro_instalacion | solo_instalacion

    direccion_obra      TEXT        NULL,
    comuna_obra         VARCHAR(100) NULL,
    ciudad_obra         VARCHAR(100) NULL,
    fecha_programada    DATE        NULL,
    fecha_ejecucion     DATE        NULL,
    fecha_cierre        TIMESTAMPTZ NULL,

    motivo_devolucion   TEXT        NULL,   -- al devolver a EN_GESTION_VTA
    respuesta_devolucion TEXT       NULL,   -- respuesta de ventas
    motivo_cierre       TEXT        NULL,   -- para cierres forzados
    notas               TEXT        NULL,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID        NULL REFERENCES public.usuarios(id),
    updated_by  UUID        NULL REFERENCES public.usuarios(id),
    is_deleted  BOOLEAN     NOT NULL DEFAULT FALSE,
    deleted_at  TIMESTAMPTZ NULL,
    deleted_by  UUID        NULL REFERENCES public.usuarios(id)
);

CREATE INDEX idx_sac_venta_id    ON sac(venta_id)    WHERE is_deleted = FALSE;
CREATE INDEX idx_sac_cliente_id  ON sac(cliente_id)  WHERE is_deleted = FALSE;
CREATE INDEX idx_sac_estado      ON sac(estado)      WHERE is_deleted = FALSE;
CREATE INDEX idx_sac_coordinador ON sac(coordinador_id) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_sac_updated_at
    BEFORE UPDATE ON sac
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── ContactoObra (múltiples por SAC) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contacto_obra (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    sac_id      UUID        NOT NULL REFERENCES public.sac(id) ON DELETE CASCADE,
    nombre      VARCHAR(200) NOT NULL,
    cargo       VARCHAR(50)  NOT NULL DEFAULT 'otro',
    -- administrador | jefe_bodega | prevencion_riesgos |
    -- responsable_despacho | responsable_ingreso | otro
    telefono    VARCHAR(30)  NULL,
    email       VARCHAR(200) NULL,
    es_principal BOOLEAN     NOT NULL DEFAULT FALSE,
    notas       TEXT        NULL,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID        NULL REFERENCES public.usuarios(id),
    updated_by  UUID        NULL REFERENCES public.usuarios(id),
    is_deleted  BOOLEAN     NOT NULL DEFAULT FALSE,
    deleted_at  TIMESTAMPTZ NULL,
    deleted_by  UUID        NULL REFERENCES public.usuarios(id)
);

CREATE INDEX idx_contacto_obra_sac ON contacto_obra(sac_id) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_contacto_obra_updated_at
    BEFORE UPDATE ON contacto_obra
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── OrdenTrabajo ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ordenes_trabajo (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo                  VARCHAR(20) NOT NULL UNIQUE,
    sac_id                  UUID        NOT NULL REFERENCES public.sac(id),
    supervisor_id           UUID        NULL REFERENCES public.usuarios(id),
    contratista_id          UUID        NULL REFERENCES public.usuarios(id),

    estado                  VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    -- PENDIENTE | EN_EJECUCION | PAUSADA | ENTREGA_PARCIAL |
    -- COMPLETADA | CERRADA_ADMIN | CERRADA_SIN_EJECUTAR | CERRADA_SIN_TERMINAR

    fecha_inicio            DATE        NULL,
    fecha_fin_real          DATE        NULL,
    checklist_completado    BOOLEAN     NOT NULL DEFAULT FALSE,
    duracion_total_minutos  INTEGER     NULL,

    motivo_pausa            TEXT        NULL,
    motivo_cierre           TEXT        NULL,
    notas                   TEXT        NULL,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID        NULL REFERENCES public.usuarios(id),
    updated_by  UUID        NULL REFERENCES public.usuarios(id),
    is_deleted  BOOLEAN     NOT NULL DEFAULT FALSE,
    deleted_at  TIMESTAMPTZ NULL,
    deleted_by  UUID        NULL REFERENCES public.usuarios(id)
);

CREATE INDEX idx_ot_sac_id   ON ordenes_trabajo(sac_id)  WHERE is_deleted = FALSE;
CREATE INDEX idx_ot_estado   ON ordenes_trabajo(estado)  WHERE is_deleted = FALSE;

CREATE TRIGGER trg_ot_updated_at
    BEFORE UPDATE ON ordenes_trabajo
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── ChecklistPlantilla ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS checklist_plantillas (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(200) NOT NULL,
    tipo_trabajo VARCHAR(50) NOT NULL DEFAULT 'instalacion',
    -- instalacion | servicio_tecnico | ambos
    activo      BOOLEAN     NOT NULL DEFAULT TRUE,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID        NULL REFERENCES public.usuarios(id),
    updated_by  UUID        NULL REFERENCES public.usuarios(id)
);

CREATE TRIGGER trg_checklist_plantilla_updated_at
    BEFORE UPDATE ON checklist_plantillas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── ChecklistPregunta ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS checklist_preguntas (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    plantilla_id    UUID        NOT NULL REFERENCES public.checklist_plantillas(id),
    orden           INTEGER     NOT NULL DEFAULT 0,
    texto           TEXT        NOT NULL,
    tipo_respuesta  VARCHAR(20) NOT NULL DEFAULT 'si_no',
    -- si_no | texto | numero | foto | firma
    obligatorio     BOOLEAN     NOT NULL DEFAULT TRUE,
    permite_foto    BOOLEAN     NOT NULL DEFAULT FALSE,
    activo          BOOLEAN     NOT NULL DEFAULT TRUE,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cp_plantilla ON checklist_preguntas(plantilla_id);


-- ── ChecklistRespuesta ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS checklist_respuestas (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    entidad_tipo    VARCHAR(20) NOT NULL,  -- ot | st
    entidad_id      UUID        NOT NULL,
    pregunta_id     UUID        NOT NULL REFERENCES public.checklist_preguntas(id),
    respondido_por  UUID        NOT NULL REFERENCES public.usuarios(id),

    respuesta_texto     TEXT    NULL,
    respuesta_boolean   BOOLEAN NULL,
    foto_url            TEXT    NULL,
    respondido_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_cr_entidad_pregunta ON checklist_respuestas(entidad_tipo, entidad_id, pregunta_id);
CREATE INDEX idx_cr_entidad ON checklist_respuestas(entidad_tipo, entidad_id);


-- ── Secuencias para fase 1B (OT) ─────────────────────────────────────────────
-- INS ya existe desde migration 0014
INSERT INTO secuencias (tipo_entidad, prefijo, ultimo_valor)
VALUES ('ot', 'OT', 0)
ON CONFLICT (tipo_entidad) DO NOTHING;


-- ── Seed: plantilla checklist base instalación ───────────────────────────────

INSERT INTO checklist_plantillas (id, nombre, tipo_trabajo) VALUES
    ('00000000-0000-0000-0001-000000000001', 'Instalación estándar', 'instalacion')
ON CONFLICT DO NOTHING;

INSERT INTO checklist_preguntas (plantilla_id, orden, texto, tipo_respuesta, obligatorio, permite_foto) VALUES
    ('00000000-0000-0000-0001-000000000001', 1, '¿Se verificó la superficie antes de instalar?', 'si_no', TRUE, TRUE),
    ('00000000-0000-0000-0001-000000000001', 2, '¿El material recibido coincide con la cotización (tipo, cantidad, color)?', 'si_no', TRUE, FALSE),
    ('00000000-0000-0000-0001-000000000001', 3, '¿Se realizó la limpieza y preparación del área?', 'si_no', TRUE, FALSE),
    ('00000000-0000-0000-0001-000000000001', 4, '¿La instalación fue completada en su totalidad?', 'si_no', TRUE, TRUE),
    ('00000000-0000-0000-0001-000000000001', 5, '¿Se realizó limpieza posterior a la instalación?', 'si_no', TRUE, FALSE),
    ('00000000-0000-0000-0001-000000000001', 6, 'Observaciones finales', 'texto', FALSE, FALSE)
ON CONFLICT DO NOTHING;


-- ── RLS básico ───────────────────────────────────────────────────────────────

ALTER TABLE sac ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacto_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_respuestas ENABLE ROW LEVEL SECURITY;

-- Política permisiva base (acceso a usuarios autenticados)
-- El control fino se hace en el backend con require_rol()
CREATE POLICY sac_autenticados ON sac FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY contacto_obra_autenticados ON contacto_obra FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY ot_autenticados ON ordenes_trabajo FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY plantilla_autenticados ON checklist_plantillas FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY pregunta_autenticados ON checklist_preguntas FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY respuesta_autenticados ON checklist_respuestas FOR ALL USING (auth.uid() IS NOT NULL);
