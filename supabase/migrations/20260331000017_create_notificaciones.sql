-- Migration 0017: tabla de notificaciones in-app
-- Almacena notificaciones por usuario; sin soft delete (se purgan por fecha).

CREATE TABLE IF NOT EXISTS notificaciones (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    tipo            VARCHAR(50) NOT NULL,        -- stub_creado | stub_completado | stub_rechazado
    titulo          VARCHAR(200) NOT NULL,
    mensaje         TEXT,
    leida           BOOLEAN     NOT NULL DEFAULT FALSE,
    entity_type     VARCHAR(50),                 -- stubs | ventas | cotizaciones
    entity_id       UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notificaciones_user_leida ON notificaciones(user_id, leida);
CREATE INDEX idx_notificaciones_user_created ON notificaciones(user_id, created_at DESC);

-- RLS: cada usuario solo ve sus propias notificaciones
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY notificaciones_user_policy ON notificaciones
    FOR ALL
    USING (user_id = auth.uid());
