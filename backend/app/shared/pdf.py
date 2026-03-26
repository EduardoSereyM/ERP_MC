"""
Generación de PDF para cotizaciones — ERP MC
Usa fpdf2 (puro Python, sin dependencias de sistema).
"""

from fpdf import FPDF


def _fmt_clp(n) -> str:
    return f"${int(n):,}".replace(",", ".")


def _safe(text: str) -> str:
    """Reemplaza caracteres fuera del rango Latin-1 que Helvetica no soporta."""
    return (text
        .replace("\u2014", "-")   # em dash —
        .replace("\u2013", "-")   # en dash –
        .replace("\u2018", "'")   # comilla izq '
        .replace("\u2019", "'")   # comilla der '
        .replace("\u201c", '"')   # comilla doble izq "
        .replace("\u201d", '"')   # comilla doble der "
        .replace("\u2026", "...")  # elipsis …
    )


# Colores corporativos
_AZUL       = (0, 53, 83)      # #003553
_AZUL_CLARO = (147, 197, 253)  # #93c5fd
_GRIS_TEXT  = (71, 85, 105)    # #475569
_GRIS_BORDE = (226, 232, 240)  # #e2e8f0
_VERDE      = (5, 150, 105)    # #059669
_BLANCO     = (255, 255, 255)
_CASI_NEGRO = (30, 41, 59)     # #1e293b
_FONDO_FILA = (248, 250, 252)  # #f8fafc
_FONDO_TH   = (241, 245, 249)  # #f1f5f9


class _PDF(FPDF):
    def __init__(self, codigo: str):
        super().__init__()
        self._codigo = codigo

    def footer(self):
        self.set_y(-14)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*_GRIS_TEXT)
        self.cell(0, 6, f"MC ERP · {self._codigo}", align="C")


