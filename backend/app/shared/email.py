"""
Servicio de email — ERP MC
Usa smtplib con SSL (port 465) sin dependencias externas adicionales.
"""

import smtplib
import ssl
from decimal import Decimal
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def _fmt_clp(n) -> str:
    return f"${int(n):,}".replace(",", ".")


def _build_cotizacion_html(data: dict) -> str:
    """Genera el HTML de la cotización para el correo al cliente."""
    lineas_html = ""
    for l in data.get("lineas", []):
        desc_pct = f"{l['descuento_pct']}%" if float(l.get("descuento_pct", 0)) > 0 else "—"
        lineas_html += f"""
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#1e293b">{l['descripcion']}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;color:#475569">{l['cantidad']}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;color:#475569">{_fmt_clp(l['precio_unitario'])}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;color:#059669">{desc_pct}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-weight:600;color:#1e293b">{_fmt_clp(l['subtotal'])}</td>
        </tr>"""

    descuento_row = ""
    if float(data.get("descuento_global_pct", 0)) > 0:
        motivo = data.get("descuento_motivo_label", "")
        monto_desc = float(data["monto_subtotal"]) * float(data["descuento_global_pct"]) / 100
        descuento_row = f"""
        <tr>
          <td colspan="4" style="padding:8px 12px;text-align:right;color:#059669">
            Descuento {data['descuento_global_pct']}%{f' ({motivo})' if motivo else ''}
          </td>
          <td style="padding:8px 12px;text-align:right;font-family:monospace;color:#059669">-{_fmt_clp(monto_desc)}</td>
        </tr>"""

    notas_cliente = ""
    if data.get("notas_cliente"):
        notas_cliente = f"""
        <div style="margin-top:24px;padding:16px;background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:4px">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#0284c7;text-transform:uppercase">Mensaje para usted</p>
          <p style="margin:0;color:#0369a1;font-size:14px">{data['notas_cliente']}</p>
        </div>"""

    vence = data.get("fecha_vencimiento", "")

    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:680px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">

    <!-- Header -->
    <div style="background:#003553;padding:28px 32px;color:#fff">
      <h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-.5px">MC Enterprise Resource</h1>
      <p style="margin:6px 0 0;color:#93c5fd;font-size:13px">Cotización {data['codigo']}</p>
    </div>

    <!-- Body -->
    <div style="padding:32px">
      <p style="margin:0 0 6px;font-size:14px;color:#64748b">Estimado/a</p>
      <p style="margin:0 0 24px;font-size:18px;font-weight:600;color:#1e293b">{data['cliente_razon_social']}</p>

      <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6">
        Adjuntamos a continuación la cotización <strong>{data['codigo']}</strong>,
        con validez hasta el <strong>{vence}</strong>.
      </p>

      {notas_cliente}

      <!-- Tabla de líneas -->
      <div style="margin-top:24px;overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f1f5f9">
              <th style="padding:10px 12px;text-align:left;font-weight:600;color:#64748b;text-transform:uppercase;font-size:11px">Descripción</th>
              <th style="padding:10px 12px;text-align:right;font-weight:600;color:#64748b;text-transform:uppercase;font-size:11px">Cant.</th>
              <th style="padding:10px 12px;text-align:right;font-weight:600;color:#64748b;text-transform:uppercase;font-size:11px">P. Unit.</th>
              <th style="padding:10px 12px;text-align:right;font-weight:600;color:#64748b;text-transform:uppercase;font-size:11px">Desc.</th>
              <th style="padding:10px 12px;text-align:right;font-weight:600;color:#64748b;text-transform:uppercase;font-size:11px">Subtotal</th>
            </tr>
          </thead>
          <tbody>{lineas_html}</tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="padding:10px 12px;text-align:right;color:#64748b;font-size:13px">Subtotal</td>
              <td style="padding:10px 12px;text-align:right;font-family:monospace;color:#64748b">{_fmt_clp(data['monto_subtotal'])}</td>
            </tr>
            {descuento_row}
            <tr>
              <td colspan="4" style="padding:10px 12px;text-align:right;color:#64748b;font-size:13px">IVA (19%)</td>
              <td style="padding:10px 12px;text-align:right;font-family:monospace;color:#64748b">{_fmt_clp(data['monto_iva'])}</td>
            </tr>
            <tr style="background:#f8fafc">
              <td colspan="4" style="padding:12px;text-align:right;font-weight:700;font-size:15px;color:#1e293b;border-top:2px solid #e2e8f0">Total</td>
              <td style="padding:12px;text-align:right;font-family:monospace;font-weight:700;font-size:16px;color:#003553;border-top:2px solid #e2e8f0">{_fmt_clp(data['monto_total'])}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
      <p style="margin:0;font-size:12px;color:#94a3b8">
        Este correo fue generado automáticamente por MC ERP · {data.get('fecha_envio', '')}
      </p>
    </div>
  </div>
</body>
</html>"""


def enviar_cotizacion(destinatario: str, data: dict) -> None:
    """
    Envía la cotización por correo al destinatario.
    Lanza excepción si falla — el llamador decide cómo manejarla.
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Cotización {data['codigo']} — {data['cliente_razon_social']}"
    msg["From"]    = f"{settings.EMAIL_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"]      = destinatario

    html = _build_cotizacion_html(data)
    msg.attach(MIMEText(html, "html", "utf-8"))

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context) as server:
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USER, destinatario, msg.as_string())
