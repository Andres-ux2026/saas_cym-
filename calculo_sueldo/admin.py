from django.contrib import admin
from .models import ParametroPrevisional, TasaAFP, TramoImpuestoUnico, ConfiguracionVoz, CambioParametroLog, Empresa, RelacionMandante, PlantillaContrato, DocumentoCarnet, Contrato, AnexoContrato, PactoHorasExtra, AlertaConfig, Alerta, DatoPrevisional, Liquidacion, Finiquito, Vacacion, SolicitudVacacion

@admin.register(ParametroPrevisional)
class ParametroPrevisionalAdmin(admin.ModelAdmin):
    list_display = ["mes", "fuente", "valor_uf", "valor_utm", "sueldo_minimo", "hash_checksum"]
    list_filter = ["fuente", "mes"]
    search_fields = ["mes"]

@admin.register(TasaAFP)
class TasaAFPAdmin(admin.ModelAdmin):
    list_display = ["nombre", "tasa_cotizacion", "tasa_sis", "tasa_total", "vigente_desde"]

@admin.register(TramoImpuestoUnico)
class TramoImpuestoUnicoAdmin(admin.ModelAdmin):
    list_display = ["desde_utm", "hasta_utm", "factor", "rebaja_utm", "vigente_desde"]

@admin.register(ConfiguracionVoz)
class ConfiguracionVozAdmin(admin.ModelAdmin):
    list_display = ["usuario", "asistente_activado", "respuestas_voz", "notificacion_whatsapp"]

@admin.register(CambioParametroLog)
class CambioParametroLogAdmin(admin.ModelAdmin):
    list_display = ["campo_cambiado", "valor_anterior", "valor_nuevo", "revisado", "created_at"]
    list_filter = ["revisado", "campo_cambiado"]

@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ["rut", "razon_social", "contacto_email"]
    search_fields = ["rut", "razon_social"]

@admin.register(RelacionMandante)
class RelacionMandanteAdmin(admin.ModelAdmin):
    list_display = ["empresa", "rut_mandante", "razon_social_mandante"]
    list_filter = ["empresa"]

@admin.register(PlantillaContrato)
class PlantillaContratoAdmin(admin.ModelAdmin):
    list_display = ["cargo", "nombre"]

@admin.register(DocumentoCarnet)
class DocumentoCarnetAdmin(admin.ModelAdmin):
    list_display = ["rut_trabajador", "nombres", "apellidos"]
    search_fields = ["rut_trabajador", "nombres"]

@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display = ["nombres", "apellidos", "empresa", "tipo", "fecha_inicio"]
    list_filter = ["tipo", "empresa"]
    search_fields = ["nombres", "rut_trabajador"]

@admin.register(AnexoContrato)
class AnexoContratoAdmin(admin.ModelAdmin):
    list_display = ["contrato", "clausula_modificada", "created_at"]

@admin.register(PactoHorasExtra)
class PactoHorasExtraAdmin(admin.ModelAdmin):
    list_display = ["contrato", "fecha_inicio", "fecha_fin", "activo", "renovado", "numero_renovacion"]
    list_filter = ["activo", "renovado"]

@admin.register(AlertaConfig)
class AlertaConfigAdmin(admin.ModelAdmin):
    list_display = ["empresa", "email_notificar", "whatsapp_activo"]

@admin.register(Alerta)
class AlertaAdmin(admin.ModelAdmin):
    list_display = ["tipo", "empresa", "titulo", "leido", "created_at"]
    list_filter = ["tipo", "leido", "empresa"]

@admin.register(DatoPrevisional)
class DatoPrevisionalAdmin(admin.ModelAdmin):
    list_display = ["rut_trabajador", "nombres", "apellidos", "afp"]

@admin.register(Liquidacion)
class LiquidacionAdmin(admin.ModelAdmin):
    list_display = ["contrato", "periodo", "total_imponible", "liquido", "costo_empleador"]
    list_filter = ["periodo"]

@admin.register(Finiquito)
class FiniquitoAdmin(admin.ModelAdmin):
    list_display = ["contrato", "fecha_termino", "causal", "total_haberes", "liquido"]
    list_filter = ["causal", "fecha_termino"]

@admin.register(Vacacion)
class VacacionAdmin(admin.ModelAdmin):
    list_display = ["contrato", "anio", "dias_correspondientes", "dias_pendientes_anterior", "dias_disfrutados"]
    list_filter = ["anio"]

@admin.register(SolicitudVacacion)
class SolicitudVacacionAdmin(admin.ModelAdmin):
    list_display = ["vacacion", "fecha_inicio", "fecha_termino", "dias_solicitados", "estado"]
    list_filter = ["estado"]
