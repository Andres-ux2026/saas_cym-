from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from calculo_sueldo.models import PactoHorasExtra


class Command(BaseCommand):
    help = "Renueva automáticamente pactos de horas extra próximos a vencer (7 días antes)"

    def handle(self, *args, **options):
        hoy = timezone.localdate()
        corte = hoy + timedelta(days=7)
        renovados = 0

        pactos = PactoHorasExtra.objects.filter(
            activo=True,
            renovado=False,
            fecha_fin__lte=corte,
            fecha_fin__gte=hoy,
        )

        for pacto in pactos:
            if pacto.pactos_horas_extra.filter(activo=True).exclude(id=pacto.id).exists():
                continue

            nuevo_numero = pacto.numero_renovacion + 1

            PactoHorasExtra.objects.create(
                contrato=pacto.contrato,
                fecha_inicio=pacto.fecha_fin + timedelta(days=1),
                fecha_fin=pacto.fecha_fin + timedelta(days=91),
                activo=True,
                renovado=True,
                numero_renovacion=nuevo_numero,
            )

            pacto.renovado = True
            pacto.save(update_fields=["renovado"])
            renovados += 1
            self.stdout.write(f"  Renovado pacto #{pacto.id} → nuevo pacto #{nuevo_numero}")

        if renovados:
            self.stdout.write(self.style.SUCCESS(f"{renovados} pacto(s) renovado(s)"))
        else:
            self.stdout.write("No se encontraron pactos por renovar")
