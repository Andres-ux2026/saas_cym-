import requests
from datetime import datetime


URL_SP = "https://www.spensiones.cl/apps/afiliado/consultaAfi/index.php"


def consultar_afp(rut):
    cuerpo, dv = rut.replace(".", "").split("-")

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    })

    try:
        resp = session.get(URL_SP, timeout=15)
        resp.raise_for_status()
    except requests.RequestException:
        return None

    try:
        resp2 = session.post(
            URL_SP,
            data={"USUARIO": cuerpo, "CLAVE": dv},
            timeout=15,
        )
        resp2.raise_for_status()
    except requests.RequestException:
        return None

    if "No se encontraron resultados" in resp2.text:
        return {"error": "No se encontraron datos para este RUT"}

    datos = {}
    try:
        text = resp2.text
        tablas = text.split("<table")
        for tabla in tablas:
            filas = tabla.split("<tr")
            for fila in filas:
                celdas = fila.split("<td")
                if len(celdas) >= 3:
                    clave = _extraer_texto(celdas[1])
                    valor = _extraer_texto(celdas[2])
                    if clave and valor:
                        datos[clave.strip()] = valor.strip()
    except Exception:
        pass

    if not datos.get("AFP"):
        if "AFP" in resp2.text:
            datos["AFP"] = _extract_afp_fallback(resp2.text)
        else:
            return {"error": "No se pudieron extraer datos"}

    return {
        "afp": datos.get("AFP", ""),
        "fecha_afiliacion": _parse_fecha(datos.get("Fecha de Afiliaci\u00f3n", "")),
        "estado": datos.get("Estado", ""),
        "tipo": datos.get("Tipo de Trabajador", ""),
        "nombres": datos.get("Nombres", ""),
        "apellidos": datos.get("Apellidos", ""),
    }


def _extraer_texto(celda):
    import re
    texto = re.sub(r"<[^>]+>", "", celda)
    texto = texto.replace("&nbsp;", "").strip()
    return texto


def _extract_afp_fallback(html):
    import re
    m = re.search(r"AFP[^<]*?</td>\s*<td[^>]*>([^<]+)", html, re.I)
    if m:
        return m.group(1).strip()
    return ""


def _parse_fecha(texto):
    if not texto:
        return None
    for fmt in ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"]:
        try:
            return datetime.strptime(texto.strip(), fmt).date()
        except ValueError:
            continue
    return None
