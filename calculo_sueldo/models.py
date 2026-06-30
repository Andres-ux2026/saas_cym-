import hashlib, json
from django.db import models
from django.contrib.auth.models import User

class ParametroPrevisional(models.Model):
    mes = models.DateField(verbose_name="Mes de remuneración")
    fuente = models.CharField(max_length=20, default="previred", choices=[
        ("previred", "PreviRed"), ("sii", "SII"), ("manual", "Manual")
    ])
    valor_uf = models.DecimalField(max_digits=12, decimal_places=2)
    valor_utm = models.DecimalField(max_digits=12, decimal_places=2)
    sueldo_minimo = models.DecimalField(max_digits=12, decimal_places=2)
    tope_imponible_afp = models.DecimalField(max_digits=14, decimal_places=2)
    tope_imponible_ips = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    tope_imponible_seg_ces = models.DecimalField(max_digits=14, decimal_places=2)
    tasa_fonasa = models.DecimalField(max_digits=6, decimal_places=4, default=7)
    tasa_afc_trabajador = models.DecimalField(max_digits=6, decimal_places=4, default=0.6)
    tasa_afc_empresa_indefinido = models.DecimalField(max_digits=6, decimal_places=4, default=2.4)
    tasa_afc_empresa_plazofijo = models.DecimalField(max_digits=6, decimal_places=4, default=3.0)
    tasa_afc_empresa_11anos = models.DecimalField(max_digits=6, decimal_places=4, default=0.8)
    tasa_afc_empresa_casaparticular = models.DecimalField(max_digits=6, decimal_places=4, default=3.0)
    tasa_sis = models.DecimalField(max_digits=6, decimal_places=4, default=1.62)
    tasa_seguro_social = models.DecimalField(max_digits=6, decimal_places=4, default=0.9)
    tope_gratificacion = models.DecimalField(max_digits=12, decimal_places=2)
    tope_sueldo_gratificacion = models.DecimalField(max_digits=12, decimal_places=2)
    hash_checksum = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-mes"]
        verbose_name = "Parámetro Previsional"
        verbose_name_plural = "Parámetros Previsionales"

    def __str__(self):
        return f"Parámetros {self.mes.strftime('%Y-%m')}"

    def calcular_hash(self):
        data = {
            "uf": float(self.valor_uf),
            "utm": float(self.valor_utm),
            "sueldo_minimo": float(self.sueldo_minimo),
            "tope_afp": float(self.tope_imponible_afp),
            "tope_seg_ces": float(self.tope_imponible_seg_ces),
            "fonasa": float(self.tasa_fonasa),
        }
        return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()


class TasaAFP(models.Model):
    nombre = models.CharField(max_length=50)
    tasa_cotizacion = models.DecimalField(max_digits=6, decimal_places=4)
    tasa_sis = models.DecimalField(max_digits=6, decimal_places=4)
    tasa_total = models.DecimalField(max_digits=6, decimal_places=4)
    vigente_desde = models.DateField()
    vigente_hasta = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "Tasa AFP"
        verbose_name_plural = "Tasas AFP"

    def __str__(self):
        return f"{self.nombre} ({self.tasa_cotizacion}%)"


class TramoImpuestoUnico(models.Model):
    desde_utm = models.DecimalField(max_digits=8, decimal_places=2)
    hasta_utm = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    factor = models.DecimalField(max_digits=6, decimal_places=4)
    rebaja_utm = models.DecimalField(max_digits=10, decimal_places=4)
    vigente_desde = models.DateField()
    vigente_hasta = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["desde_utm"]
        verbose_name = "Tramo Impuesto Único"
        verbose_name_plural = "Tramos Impuesto Único"

    def __str__(self):
        hasta = f"{self.hasta_utm} UTM" if self.hasta_utm else "+"
        return f"{self.desde_utm} - {hasta} UTM | Factor {self.factor}"