def generar_cotizacion_pdf(data: dict) -> bytes:
    """Genera el PDF de una cotización y devuelve los bytes."""
    pdf = _PDF(codigo=data["codigo"])
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()

    W = pdf.w - 2 * pdf.l_margin  # ancho útil

    # ── Header ────────────────────────────────────────────────────────────────
    pdf.set_fill_color(*_AZUL)
    pdf.rect(0, 0, pdf.w, 28, style="F")

    pdf.set_xy(pdf.l_margin, 7)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*_BLANCO)
    pdf.cell(W * 0.6, 8, "MC Enterprise Resource", ln=0)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*_AZUL_CLARO)
    pdf.set_xy(pdf.l_margin, 17)
    pdf.cell(W * 0.6, 6, f"Cotización {data['codigo']}", ln=0)

    # Estado en header derecho
    estado = data.get("estado", "")
    if estado:
        pdf.set_xy(pdf.l_margin + W * 0.6, 10)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*_AZUL_CLARO)
        pdf.cell(W * 0.4, 8, estado, align="R")

    pdf.ln(18)

    # ── Datos cliente y cotización ─────────────────────────────────────────────
    pdf.set_text_color(*_GRIS_TEXT)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(W * 0.5, 5, "Cliente", ln=0)
    pdf.cell(W * 0.5, 5, "Datos cotización", ln=1)

    pdf.set_text_color(*_CASI_NEGRO)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(W * 0.5, 7, data.get("cliente_razon_social", ""), ln=0)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*_GRIS_TEXT)
    right_col = []
    if data.get("codigo"):
        right_col.append(f"Número: {data['codigo']}")
    if data.get("fecha_vencimiento"):
        right_col.append(f"Válida hasta: {data['fecha_vencimiento']}")
    pdf.cell(W * 0.5, 7, "  |  ".join(right_col), ln=1)

    if data.get("cliente_rut"):
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*_GRIS_TEXT)
        pdf.cell(W * 0.5, 5, f"RUT: {data['cliente_rut']}", ln=1)

    pdf.ln(4)
    pdf.set_draw_color(*_GRIS_BORDE)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.l_margin + W, pdf.get_y())
    pdf.ln(5)

    # ── Notas cliente ─────────────────────────────────────────────────────────
    if data.get("notas_cliente"):
        pdf.set_fill_color(240, 249, 255)
        pdf.set_draw_color(14, 165, 233)
        pdf.set_line_width(0.8)
        x = pdf.l_margin
        y = pdf.get_y()
        pdf.set_xy(x + 3, y + 2)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(2, 132, 199)
        pdf.cell(W - 6, 5, "MENSAJE PARA USTED", ln=1)
        pdf.set_xy(x + 3, pdf.get_y())
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(3, 105, 161)
        pdf.multi_cell(W - 6, 5, _safe(data["notas_cliente"]))
        pdf.set_line_width(0.2)
        pdf.ln(3)

    # ── Tabla de líneas ───────────────────────────────────────────────────────
    col_w = [W * 0.44, W * 0.10, W * 0.16, W * 0.10, W * 0.20]
    headers = ["Descripción", "Cant.", "P. Unit.", "Desc.", "Subtotal"]
    aligns  = ["L", "R", "R", "R", "R"]

    # Encabezado tabla
    pdf.set_fill_color(*_FONDO_TH)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*_GRIS_TEXT)
    for i, h in enumerate(headers):
        pdf.cell(col_w[i], 7, h.upper(), border=0, align=aligns[i], fill=True)
    pdf.ln()

    # Filas
    for idx, linea in enumerate(data.get("lineas", [])):
        fill = idx % 2 == 1
        if fill:
            pdf.set_fill_color(*_FONDO_FILA)
        desc_pct = f"{linea['descuento_pct']}%" if float(linea.get("descuento_pct", 0)) > 0 else "-"
        row = [
            _safe(linea["descripcion"]),
            str(int(linea["cantidad"])),
            _fmt_clp(linea["precio_unitario"]),
            desc_pct,
            _fmt_clp(linea["subtotal"]),
        ]
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*_CASI_NEGRO)

        # Altura dinámica para descripción larga
        lines_needed = max(1, len(pdf.multi_cell(col_w[0], 5, _safe(row[0]), dry_run=True, output="LINES")))
        row_h = lines_needed * 5 + 4

        y0 = pdf.get_y()
        x0 = pdf.l_margin

        if fill:
            pdf.rect(x0, y0, W, row_h, style="F")

        pdf.set_xy(x0, y0)
        pdf.multi_cell(col_w[0], 5, row[0], border=0, fill=False, max_line_height=5)

        cell_y = y0 + (row_h - 5) / 2  # centrar verticalmente
        for i in range(1, 5):
            x0 += col_w[i - 1]
            pdf.set_xy(x0, cell_y)
            color = _VERDE if (i == 3 and desc_pct != "—") else _CASI_NEGRO
            pdf.set_text_color(*color)
            pdf.cell(col_w[i], 5, row[i], align=aligns[i])

        pdf.set_y(y0 + row_h)

    # Separador
    pdf.set_draw_color(*_GRIS_BORDE)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.l_margin + W, pdf.get_y())

    # ── Totales ───────────────────────────────────────────────────────────────
    def total_row(label: str, valor: str, bold=False, color=None):
        pdf.set_font("Helvetica", "B" if bold else "", 9 if not bold else 10)
        pdf.set_text_color(*(color or _GRIS_TEXT))
        lw = W * 0.8
        vw = W * 0.2
        pdf.cell(lw, 7, label, align="R")
        pdf.set_font("Helvetica", "B" if bold else "", 9 if not bold else 11)
        pdf.set_text_color(*(color or (_AZUL if bold else _CASI_NEGRO)))
        pdf.cell(vw, 7, valor, align="R", ln=1)

    pdf.ln(1)
    total_row("Subtotal", _fmt_clp(data["monto_subtotal"]))

    if float(data.get("descuento_global_pct", 0)) > 0:
        motivo = data.get("descuento_motivo_label", "")
        label = f"Descuento {data['descuento_global_pct']}%"
        if motivo:
            label += f" ({motivo})"
        monto_desc = float(data["monto_subtotal"]) * float(data["descuento_global_pct"]) / 100
        total_row(label, f"-{_fmt_clp(monto_desc)}", color=_VERDE)

    total_row("IVA (19%)", _fmt_clp(data["monto_iva"]))

    pdf.set_draw_color(*_GRIS_BORDE)
    pdf.line(pdf.l_margin + W * 0.6, pdf.get_y(), pdf.l_margin + W, pdf.get_y())
    pdf.ln(1)
    total_row("TOTAL", _fmt_clp(data["monto_total"]), bold=True)

    # ── Notas internas (no se muestran en PDF para cliente) ──────────────────

    return bytes(pdf.output())
