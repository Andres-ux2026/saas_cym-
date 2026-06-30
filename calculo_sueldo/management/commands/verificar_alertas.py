from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from calculo_sueldo.models import Empresa, AlertaConfig, Alerta, Contrato, PactoHorasExtra, CambioParametroLog


class Command(BaseCommand):
    help = "Verifica vencimientos próximos y genera alertas"

    def handle(self, *args, **options):
        hoy = timezone.localdate()
        creadas = 0

        for empresa in Empresa.objects.all():
            config = AlertaConfig.objects.filter(empresa=empresa).first()
            if not config:
                continue
            dias = config.dias_anticipacion
            corte = hoy + timedelta(days=dias)

            if config.alertar_contratos:
                creadas += self._alertar_contratos(empresa, hoy, corte)

            if config.alertar_pactos:
                creadas += self._alertar_pactos(empresa, hoy, corte)

            if config.alertar_parametros:
                creadas += self._alertar_parametros(empresa, hoy)

        if creadas:
            self.stdout.write(self.style.SUCCESS(f"{creadas} alerta(s) creada(s)"))
        else:
            self.stdout.write("Sin novedades")

    def _alertar_contratos(self, empresa, hoy, corte):
        count = 0
        contratos = Contrato.objects.filter(
            empresa=empresa,
            tipo__in=["plazo_fijo", "faena"],
            fecha_termino__gte=hoy,
            fecha_termino__lte=corte,
        )
        for c in contratos:
            dias = (c.fecha_termino - hoy).days
            ya_existe = Alerta.objects.filter(
                empresa=empresa, tipo="contrato_vencer",
                referencia_id=c.id,
                created_at__date=hoy,
            ).exists()
            if ya_existe:
                continue
            Alerta.objects.create(
                empresa=empresa,
                tipo="contrato_vencer",
                referencia_id=c.id,
                titulo=f"Contrato próximo a vencer: {c.nombres} {c.apellidos}",
                mensaje=(
                    f"El contrato de {c.nombres} {c.apellidos} (RUT {c.rut_trabajador}) "
                    f"vence el {c.fecha_termino} ({dias} día{'s' if dias != 1 else ''})."
                ),
            )
            count += 1
            self.stdout.write(f"  Alerta: contrato #{c.id} vence en {dias} días")

        vencidos = Contrato.objects.filter(
            empresa=empresa,
            tipo__in=["plazo_fijo", "faena"],
            fecha_termino__lt=hoy,
        )
        for c in vencidos:
            ya_existe = Alerta.objects.filter(
                empresa=empresa, tipo="contrato_vencido",
                referencia_id=c.id, created_at__date=hoy,
            ).exists()
            if ya_existe:
                continue
            Alerta.objects.create(
                empresa=empresa,
                tipo="contrato_vencido",
                referencia_id=c.id,
                titulo=f"Contrato vencido: {c.nombres} {c.apellidos}",
                mensaje=(
                    f"El contrato de {c.nombres} {c.apellidos} (RUT {c.rut_trabajador}) "
                    f"venció el {c.fecha_termino}."
                ),
            )
            count += 1
        return count

    def _alertar_pactos(self, empresa, hoy, corte):
        count = 0
        pactos = PactoHorasExtra.objects.filter(
            contrato__empresa=empresa,
            activo=True,
            fecha_fin__gte=hoy,
            fecha_fin__lte=corte,
        )
        for p in pactos:
            dias = (p.fecha_fin - hoy).days
            ya_existe = Alerta.objects.filter(
                empresa=empresa, tipo="pacto_vencer",
                referencia_id=p.id, created_at__date=hoy,
            ).exists()
            if ya_existe:
                continue
            Alerta.objects.create(
                empresa=empresa,
                tipo="pacto_vencer",
                referencia_id=p.id,
                titulo=f"Pacto HE próximo a vencer: {p.contrato.nombres} {p.contrato.apellidos}",
                mensaje=(
                    f"El pacto de horas extra de {p.contrato.nombres} {p.contrato.apellidos} "
                    f"vence el {p.fecha_fin} ({dias} día{'s' if dias != 1 else ''})."
                ),
            )
            count += 1

        vencidos = PactoHorasExtra.objects.filter(
            contrato__empresa=empresa,
            activo=True,
            fecha_fin__lt=hoy,
        )
        for p in vencidos:
            ya_existe = Alerta.objects.filter(
                empresa=empresa, tipo="pacto_vencido",
                referencia_id=p.id, created_at__date=hoy,
            ).exists()
            if ya_existe:
                continue
            Alerta.objects.create(
                empresa=empresa,
                tipo="pacto_vencido",
                referencia_id=p.id,
                titulo=f"Pacto HE vencido: {p.contrato.nombres} {p.contrato.apellidos}",
                mensaje=(
                    f"El pacto de horas extra de {p.contrato.nombres} {p.contrato.apellidos} "
                    f"venció el {p.fecha_fin}."
                ),
            )
            count += 1
        return count

    def _alertar_parametros(self, empresa, hoy):
        count = 0
        cambios = CambioParametroLog.objects.filter(
            revisado=False,
            created_at__gte=hoy - timedelta(days=30),
        )
        for cambio in cambios:
            ya_existe = Alerta.objects.filter(
                empresa=empresa, tipo="parametro_cambio",
                referencia_id=cambio.id, created_at__date=hoy,
            ).exists()
            if ya_existe:
                continue
            Alerta.objects.create(
                empresa=empresa,
                tipo="parametro_cambio",
                referencia_id=cambio.id,
                titulo=f"Cambio en parámetro: {cambio.parametro}",
                mensaje=(
                    f"El parámetro {cambio.parametro} cambió de "
                    f"${cambio.valor_anterior} a ${cambio.valor_nuevo} "
                    f"({cambio.created_at.date()})."
                ),
            )
            count += 1
        return count