class ConfiguracionVoz(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE, related_name="config_voz")
    asistente_activado = models.BooleanField(default=False)
    respuestas_voz = models.BooleanField(default=False)
    notificacion_whatsapp = models.BooleanField(default=False)
    numero_whatsapp_cliente = models.CharField(max_length=20, blank=True, null=True)
    idioma = models.CharField(max_length=10, default="es-CL")

    class Meta:
        verbose_name = "Configuración de Voz"
        verbose_name_plural = "Configuraciones de Voz"

    def __str__(self):
        return f"Voz: {self.usuario.username}"


class CambioParametroLog(models.Model):
    parametro = models.ForeignKey(ParametroPrevisional, on_delete=models.CASCADE)
    campo_cambiado = models.CharField(max_length=50)
    valor_anterior = models.CharField(max_length=100)
    valor_nuevo = models.CharField(max_length=100)
    revisado = models.BooleanField(default=False)
    revisado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    revisado_en = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Cambio de Parámetro"
        verbose_name_plural = "Cambios de Parámetros"

    def __str__(self):
        return f"{self.campo_cambiado}: {self.valor_anterior} → {self.valor_nuevo}"


class Empresa(models.Model):
    rut = models.CharField("RUT Empresa", max_length=12, unique=True)
    razon_social = models.CharField("Razón Social", max_length=255)
    nombre_representante = models.CharField("Representante Legal", max_length=255)
    rut_representante = models.CharField("RUT Representante", max_length=12)
    actividad_economica = models.CharField("Actividad Económica", max_length=255)
    direccion = models.TextField("Dirección")
    clave_sii_empresa = models.CharField("Clave SII Empresa", max_length=255)
    clave_sii_persona = models.CharField("Clave SII Persona Natural", max_length=255)
    contacto_telefono = models.CharField("Teléfono", max_length=20)
    contacto_email = models.EmailField("Email")
    clave_previred = models.CharField("Clave PreviRed", max_length=255)
    clave_mutual = models.CharField("Clave Mutual", max_length=255)
    clave_afc = models.CharField("Clave AFC", max_length=255)
    clave_portuaria = models.CharField("Clave Portuaria", max_length=255, blank=True)
    clave_unica = models.CharField("ClaveÚnica", max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["razon_social"]
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"

    def __str__(self):
        return f"{self.razon_social} ({self.rut})"


class RelacionMandante(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="mandantes")
    rut_mandante = models.CharField("RUT Mandante", max_length=12)
    razon_social_mandante = models.CharField("Razón Social Mandante", max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["razon_social_mandante"]
        verbose_name = "Relación Mandante"
        verbose_name_plural = "Relaciones Mandantes"
        unique_together = [("empresa", "rut_mandante")]

    def __str__(self):
        return f"{self.razon_social_mandante} ← {self.empresa.razon_social}"


TIPOS_CONTRATO = [
    ("indefinido", "Indefinido"),
    ("plazo_fijo", "Plazo Fijo"),
    ("faena", "Por Faena"),
    ("part_time", "Jornada Parcial"),
]


class PlantillaContrato(models.Model):
    nombre = models.CharField("Nombre plantilla", max_length=100)
    cargo = models.CharField("Cargo", max_length=100)
    funciones = models.TextField("Funciones del cargo")
    clausulas = models.TextField("Cláusulas adicionales", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["cargo"]
        verbose_name = "Plantilla de Contrato"
        verbose_name_plural = "Plantillas de Contrato"

    def __str__(self):
        return f"{self.cargo} — {self.nombre}"


class DocumentoCarnet(models.Model):
    rut_trabajador = models.CharField("RUT", max_length=12, unique=True)
    nombres = models.CharField("Nombres", max_length=255)
    apellidos = models.CharField("Apellidos", max_length=255)
    fecha_nacimiento = models.DateField("Fecha de Nacimiento")
    fecha_vencimiento = models.DateField("Fecha de Vencimiento", null=True, blank=True)
    firma_digital = models.TextField("Firma digitalizada", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["apellidos", "nombres"]
        verbose_name = "Documento Carnet"
        verbose_name_plural = "Documentos Carnet"

    def __str__(self):
        return f"{self.nombres} {self.apellidos} ({self.rut_trabajador})"


class Contrato(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="contratos")
    mandante = models.ForeignKey(RelacionMandante, on_delete=models.SET_NULL, null=True, blank=True, related_name="contratos")
    plantilla = models.ForeignKey(PlantillaContrato, on_delete=models.SET_NULL, null=True, blank=True)

    tipo = models.CharField("Tipo de contrato", max_length=20, choices=TIPOS_CONTRATO)
    fecha_inicio = models.DateField("Fecha de inicio")
    fecha_termino = models.DateField("Fecha de término", null=True, blank=True)
    nombre_faena = models.CharField("Nombre de la Faena", max_length=255, blank=True)

    carnet = models.ForeignKey(DocumentoCarnet, on_delete=models.SET_NULL, null=True, blank=True)
    rut_trabajador = models.CharField("RUT Trabajador", max_length=12)
    nombres = models.CharField("Nombres", max_length=255)
    apellidos = models.CharField("Apellidos", max_length=255)
    fecha_nacimiento = models.DateField("Fecha de Nacimiento")
    direccion = models.TextField("Dirección")
    telefono = models.CharField("Teléfono", max_length=20, blank=True)
    email = models.EmailField("Email", blank=True)

    funciones = models.TextField("Naturaleza de servicios / funciones")
    lugar_trabajo = models.CharField("Lugar de trabajo", max_length=255)
    horas_semanales = models.PositiveIntegerField("Horas semanales", default=45)

    sueldo_base = models.DecimalField("Sueldo base $", max_digits=12, decimal_places=2)
    colacion = models.DecimalField("Colación $", max_digits=10, decimal_places=2, default=0)
    movilizacion = models.DecimalField("Movilización $", max_digits=10, decimal_places=2, default=0)
    periodicidad_pago = models.CharField("Periodicidad pago", max_length=20, default="mensual")

    clausulas_adicionales = models.TextField("Cláusulas adicionales", blank=True)
    pdf_generado = models.TextField("PDF generado (base64)", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Contrato"
        verbose_name_plural = "Contratos"

    def __str__(self):
        return f"Contrato {self.nombres} {self.apellidos} — {self.empresa.razon_social}"


class AnexoContrato(models.Model):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="anexos")
    clausula_modificada = models.CharField("Cláusula a modificar", max_length=255)
    nuevo_texto = models.TextField("Nuevo texto de la cláusula")
    pdf_generado = models.TextField("PDF generado (base64)", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Anexo de Contrato"
        verbose_name_plural = "Anexos de Contrato"

    def __str__(self):
        return f"Anexo #{self.id} — {self.contrato}"


class PactoHorasExtra(models.Model):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="pactos_horas_extra")
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    activo = models.BooleanField("Activo", default=True)
    renovado = models.BooleanField("Renovado automáticamente", default=False)
    numero_renovacion = models.PositiveIntegerField("N° renovación", default=0)
    alerta_enviada = models.BooleanField("Alerta enviada", default=False)
    pdf_generado = models.TextField("PDF generado (base64)", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-fecha_inicio"]
        verbose_name = "Pacto Horas Extra"
        verbose_name_plural = "Pactos Horas Extra"

    def __str__(self):
        return f"Pacto HE #{self.id} ({self.fecha_inicio} — {self.fecha_fin})"


ALERTA_TIPOS = [
    ("contrato_vencer", "Contrato próximo a vencer"),
    ("contrato_vencido", "Contrato vencido"),
    ("pacto_vencer", "Pacto HE próximo a vencer"),
    ("pacto_vencido", "Pacto HE vencido"),
    ("parametro_desactualizado", "Parámetro previsional desactualizado"),
    ("parametro_cambio", "Cambio en parámetro previsional"),
]


class AlertaConfig(models.Model):
    empresa = models.OneToOneField(Empresa, on_delete=models.CASCADE, related_name="alerta_config")
    email_notificar = models.EmailField("Email para notificaciones", blank=True)
    whatsapp_activo = models.BooleanField("WhatsApp activo", default=False)
    whatsapp_numero = models.CharField("Número WhatsApp", max_length=20, blank=True)
    alertar_contratos = models.BooleanField("Alertar vencimiento contratos", default=True)
    alertar_pactos = models.BooleanField("Alertar vencimiento pactos HE", default=True)
    alertar_parametros = models.BooleanField("Alertar cambios parámetros", default=True)
    dias_anticipacion = models.PositiveIntegerField("Días anticipación", default=7)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuración de Alertas"
        verbose_name_plural = "Configuraciones de Alertas"

    def __str__(self):
        return f"Alertas: {self.empresa.razon_social}"


class Alerta(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="alertas")
    tipo = models.CharField("Tipo", max_length=30, choices=ALERTA_TIPOS)
    referencia_id = models.PositiveIntegerField("ID referencia", null=True, blank=True)
    titulo = models.CharField("Título", max_length=255)
    mensaje = models.TextField("Mensaje")
    leido = models.BooleanField("Leído", default=False)
    email_enviado = models.BooleanField("Email enviado", default=False)
    whatsapp_enviado = models.BooleanField("WhatsApp enviado", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Alerta"
        verbose_name_plural = "Alertas"

    def __str__(self):
        return f"{self.get_tipo_display()}: {self.titulo}"


class DatoPrevisional(models.Model):
    rut_trabajador = models.CharField("RUT", max_length=12, unique=True)
    nombres = models.CharField("Nombres", max_length=255, blank=True)
    apellidos = models.CharField("Apellidos", max_length=255, blank=True)
    afp = models.CharField("AFP", max_length=255, blank=True)
    fecha_afiliacion = models.DateField("Fecha afiliación AFP", null=True, blank=True)
    estado = models.CharField("Estado", max_length=100, blank=True)
    tipo = models.CharField("Tipo trabajador", max_length=100, blank=True)
    fecha_consulta = models.DateTimeField("Última consulta", auto_now=True)

    class Meta:
        verbose_name = "Dato Previsional"
        verbose_name_plural = "Datos Previsionales"

    def __str__(self):
        return f"{self.rut_trabajador} — {self.afp or 'Sin datos'}"


class Liquidacion(models.Model):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="liquidaciones")
    periodo = models.DateField("Período")
    sueldo_base = models.DecimalField("Sueldo base $", max_digits=12, decimal_places=2)
    colacion = models.DecimalField("Colación $", max_digits=10, decimal_places=2, default=0)
    movilizacion = models.DecimalField("Movilización $", max_digits=10, decimal_places=2, default=0)
    horas_extra_cantidad = models.DecimalField("Horas extra (cantidad)", max_digits=6, decimal_places=1, default=0)
    horas_extra_valor = models.DecimalField("Horas extra $", max_digits=12, decimal_places=2, default=0)
    total_imponible = models.DecimalField("Total imponible $", max_digits=12, decimal_places=2)
    descuento_afp = models.DecimalField("Desc. AFP $", max_digits=10, decimal_places=2)
    descuento_salud = models.DecimalField("Desc. Salud $", max_digits=10, decimal_places=2)
    descuento_seg_ces = models.DecimalField("Desc. Seg. Cesantía $", max_digits=10, decimal_places=2, default=0)
    descuento_iu = models.DecimalField("Impuesto Único $", max_digits=10, decimal_places=2, default=0)
    total_descuentos = models.DecimalField("Total descuentos $", max_digits=12, decimal_places=2)
    liquido = models.DecimalField("Líquido a pagar $", max_digits=12, decimal_places=2)
    costo_empleador = models.DecimalField("Costo empleador $", max_digits=12, decimal_places=2)
    pdf_generado = models.TextField("PDF (base64)", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-periodo", "-created_at"]
        verbose_name = "Liquidación"
        verbose_name_plural = "Liquidaciones"
        unique_together = [("contrato", "periodo")]

    def __str__(self):
        return f"Liquidación {self.contrato.nombres} {self.contrato.apellidos} — {self.periodo}"


CAUSALES_FINIQUITO = [
    ("mutuo_acuerdo", "Mutuo acuerdo (Art.159 N°1)"),
    ("renuncia", "Renuncia del trabajador (Art.159 N°2)"),
    ("muerte", "Muerte del trabajador (Art.159 N°3)"),
    ("vencimiento_plazo", "Vencimiento del plazo (Art.159 N°4)"),
    ("conclusion_faena", "Conclusión de la faena (Art.159 N°5)"),
    ("necesidades_empresa", "Necesidades de la empresa (Art.161)"),
    ("despido_indirecto", "Autodespido (Art.171)"),
]


class Finiquito(models.Model):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="finiquitos")
    fecha_termino = models.DateField("Fecha de término")
    causal = models.CharField("Causal", max_length=30, choices=CAUSALES_FINIQUITO)
    aviso_previo = models.BooleanField("Aviso previo 30 días", default=False)

    sueldo_base = models.DecimalField("Sueldo base $", max_digits=12, decimal_places=2)
    dias_trabajados = models.DecimalField("Días trabajados última quincena", max_digits=4, decimal_places=1, default=0)

    indemn_aviso_previo = models.DecimalField("Indemn. aviso previo $", max_digits=12, decimal_places=2, default=0)
    indemn_anios_servicio = models.DecimalField("Indemn. años servicio $", max_digits=12, decimal_places=2, default=0)
    anios_servicio = models.DecimalField("Años de servicio", max_digits=4, decimal_places=1, default=0)

    sueldos_pendientes = models.DecimalField("Sueldos pendientes $", max_digits=12, decimal_places=2, default=0)
    feriado_proporcional = models.DecimalField("Feriado proporcional $", max_digits=12, decimal_places=2, default=0)
    horas_extra_pendientes = models.DecimalField("Horas extra pendientes $", max_digits=12, decimal_places=2, default=0)
    otros_bonos = models.DecimalField("Otros bonos/pagos $", max_digits=12, decimal_places=2, default=0)

    total_haberes = models.DecimalField("Total haberes $", max_digits=14, decimal_places=2)
    descuentos = models.DecimalField("Descuentos $", max_digits=12, decimal_places=2, default=0)
    liquido = models.DecimalField("Líquido a pagar $", max_digits=14, decimal_places=2)

    observaciones = models.TextField("Observaciones", blank=True)
    pdf_generado = models.TextField("PDF (base64)", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Finiquito"
        verbose_name_plural = "Finiquitos"

    def __str__(self):
        return f"Finiquito {self.contrato.nombres} {self.contrato.apellidos} — {self.get_causal_display()}"


ESTADOS_SOLICITUD = [
    ("pendiente", "Pendiente"),
    ("aprobada", "Aprobada"),
    ("rechazada", "Rechazada"),
]


class Vacacion(models.Model):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="vacaciones")
    anio = models.PositiveIntegerField("Año comercial")
    dias_correspondientes = models.DecimalField("Días hábiles correspondientes", max_digits=4, decimal_places=1, default=15)
    dias_pendientes_anterior = models.DecimalField("Días pendientes año anterior", max_digits=4, decimal_places=1, default=0)
    dias_disfrutados = models.DecimalField("Días disfrutados", max_digits=4, decimal_places=1, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-anio"]
        verbose_name = "Vacación"
        verbose_name_plural = "Vacaciones"
        unique_together = [("contrato", "anio")]

    def __str__(self):
        return f"Vacaciones {self.contrato.nombres} {self.contrato.apellidos} — {self.anio}"

    @property
    def dias_pendientes(self):
        return self.dias_correspondientes + self.dias_pendientes_anterior - self.dias_disfrutados


class SolicitudVacacion(models.Model):
    vacacion = models.ForeignKey(Vacacion, on_delete=models.CASCADE, related_name="solicitudes")
    fecha_inicio = models.DateField("Fecha inicio")
    fecha_termino = models.DateField("Fecha término")
    dias_solicitados = models.DecimalField("Días solicitados", max_digits=4, decimal_places=1)
    estado = models.CharField("Estado", max_length=15, choices=ESTADOS_SOLICITUD, default="pendiente")
    comentario = models.TextField("Comentario", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Solicitud de Vacación"
        verbose_name_plural = "Solicitudes de Vacaciones"

    def __str__(self):
        return f"Solicitud {self.vacacion.contrato.nombres} — {self.fecha_inicio} a {self.fecha_termino}"
