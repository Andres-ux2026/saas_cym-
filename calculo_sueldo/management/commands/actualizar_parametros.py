import re
from decimal import Decimal
from bs4 import BeautifulSoup
import requests
from django.core.management.base import BaseCommand
from django.utils import timezone
from calculo_sueldo.models import ParametroPrevisional, TasaAFP, TramoImpuestoUnico, CambioParametroLog

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


class Command(BaseCommand):
    help = "Actualiza parámetros previsionales desde PreviRed y SII"

    def handle(self, *args, **options):
        self.stdout.write("Obteniendo indicadores desde PreviRed...")
        data = self.scrape_previred()
        if not data:
            self.stdout.write(self.style.ERROR("No se pudieron obtener datos de PreviRed"))
            return

        self.stdout.write("Obteniendo tabla Impuesto Único desde SII...")
        utm_val = data.get("valor_utm", Decimal("0"))
        tramos = self.scrape_sii(utm_val)
        if not tramos:
            self.stdout.write(self.style.WARNING("No se obtuvo tabla SII"))

        params, created = ParametroPrevisional.objects.get_or_create(
            mes=data["mes"],
            defaults={k: v for k, v in data.items() if k != "mes"},
        )
        if not created:
            cambios = self.detectar_cambios(params, data)
            params.fuente = "previred"
            for k, v in data.items():
                if k != "mes" and hasattr(params, k):
                    setattr(params, k, v)
            params.save()
            self.registrar_cambios(params, cambios)
        else:
            params.hash_checksum = params.calcular_hash()
            params.save()
            self.stdout.write(self.style.SUCCESS(f"Nuevos parámetros guardados: {params.mes}"))

        self.sincronizar_tasas_afp(params.mes)
        if tramos:
            self.sincronizar_tramos_impuesto(tramos)

        self.stdout.write(self.style.SUCCESS("Actualización completada."))

    def _parse_cl(self, raw):
        """Convierte string chileno '$ 40.820,31' -> Decimal('40820.31')"""
        if raw is None:
            return Decimal("0")
        if isinstance(raw, Decimal):
            return raw
        s = raw.strip().replace("$", "").replace(".", "").replace(",", ".").strip()
        nums = re.findall(r"[\d.]+", s)
        if nums:
            try:
                return Decimal(nums[0])
            except Exception:
                pass
        return Decimal("0")

    def _cell_val(self, cell):
        return cell.get_text(strip=True) if cell else ""

    def scrape_previred(self):
        try:
            resp = requests.get(
                "https://www.previred.com/indicadores-previsionales/",
                headers=HEADERS, timeout=30,
            )
            resp.encoding = "utf-8"
            soup = BeautifulSoup(resp.text, "html.parser")
            tablas = soup.find_all("table")

            def row_text(idx, col):
                if idx >= len(tablas):
                    return ""
                filas = tablas[idx].find_all("tr")
                for f in filas:
                    celdas = f.find_all(["td", "th"])
                    if len(celdas) > col:
                        txt = celdas[col].get_text(strip=True)
                        if txt:
                            return txt
                return ""

            def val(idx, col, label_key=None, col_key=0):
                if idx >= len(tablas):
                    return "0"
                if label_key:
                    for f in tablas[idx].find_all("tr"):
                        celdas = f.find_all(["td", "th"])
                        if len(celdas) > col and len(celdas) > col_key:
                            if label_key in celdas[col_key].get_text(strip=True):
                                return celdas[col].get_text(strip=True)
                return row_text(idx, col)

            # --- UF (Tabla 1) ---
            items1 = tablas[1].find_all("tr")
            uf_val = Decimal("0")
            for f in items1:
                celdas = f.find_all(["td", "th"])
                if len(celdas) >= 2:
                    txt = celdas[1].get_text(strip=True)
                    if "junio" in celdas[0].get_text(strip=True).lower() or "$" in txt:
                        uf_val = self._parse_cl(txt)
                        break

            # --- UTM (Tabla 7) ---
            utm_val = Decimal("0")
            for f in tablas[7].find_all("tr"):
                celdas = f.find_all(["td", "th"])
                if len(celdas) >= 3 and celdas[1].get_text(strip=True) == "UTM":
                    continue  # header
                if len(celdas) >= 3 and celdas[2].get_text(strip=True):
                    utm_val = self._parse_cl(celdas[1].get_text(strip=True))
                    break

            # --- Sueldo mínimo (Tabla 8) ---
            sm_val = Decimal("0")
            sm_keywords = ["dependiente", "independiente"]
            for f in tablas[8].find_all("tr"):
                celdas = f.find_all(["td", "th"])
                if len(celdas) >= 2:
                    txt = celdas[0].get_text(strip=True).lower()
                    if any(k in txt for k in sm_keywords):
                        sm_val = self._parse_cl(celdas[1].get_text(strip=True))
                        break

            # --- Topes (Tabla 2) ---
            tope_afp = val(2, 1, "AFP (90 UF)")
            tope_ips = val(2, 1, "IPS (ex INP)")
            tope_seg_ces = val(2, 1, "Cesantía")

            if not uf_val or uf_val == 0:
                return None

            mes_actual = timezone.now().replace(day=1)

            return {
                "mes": mes_actual,
                "valor_uf": uf_val,
                "valor_utm": utm_val,
                "sueldo_minimo": sm_val,
                "tope_imponible_afp": self._parse_cl(tope_afp),
                "tope_imponible_ips": self._parse_cl(tope_ips) if tope_ips != "0" else None,
                "tope_imponible_seg_ces": self._parse_cl(tope_seg_ces),
                "tasa_fonasa": Decimal("7.0"),
                "tasa_afc_trabajador": Decimal("0.6"),
                "tasa_afc_empresa_indefinido": Decimal("2.4"),
                "tasa_afc_empresa_plazofijo": Decimal("3.0"),
                "tasa_afc_empresa_11anos": Decimal("0.8"),
                "tasa_afc_empresa_casaparticular": Decimal("3.0"),
                "tasa_sis": Decimal("1.62"),
                "tasa_seguro_social": Decimal("0.9"),
                "tope_gratificacion": sm_val * Decimal("4.75"),
                "tope_sueldo_gratificacion": sm_val * Decimal("19"),
            }
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error scraping PreviRed: {e}"))
            return None

    def scrape_sii(self, utm_val=Decimal("0")):
        try:
            resp = requests.get(
                "https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm",
                headers=HEADERS, timeout=30,
            )
            resp.encoding = "utf-8"
            soup = BeautifulSoup(resp.text, "html.parser")
            tablas = soup.find_all("table")
            if not tablas or utm_val <= 0:
                return None

            filas = tablas[0].find_all("tr")
            tramos = []
            in_monthly = False

            for fila in filas:
                celdas = fila.find_all("td")
                if len(celdas) < 6:
                    continue

                texts = [c.get_text(strip=True) for c in celdas]

                if texts[0] == "MENSUAL" and "-.-" in texts[1]:
                    in_monthly = True
                    # Extract exento upper bound
                    exento_hasta_clp = self._parse_cl(celdas[2].get_text(strip=True))
                    if exento_hasta_clp > 0 and utm_val > 0:
                        exento_hasta_utm = exento_hasta_clp / utm_val
                        tramos.append((Decimal("0"), exento_hasta_utm, Decimal("0"), Decimal("0")))
                    continue
                if texts[0] and texts[0] != "MENSUAL" and in_monthly:
                    break

                if not in_monthly or not texts[1].startswith("$"):
                    continue

                try:
                    desde_clp = self._parse_cl(celdas[1].get_text(strip=True))
                    hasta_raw = celdas[2].get_text(strip=True)
                    hasta_clp = self._parse_cl(hasta_raw) if "Y MÁS" not in hasta_raw else Decimal("99999999")
                    factor_raw = celdas[3].get_text(strip=True).replace(",", ".").replace("%", "").strip()
                    factor = Decimal(factor_raw) if factor_raw.replace(".", "").isdigit() else Decimal("0")
                    rebaja_clp = self._parse_cl(celdas[4].get_text(strip=True))

                    # Convert CLP to UTM
                    desde_utm = desde_clp / utm_val
                    hasta_utm = hasta_clp / utm_val
                    rebaja_utm = rebaja_clp / utm_val

                    if desde_utm > 0:
                        tramos.append((desde_utm, hasta_utm, factor, rebaja_utm))
                except Exception:
                    continue

            return tramos
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error scraping SII: {e}"))
            return None

    def detectar_cambios(self, params, data):
        cambios = []
        for k, v in data.items():
            if k == "mes" or not hasattr(params, k):
                continue
            old = str(getattr(params, k))
            new = str(v)
            if old != new:
                cambios.append((k, old, new))
        return cambios

    def registrar_cambios(self, params, cambios):
        for campo, old, new in cambios:
            CambioParametroLog.objects.create(
                parametro=params,
                campo_cambiado=campo,
                valor_anterior=old,
                valor_nuevo=new,
            )
        if cambios:
            self.stdout.write(self.style.WARNING(f"Se detectaron {len(cambios)} cambios"))

    def sincronizar_tasas_afp(self, mes):
        tasas_default = [
            ("AFP Capital", Decimal("11.44"), Decimal("1.62"), Decimal("13.06")),
            ("AFP Cuprum", Decimal("11.44"), Decimal("1.62"), Decimal("13.06")),
            ("AFP Habitat", Decimal("11.27"), Decimal("1.62"), Decimal("12.89")),
            ("AFP PlanVital", Decimal("11.16"), Decimal("1.62"), Decimal("12.78")),
            ("AFP ProVida", Decimal("11.45"), Decimal("1.62"), Decimal("13.07")),
            ("AFP Modelo", Decimal("10.58"), Decimal("1.62"), Decimal("12.20")),
            ("AFP UNO", Decimal("10.46"), Decimal("1.62"), Decimal("12.08")),
            ("Sin AFP", Decimal("0"), Decimal("0"), Decimal("0")),
        ]
        for nombre, cotiz, sis, total in tasas_default:
            TasaAFP.objects.update_or_create(
                nombre=nombre,
                defaults={
                    "tasa_cotizacion": cotiz,
                    "tasa_sis": sis,
                    "tasa_total": total,
                    "vigente_desde": mes,
                },
            )

    def sincronizar_tramos_impuesto(self, tramos):
        mes = timezone.now().replace(day=1)
        for desde, hasta, factor, rebaja in tramos:
            is_infinite = hasta >= 99999999
            TramoImpuestoUnico.objects.update_or_create(
                desde_utm=desde,
                defaults={
                    "hasta_utm": None if is_infinite else hasta,
                    "factor": factor,
                    "rebaja_utm": rebaja,
                    "vigente_desde": mes,
                },
            )
