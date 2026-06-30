import json
from datetime import datetime
from decimal import Decimal
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.core.management import call_command
from io import StringIO
from .models import ParametroPrevisional, TasaAFP, TramoImpuestoUnico, CambioParametroLog, ConfiguracionVoz, Empresa, RelacionMandante, PlantillaContrato, DocumentoCarnet, Contrato, AnexoContrato, PactoHorasExtra, AlertaConfig, Alerta, Liquidacion, Finiquito, Vacacion, SolicitudVacacion


def landing(request):
    return render(request, "landing.html", {"user": request.user})


def calculadora(request):
    ultimo = ParametroPrevisional.objects.order_by("-mes").first()
    cambios_pendientes = CambioParametroLog.objects.filter(revisado=False).count()
    config_voz = None
    if request.user.is_authenticated:
        config_voz, _ = ConfiguracionVoz.objects.get_or_create(usuario=request.user)

    ctx = {
        "ultima_actualizacion": ultimo.updated_at if ultimo else None,
        "cambios_pendientes": cambios_pendientes,
        "config_voz": {
            "asistente_activado": config_voz.asistente_activado if config_voz else False,
            "respuestas_voz": config_voz.respuestas_voz if config_voz else False,
            "notificacion_whatsapp": config_voz.notificacion_whatsapp if config_voz else False,
            "numero_whatsapp_cliente": config_voz.numero_whatsapp_cliente if config_voz else "",
        } if config_voz else {},
    }
    return render(request, "calculadora.html", ctx)


def api_parametros(request):
    mes = request.GET.get("mes")
    if mes:
        try:
            dt = datetime.strptime(mes, "%Y-%m")
            params = ParametroPrevisional.objects.filter(mes__year=dt.year, mes__month=dt.month).first()
        except:
            params = ParametroPrevisional.objects.order_by("-mes").first()
    else:
        params = ParametroPrevisional.objects.order_by("-mes").first()

    if not params:
        return JsonResponse({"error": "No hay parámetros"}, status=404)

    return JsonResponse({
        "mes": params.mes.strftime("%Y-%m"),
        "fuente": params.fuente,
        "valor_uf": float(params.valor_uf),
        "valor_utm": float(params.valor_utm),
        "sueldo_minimo": float(params.sueldo_minimo),
        "tope_imponible_afp": float(params.tope_imponible_afp),
        "tope_imponible_seg_ces": float(params.tope_imponible_seg_ces),
        "tasa_fonasa": float(params.tasa_fonasa),
        "tasa_afc_trabajador": float(params.tasa_afc_trabajador),
        "tasa_afc_empresa_indefinido": float(params.tasa_afc_empresa_indefinido),
        "tasa_afc_empresa_plazofijo": float(params.tasa_afc_empresa_plazofijo),
        "tasa_afc_empresa_11anos": float(params.tasa_afc_empresa_11anos),
        "tasa_afc_empresa_casaparticular": float(params.tasa_afc_empresa_casaparticular),
        "tasa_sis": float(params.tasa_sis),
        "tasa_seguro_social": float(params.tasa_seguro_social),
        "tope_gratificacion": float(params.tope_gratificacion),
        "tope_sueldo_gratificacion": float(params.tope_sueldo_gratificacion),
        "updated_at": params.updated_at.isoformat(),
    })


def api_tasas_afp(request):
    tasas = TasaAFP.objects.filter(vigente_hasta__isnull=True)
    return JsonResponse({
        "tasas": [{
            "nombre": t.nombre,
            "tasa_cotizacion": float(t.tasa_cotizacion),
            "tasa_sis": float(t.tasa_sis),
            "tasa_total": float(t.tasa_total),
        } for t in tasas]
    })


def api_tramos_impuesto(request):
    tramos = TramoImpuestoUnico.objects.filter(vigente_hasta__isnull=True).order_by("desde_utm")
    return JsonResponse({
        "tramos": [{
            "desde_utm": float(t.desde_utm),
            "hasta_utm": float(t.hasta_utm) if t.hasta_utm else None,
            "factor": float(t.factor),
            "rebaja_utm": float(t.rebaja_utm),
        } for t in tramos]
    })


def api_cambios_pendientes(request):
    cambios = CambioParametroLog.objects.filter(revisado=False).select_related("parametro")
    return JsonResponse({
        "hay_cambios": cambios.exists(),
        "cambios": [{
            "id": c.id,
            "campo": c.campo_cambiado,
            "valor_anterior": c.valor_anterior,
            "valor_nuevo": c.valor_nuevo,
            "fecha": c.created_at.isoformat(),
        } for c in cambios]
    })


@csrf_exempt
def api_revisar_cambio(request, id):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        cambio = CambioParametroLog.objects.get(id=id)
        cambio.revisado = True
        if request.user.is_authenticated:
            cambio.revisado_por = request.user
        cambio.revisado_en = timezone.now()
        cambio.save()
        return JsonResponse({"ok": True})
    except CambioParametroLog.DoesNotExist:
        return JsonResponse({"error": "No encontrado"}, status=404)


@csrf_exempt
def api_actualizar_parametros(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        buf = StringIO()
        call_command("actualizar_parametros", stdout=buf)
        output = buf.getvalue()
        return JsonResponse({"ok": True, "output": output})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def api_calcular(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        modo = data.get("modo", "bruto_a_liquido")

        params = ParametroPrevisional.objects.order_by("-mes").first()
        if not params:
            return JsonResponse({"error": "No hay parámetros"}, status=400)

        tasas_afp = TasaAFP.objects.filter(vigente_hasta__isnull=True)
        tramos_iu = TramoImpuestoUnico.objects.filter(vigente_hasta__isnull=True).order_by("desde_utm")

        from .calculos import calcular_bruto_a_liquido, calcular_liquido_a_bruto

        if modo == "bruto_a_liquido":
            resultado = calcular_bruto_a_liquido(data, params, list(tasas_afp.values()), list(tramos_iu.values()))
        else:
            resultado = calcular_liquido_a_bruto(data, params, list(tasas_afp.values()), list(tramos_iu.values()))

        return JsonResponse(resultado)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
def api_voz_config(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Autenticación requerida"}, status=401)

    config, _ = ConfiguracionVoz.objects.get_or_create(usuario=request.user)

    if request.method == "POST":
        data = json.loads(request.body)
        config.asistente_activado = data.get("asistente_activado", config.asistente_activado)
        config.respuestas_voz = data.get("respuestas_voz", config.respuestas_voz)
        config.notificacion_whatsapp = data.get("notificacion_whatsapp", config.notificacion_whatsapp)
        config.numero_whatsapp_cliente = data.get("numero_whatsapp_cliente", config.numero_whatsapp_cliente)
        config.save()

    return JsonResponse({
        "asistente_activado": config.asistente_activado,
        "respuestas_voz": config.respuestas_voz,
        "notificacion_whatsapp": config.notificacion_whatsapp,
        "numero_whatsapp_cliente": config.numero_whatsapp_cliente or "",
        "idioma": config.idioma,
    })


@login_required
def app_empresas(request):
    return render(request, "app/empresas.html")


@csrf_exempt
@login_required
def api_empresa_buscar(request):
    rut = request.GET.get("rut", "").strip().upper()
    if not rut:
        return JsonResponse({"error": "RUT requerido"}, status=400)
    try:
        empresa = Empresa.objects.get(rut=rut)
        return JsonResponse({"encontrada": True, "empresa": {
            "id": empresa.id,
            "rut": empresa.rut,
            "razon_social": empresa.razon_social,
            "nombre_representante": empresa.nombre_representante,
            "rut_representante": empresa.rut_representante,
            "actividad_economica": empresa.actividad_economica,
            "direccion": empresa.direccion,
            "contacto_telefono": empresa.contacto_telefono,
            "contacto_email": empresa.contacto_email,
        }})
    except Empresa.DoesNotExist:
        return JsonResponse({"encontrada": False})


@csrf_exempt
@login_required
def api_empresa_guardar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        rut = data.get("rut", "").strip().upper()
        if not rut:
            return JsonResponse({"error": "RUT requerido"}, status=400)

        empresa, created = Empresa.objects.update_or_create(
            rut=rut,
            defaults={
                "razon_social": data.get("razon_social", ""),
                "nombre_representante": data.get("nombre_representante", ""),
                "rut_representante": data.get("rut_representante", ""),
                "actividad_economica": data.get("actividad_economica", ""),
                "direccion": data.get("direccion", ""),
                "clave_sii_empresa": data.get("clave_sii_empresa", ""),
                "clave_sii_persona": data.get("clave_sii_persona", ""),
                "contacto_telefono": data.get("contacto_telefono", ""),
                "contacto_email": data.get("contacto_email", ""),
                "clave_previred": data.get("clave_previred", ""),
                "clave_mutual": data.get("clave_mutual", ""),
                "clave_afc": data.get("clave_afc", ""),
                "clave_portuaria": data.get("clave_portuaria", ""),
                "clave_unica": data.get("clave_unica", ""),
            },
        )
        return JsonResponse({"ok": True, "creada": created, "id": empresa.id})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@login_required
def api_empresa_eliminar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        empresa = Empresa.objects.get(rut=data.get("rut", "").strip().upper())
        empresa.delete()
        return JsonResponse({"ok": True})
    except Empresa.DoesNotExist:
        return JsonResponse({"error": "No encontrada"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@login_required
def api_mandantes_listar(request):
    rut_empresa = request.GET.get("rut", "").strip().upper()
    if not rut_empresa:
        return JsonResponse({"error": "RUT requerido"}, status=400)
    try:
        empresa = Empresa.objects.get(rut=rut_empresa)
        mandantes = empresa.mandantes.all()
        return JsonResponse({
            "mandantes": [{
                "id": m.id,
                "rut_mandante": m.rut_mandante,
                "razon_social_mandante": m.razon_social_mandante,
            } for m in mandantes]
        })
    except Empresa.DoesNotExist:
        return JsonResponse({"error": "Empresa no encontrada"}, status=404)


@csrf_exempt
@login_required
def api_mandante_guardar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        empresa = Empresa.objects.get(rut=data["rut_empresa"].strip().upper())
        mandante, created = RelacionMandante.objects.update_or_create(
            empresa=empresa,
            rut_mandante=data["rut_mandante"].strip().upper(),
            defaults={"razon_social_mandante": data.get("razon_social_mandante", "")},
        )
        return JsonResponse({"ok": True, "creada": created, "id": mandante.id})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@login_required
def api_mandante_eliminar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        RelacionMandante.objects.filter(
            empresa__rut=data["rut_empresa"].strip().upper(),
            rut_mandante=data["rut_mandante"].strip().upper(),
        ).delete()
        return JsonResponse({"ok": True})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@login_required
def app_contratos(request):
    empresas = Empresa.objects.all()
    plantillas = PlantillaContrato.objects.all()
    return render(request, "app/contratos.html", {
        "empresas": empresas,
        "plantillas": plantillas,
    })


@login_required
def api_plantillas_contrato(request):
    plantillas = PlantillaContrato.objects.all()
    return JsonResponse({
        "plantillas": [{
            "id": p.id, "nombre": p.nombre, "cargo": p.cargo,
            "funciones": p.funciones, "clausulas": p.clausulas,
        } for p in plantillas]
    })


@login_required
def api_buscar_trabajador(request):
    rut = request.GET.get("rut", "").strip().upper()
    if not rut:
        return JsonResponse({"encontrado": False})
    try:
        doc = DocumentoCarnet.objects.get(rut_trabajador=rut)
        return JsonResponse({
            "encontrado": True,
            "trabajador": {
                "rut": doc.rut_trabajador,
                "nombres": doc.nombres,
                "apellidos": doc.apellidos,
                "fecha_nacimiento": doc.fecha_nacimiento.isoformat(),
            }
        })
    except DocumentoCarnet.DoesNotExist:
        return JsonResponse({"encontrado": False})


@csrf_exempt
@login_required
def api_carnet_guardar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        doc, created = DocumentoCarnet.objects.update_or_create(
            rut_trabajador=data["rut"].strip().upper(),
            defaults={
                "nombres": data["nombres"],
                "apellidos": data["apellidos"],
                "fecha_nacimiento": data["fecha_nacimiento"],
                "fecha_vencimiento": data.get("fecha_vencimiento"),
            },
        )
        return JsonResponse({"ok": True, "creado": created, "id": doc.id})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@login_required
def api_contrato_guardar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        empresa = get_object_or_404(Empresa, rut=data["rut_empresa"].strip().upper())
        mandante = None
        if data.get("rut_mandante"):
            mandante = RelacionMandante.objects.filter(
                empresa=empresa, rut_mandante=data["rut_mandante"].strip().upper()
            ).first()
        plantilla = None
        if data.get("plantilla_id"):
            plantilla = PlantillaContrato.objects.filter(id=data["plantilla_id"]).first()
        carnet = None
        if data.get("rut_trabajador"):
            carnet = DocumentoCarnet.objects.filter(rut_trabajador=data["rut_trabajador"].strip().upper()).first()

        contrato, created = Contrato.objects.update_or_create(
            id=data.get("id"),
            defaults={
                "empresa": empresa,
                "mandante": mandante,
                "plantilla": plantilla,
                "tipo": data["tipo"],
                "fecha_inicio": data["fecha_inicio"],
                "fecha_termino": data.get("fecha_termino"),
                "nombre_faena": data.get("nombre_faena", ""),
                "carnet": carnet,
                "rut_trabajador": data["rut_trabajador"].strip().upper(),
                "nombres": data["nombres"],
                "apellidos": data["apellidos"],
                "fecha_nacimiento": data["fecha_nacimiento"],
                "direccion": data.get("direccion", ""),
                "telefono": data.get("telefono", ""),
                "email": data.get("email", ""),
                "funciones": data["funciones"],
                "lugar_trabajo": data["lugar_trabajo"],
                "horas_semanales": int(data.get("horas_semanales", 45)),
                "sueldo_base": data["sueldo_base"],
                "colacion": data.get("colacion", 0),
                "movilizacion": data.get("movilizacion", 0),
                "periodicidad_pago": data.get("periodicidad_pago", "mensual"),
                "clausulas_adicionales": data.get("clausulas_adicionales", ""),
            },
        )
        if created:
            _generar_pacto_inicial(contrato)
        return JsonResponse({"ok": True, "creado": created, "id": contrato.id})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


def _generar_pacto_inicial(contrato):
    from datetime import timedelta
    inicio = contrato.fecha_inicio
    fin = inicio + timedelta(days=90)
    PactoHorasExtra.objects.create(
        contrato=contrato,
        fecha_inicio=inicio,
        fecha_fin=fin,
    )


@login_required
def api_contratos_listar(request):
    contratos = Contrato.objects.select_related("empresa", "mandante", "carnet", "plantilla").all()
    return JsonResponse({
        "contratos": [{
            "id": c.id,
            "rut_trabajador": c.rut_trabajador,
            "nombres": c.nombres,
            "apellidos": c.apellidos,
            "tipo": c.get_tipo_display(),
            "empresa": c.empresa.razon_social,
            "mandante": c.mandante.razon_social_mandante if c.mandante else None,
            "fecha_inicio": c.fecha_inicio.isoformat(),
            "fecha_termino": c.fecha_termino.isoformat() if c.fecha_termino else None,
            "sueldo_base": float(c.sueldo_base),
            "created_at": c.created_at.isoformat(),
        } for c in contratos]
    })


@csrf_exempt
@login_required
def api_contrato_eliminar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        Contrato.objects.get(id=data["id"]).delete()
        return JsonResponse({"ok": True})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@login_required
def api_anexo_guardar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        contrato = get_object_or_404(Contrato, id=data["contrato_id"])
        anexo = AnexoContrato.objects.create(
            contrato=contrato,
            clausula_modificada=data["clausula"],
            nuevo_texto=data["nuevo_texto"],
        )
        return JsonResponse({"ok": True, "id": anexo.id})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@login_required
def app_horas_extra(request):
    contratos = Contrato.objects.select_related("empresa").all()
    return render(request, "app/horas_extra.html", {
        "contratos": contratos,
    })


@login_required
def api_pactos_listar(request):
    contrato_id = request.GET.get("contrato_id")
    qs = PactoHorasExtra.objects.select_related("contrato__empresa").all()
    if contrato_id:
        qs = qs.filter(contrato_id=contrato_id)
    return JsonResponse({
        "pactos": [{
            "id": p.id,
            "contrato_id": p.contrato_id,
            "trabajador": f"{p.contrato.nombres} {p.contrato.apellidos}",
            "empresa": p.contrato.empresa.razon_social,
            "fecha_inicio": p.fecha_inicio.isoformat(),
            "fecha_fin": p.fecha_fin.isoformat(),
            "activo": p.activo,
            "renovado": p.renovado,
            "numero_renovacion": p.numero_renovacion,
            "dias_restantes": (p.fecha_fin - timezone.localdate()).days,
        } for p in qs]
    })


@csrf_exempt
@login_required
def api_pacto_renovar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        pacto = get_object_or_404(PactoHorasExtra, id=data["id"])
        from datetime import timedelta
        nuevo = PactoHorasExtra.objects.create(
            contrato=pacto.contrato,
            fecha_inicio=pacto.fecha_fin + timedelta(days=1),
            fecha_fin=pacto.fecha_fin + timedelta(days=91),
            activo=True,
            renovado=False,
            numero_renovacion=pacto.numero_renovacion + 1,
        )
        pacto.activo = False
        pacto.renovado = True
        pacto.save(update_fields=["activo", "renovado"])
        return JsonResponse({"ok": True, "nuevo_id": nuevo.id})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@login_required
def api_pacto_eliminar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        PactoHorasExtra.objects.filter(id=data["id"]).delete()
        return JsonResponse({"ok": True})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@login_required
def app_alertas(request):
    empresas = Empresa.objects.all()
    return render(request, "app/alertas.html", {"empresas": empresas})


@login_required
def api_alertas_listar(request):
    qs = Alerta.objects.select_related("empresa").all()
    return JsonResponse({
        "alertas": [{
            "id": a.id, "tipo": a.tipo, "tipo_display": a.get_tipo_display(),
            "empresa": a.empresa.razon_social,
            "titulo": a.titulo, "mensaje": a.mensaje,
            "leido": a.leido,
            "created_at": a.created_at.isoformat(),
        } for a in qs]
    })


@csrf_exempt
@login_required
def api_alertas_config_guardar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        empresa = get_object_or_404(Empresa, rut=data["rut_empresa"].strip().upper())
        config, _ = AlertaConfig.objects.update_or_create(
            empresa=empresa,
            defaults={
                "email_notificar": data.get("email", ""),
                "whatsapp_activo": data.get("whatsapp_activo", False),
                "whatsapp_numero": data.get("whatsapp_numero", ""),
                "alertar_contratos": data.get("alertar_contratos", True),
                "alertar_pactos": data.get("alertar_pactos", True),
                "alertar_parametros": data.get("alertar_parametros", True),
                "dias_anticipacion": int(data.get("dias_anticipacion", 7)),
            },
        )
        return JsonResponse({"ok": True, "id": config.id})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@login_required
def api_alertas_config(request):
    rut = request.GET.get("rut_empresa", "").strip().upper()
    if not rut:
        return JsonResponse({"configs": [{
            "rut_empresa": c.empresa.rut,
            "email": c.email_notificar,
            "whatsapp_activo": c.whatsapp_activo,
            "whatsapp_numero": c.whatsapp_numero,
            "alertar_contratos": c.alertar_contratos,
            "alertar_pactos": c.alertar_pactos,
            "alertar_parametros": c.alertar_parametros,
            "dias_anticipacion": c.dias_anticipacion,
        } for c in AlertaConfig.objects.select_related("empresa").all()]})
    try:
        empresa = Empresa.objects.get(rut=rut)
        config, _ = AlertaConfig.objects.get_or_create(empresa=empresa)
        return JsonResponse({
            "config": {
                "rut_empresa": config.empresa.rut,
                "email": config.email_notificar,
                "whatsapp_activo": config.whatsapp_activo,
                "whatsapp_numero": config.whatsapp_numero,
                "alertar_contratos": config.alertar_contratos,
                "alertar_pactos": config.alertar_pactos,
                "alertar_parametros": config.alertar_parametros,
                "dias_anticipacion": config.dias_anticipacion,
            }
        })
    except Empresa.DoesNotExist:
        return JsonResponse({"error": "Empresa no encontrada"}, status=404)


@csrf_exempt
@login_required
def api_alertas_marcar_leido(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        if data.get("todas"):
            Alerta.objects.filter(leido=False).update(leido=True)
        else:
            Alerta.objects.filter(id=data["id"]).update(leido=True)
        return JsonResponse({"ok": True})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@login_required
def api_alertas_procesar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        from django.core.management import call_command
        from io import StringIO
        buf = StringIO()
        call_command("verificar_alertas", stdout=buf)
        output = buf.getvalue()
        return JsonResponse({"ok": True, "output": output})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@login_required
def api_consultar_afp(request):
    rut = request.GET.get("rut", "").strip().upper()
    if not rut:
        return JsonResponse({"error": "RUT requerido"}, status=400)
    try:
        from .scraping_sp import consultar_afp
        from datetime import timedelta

        cache = DatoPrevisional.objects.filter(rut_trabajador=rut).first()
        if cache and cache.fecha_consulta > timezone.now() - timedelta(hours=24):
            return JsonResponse({
                "cache": True,
                "afp": cache.afp,
                "nombres": cache.nombres,
                "apellidos": cache.apellidos,
                "fecha_afiliacion": cache.fecha_afiliacion.isoformat() if cache.fecha_afiliacion else None,
                "estado": cache.estado,
                "tipo": cache.tipo,
            })

        resultado = consultar_afp(rut)
        if resultado is None:
            return JsonResponse({"error": "Error al consultar Superintendencia de Pensiones"}, status=502)
        if resultado.get("error"):
            return JsonResponse({"error": resultado["error"]}, status=404)

        DatoPrevisional.objects.update_or_create(
            rut_trabajador=rut,
            defaults={
                "nombres": resultado.get("nombres", ""),
                "apellidos": resultado.get("apellidos", ""),
                "afp": resultado.get("afp", ""),
                "fecha_afiliacion": resultado.get("fecha_afiliacion"),
                "estado": resultado.get("estado", ""),
                "tipo": resultado.get("tipo", ""),
            },
        )
        return JsonResponse({
            "cache": False,
            "afp": resultado.get("afp"),
            "nombres": resultado.get("nombres"),
            "apellidos": resultado.get("apellidos"),
            "fecha_afiliacion": resultado.get("fecha_afiliacion").isoformat() if resultado.get("fecha_afiliacion") else None,
            "estado": resultado.get("estado"),
            "tipo": resultado.get("tipo"),
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
def api_alertas_no_leidas(request):
    count = Alerta.objects.filter(leido=False).count()
    return JsonResponse({"no_leidas": count})


@login_required
def api_pactos_alerta(request):
    hoy = timezone.localdate()
    from datetime import timedelta
    limite = hoy + timedelta(days=7)
    proximos = PactoHorasExtra.objects.filter(
        activo=True, fecha_fin__gte=hoy, fecha_fin__lte=limite
    ).select_related("contrato__empresa")
    vencidos = PactoHorasExtra.objects.filter(
        activo=True, fecha_fin__lt=hoy
    ).select_related("contrato__empresa")
    return JsonResponse({
        "proximos": [{
            "id": p.id, "trabajador": f"{p.contrato.nombres} {p.contrato.apellidos}",
            "empresa": p.contrato.empresa.razon_social,
            "fecha_fin": p.fecha_fin.isoformat(), "dias": (p.fecha_fin - hoy).days,
        } for p in proximos],
        "vencidos": [{
            "id": p.id, "trabajador": f"{p.contrato.nombres} {p.contrato.apellidos}",
            "empresa": p.contrato.empresa.razon_social,
            "fecha_fin": p.fecha_fin.isoformat(),
        } for p in vencidos],
    })


@login_required
def app_dashboard(request):
    return render(request, "app/dashboard.html")


@login_required
def api_dashboard(request):
    hoy = timezone.localdate()
    from datetime import timedelta
    mes = hoy + timedelta(days=30)
    semana = hoy + timedelta(days=7)

    contratos_activos = Contrato.objects.filter(
        tipo__in=["indefinido", "plazo_fijo", "faena", "part_time"]
    )
    contratos_por_vencer = Contrato.objects.filter(
        tipo__in=["plazo_fijo", "faena"],
        fecha_termino__gte=hoy, fecha_termino__lte=mes,
    )
    contratos_recientes = Contrato.objects.order_by("-created_at")[:5]

    pactos_activos = PactoHorasExtra.objects.filter(activo=True)
    pactos_por_vencer = PactoHorasExtra.objects.filter(
        activo=True, fecha_fin__gte=hoy, fecha_fin__lte=semana,
    )
    pactos_vencidos = PactoHorasExtra.objects.filter(
        activo=True, fecha_fin__lt=hoy,
    )

    alertas_no_leidas = Alerta.objects.filter(leido=False)
    alertas_recientes = Alerta.objects.order_by("-created_at")[:5]

    empresas_count = Empresa.objects.count()

    return JsonResponse({
        "kpis": {
            "contratos_activos": contratos_activos.count(),
            "contratos_por_vencer": contratos_por_vencer.count(),
            "pactos_activos": pactos_activos.count(),
            "pactos_por_vencer": pactos_por_vencer.count(),
            "pactos_vencidos": pactos_vencidos.count(),
            "alertas_no_leidas": alertas_no_leidas.count(),
            "empresas": empresas_count,
        },
        "contratos_recientes": [{
            "id": c.id, "trabajador": f"{c.nombres} {c.apellidos}",
            "empresa": c.empresa.razon_social, "tipo": c.get_tipo_display(),
            "fecha_inicio": c.fecha_inicio.isoformat(),
            "fecha_termino": c.fecha_termino.isoformat() if c.fecha_termino else None,
        } for c in contratos_recientes],
        "alertas_recientes": [{
            "id": a.id, "tipo": a.tipo, "tipo_display": a.get_tipo_display(),
            "titulo": a.titulo, "leido": a.leido,
            "created_at": a.created_at.isoformat(),
        } for a in alertas_recientes],
        "parametros": {
            "ultima_actualizacion": CambioParametroLog.objects.filter(revisado=True)
                .order_by("-created_at").values_list("created_at", flat=True).first(),
            "cambios_pendientes": CambioParametroLog.objects.filter(revisado=False).count(),
        },
    })


@login_required
def app_liquidaciones(request):
    contratos = Contrato.objects.select_related("empresa").all()
    return render(request, "app/liquidaciones.html", {"contratos": contratos})


@login_required
def api_liquidaciones_listar(request):
    contrato_id = request.GET.get("contrato_id")
    qs = Liquidacion.objects.select_related("contrato__empresa").all()
    if contrato_id:
        qs = qs.filter(contrato_id=contrato_id)
    return JsonResponse({
        "liquidaciones": [{
            "id": l.id, "contrato_id": l.contrato_id,
            "trabajador": f"{l.contrato.nombres} {l.contrato.apellidos}",
            "empresa": l.contrato.empresa.razon_social,
            "periodo": l.periodo.isoformat(),
            "sueldo_base": float(l.sueldo_base),
            "horas_extra_cantidad": float(l.horas_extra_cantidad),
            "horas_extra_valor": float(l.horas_extra_valor),
            "total_imponible": float(l.total_imponible),
            "descuento_afp": float(l.descuento_afp),
            "descuento_salud": float(l.descuento_salud),
            "descuento_seg_ces": float(l.descuento_seg_ces),
            "descuento_iu": float(l.descuento_iu),
            "total_descuentos": float(l.total_descuentos),
            "liquido": float(l.liquido),
            "costo_empleador": float(l.costo_empleador),
            "created_at": l.created_at.isoformat(),
        } for l in qs]
    })


@csrf_exempt
@login_required
def api_liquidacion_generar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        contrato = get_object_or_404(Contrato, id=data["contrato_id"])
        periodo = data["periodo"]

        from decimal import Decimal, ROUND_HALF_UP
        sb = Decimal(str(data.get("sueldo_base", contrato.sueldo_base)))
        col = Decimal(str(data.get("colacion", contrato.colacion)))
        mov = Decimal(str(data.get("movilizacion", contrato.movilizacion)))
        he_cant = Decimal(str(data.get("horas_extra_cantidad", 0)))
        he_valor_hora = Decimal(str(data.get("horas_extra_valor_hora", 0)))
        he_total = he_cant * he_valor_hora

        no_imponible = col + mov
        total_imponible = sb + he_total
        liquido_bruto = total_imponible + no_imponible

        tasas = ParametroPrevisional.objects.last()
        sm = Decimal(str(tasas.sueldo_minimo)) if tasas else Decimal("500000")
        tope_afp = Decimal(str(tasas.tope_imponible_afp)) if tasas else Decimal("0")
        tope_seg = Decimal(str(tasas.tope_imponible_seg_ces)) if tasas else Decimal("0")

        afp_tasa = Decimal("0.10")
        salud_tasa = Decimal("0.07")
        seg_ces_tasa = Decimal("0.006") if contrato.tipo == "indefinido" else Decimal("0")

        base_afp = min(total_imponible, tope_afp) if tope_afp > 0 else total_imponible
        dcto_afp = (base_afp * afp_tasa).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        dcto_salud = (total_imponible * salud_tasa).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

        base_seg = min(total_imponible, tope_seg) if tope_seg > 0 else total_imponible
        dcto_seg = (base_seg * seg_ces_tasa).quantize(Decimal("1"), rounding=ROUND_HALF_UP) if seg_ces_tasa > 0 else Decimal("0")

        dcto_iu = Decimal("0")

        total_descuentos = dcto_afp + dcto_salud + dcto_seg + dcto_iu
        liquido = total_imponible - total_descuentos + no_imponible

        costo_emp = (total_imponible * Decimal("0.0064")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

        liq, created = Liquidacion.objects.update_or_create(
            contrato=contrato, periodo=periodo,
            defaults={
                "sueldo_base": sb,
                "colacion": col,
                "movilizacion": mov,
                "horas_extra_cantidad": he_cant,
                "horas_extra_valor": he_total,
                "total_imponible": total_imponible,
                "descuento_afp": dcto_afp,
                "descuento_salud": dcto_salud,
                "descuento_seg_ces": dcto_seg,
                "descuento_iu": dcto_iu,
                "total_descuentos": total_descuentos,
                "liquido": liquido,
                "costo_empleador": costo_emp,
            },
        )
        return JsonResponse({"ok": True, "creado": created, "id": liq.id})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@login_required
def api_liquidacion_eliminar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        Liquidacion.objects.filter(id=data["id"]).delete()
        return JsonResponse({"ok": True})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@login_required
def api_exportar_contratos(request):
    import csv
    from django.http import HttpResponse
    qs = Contrato.objects.select_related("empresa", "mandante").all()
    response = HttpResponse(content_type="text/csv; charset=utf-8-sig")
    response["Content-Disposition"] = 'attachment; filename="contratos.csv"'
    w = csv.writer(response)
    w.writerow(["RUT", "Nombres", "Apellidos", "Tipo", "Empresa", "Mandante", "Fecha Inicio", "Fecha Término", "Sueldo Base", "Colación", "Movilización", "Horas Semanales", "Función", "Lugar Trabajo"])
    for c in qs:
        w.writerow([c.rut_trabajador, c.nombres, c.apellidos, c.get_tipo_display(), c.empresa.razon_social, c.mandante.razon_social_mandante if c.mandante else "", c.fecha_inicio, c.fecha_termino or "", float(c.sueldo_base), float(c.colacion), float(c.movilizacion), c.horas_semanales, c.funciones[:80], c.lugar_trabajo])
    return response


@login_required
def api_exportar_liquidaciones(request):
    import csv
    from django.http import HttpResponse
    qs = Liquidacion.objects.select_related("contrato__empresa").all()
    response = HttpResponse(content_type="text/csv; charset=utf-8-sig")
    response["Content-Disposition"] = 'attachment; filename="liquidaciones.csv"'
    w = csv.writer(response)
    w.writerow(["Trabajador", "RUT", "Empresa", "Período", "Sueldo Base", "HE Cant", "HE Total", "Total Imponible", "Desc AFP", "Desc Salud", "Desc Seg Ces", "Desc IU", "Total Desc", "Líquido", "Costo Empleador"])
    for l in qs:
        w.writerow([f"{l.contrato.nombres} {l.contrato.apellidos}", l.contrato.rut_trabajador, l.contrato.empresa.razon_social, l.periodo, float(l.sueldo_base), float(l.horas_extra_cantidad), float(l.horas_extra_valor), float(l.total_imponible), float(l.descuento_afp), float(l.descuento_salud), float(l.descuento_seg_ces), float(l.descuento_iu), float(l.total_descuentos), float(l.liquido), float(l.costo_empleador)])
    return response


@login_required
def api_exportar_finiquitos(request):
    import csv
    from django.http import HttpResponse
    qs = Finiquito.objects.select_related("contrato__empresa").all()
    response = HttpResponse(content_type="text/csv; charset=utf-8-sig")
    response["Content-Disposition"] = 'attachment; filename="finiquitos.csv"'
    w = csv.writer(response)
    w.writerow(["Trabajador", "RUT", "Empresa", "Fecha Término", "Causal", "Sueldo Base", "Indem Aviso", "Indem Años", "Años Serv", "Sueldos Pend", "Feriado Prop", "HE Pend", "Bonos", "Total Haberes", "Desc", "Líquido"])
    for f in qs:
        w.writerow([f"{f.contrato.nombres} {f.contrato.apellidos}", f.contrato.rut_trabajador, f.contrato.empresa.razon_social, f.fecha_termino, f.get_causal_display(), float(f.sueldo_base), float(f.indemn_aviso_previo), float(f.indemn_anios_servicio), float(f.anios_servicio), float(f.sueldos_pendientes), float(f.feriado_proporcional), float(f.horas_extra_pendientes), float(f.otros_bonos), float(f.total_haberes), float(f.descuentos), float(f.liquido)])
    return response


@login_required
def app_vacaciones(request):
    contratos = Contrato.objects.select_related("empresa").all()
    return render(request, "app/vacaciones.html", {"contratos": contratos})


@login_required
def api_vacaciones_listar(request):
    contrato_id = request.GET.get("contrato_id")
    qs = Vacacion.objects.select_related("contrato__empresa").all()
    if contrato_id:
        qs = qs.filter(contrato_id=contrato_id)
    return JsonResponse({
        "vacaciones": [{
            "id": v.id, "contrato_id": v.contrato_id,
            "trabajador": f"{v.contrato.nombres} {v.contrato.apellidos}",
            "empresa": v.contrato.empresa.razon_social,
            "anio": v.anio,
            "dias_correspondientes": float(v.dias_correspondientes),
            "dias_pendientes_anterior": float(v.dias_pendientes_anterior),
            "dias_disfrutados": float(v.dias_disfrutados),
            "dias_pendientes": float(v.dias_pendientes),
            "solicitudes": [{
                "id": s.id, "fecha_inicio": s.fecha_inicio.isoformat(),
                "fecha_termino": s.fecha_termino.isoformat(),
                "dias_solicitados": float(s.dias_solicitados),
                "estado": s.estado,
                "comentario": s.comentario,
            } for s in v.solicitudes.all()],
        } for v in qs]
    })


@csrf_exempt
@login_required
def api_vacacion_iniciar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        contrato = get_object_or_404(Contrato, id=data["contrato_id"])
        anio = int(data["anio"])
        dias_correspondientes = Decimal(str(data.get("dias_correspondientes", 15)))
        dias_pendientes_anterior = Decimal(str(data.get("dias_pendientes_anterior", 0)))

        vac, created = Vacacion.objects.update_or_create(
            contrato=contrato, anio=anio,
            defaults={
                "dias_correspondientes": dias_correspondientes,
                "dias_pendientes_anterior": dias_pendientes_anterior,
            },
        )
        return JsonResponse({"ok": True, "creado": created, "id": vac.id})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@login_required
def api_vacacion_solicitar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        vacacion = get_object_or_404(Vacacion, id=data["vacacion_id"])
        dias = Decimal(str(data["dias_solicitados"]))
        if dias > vacacion.dias_pendientes:
            return JsonResponse({"error": f"Solo quedan {vacacion.dias_pendientes} días disponibles"}, status=400)

        solicitud = SolicitudVacacion.objects.create(
            vacacion=vacacion,
            fecha_inicio=data["fecha_inicio"],
            fecha_termino=data["fecha_termino"],
            dias_solicitados=dias,
            comentario=data.get("comentario", ""),
        )
        return JsonResponse({"ok": True, "id": solicitud.id})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@login_required
def api_vacacion_aprobar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        solicitud = get_object_or_404(SolicitudVacacion, id=data["id"])
        nuevo_estado = data.get("estado", "aprobada")
        if nuevo_estado == "aprobada":
            vac = solicitud.vacacion
            vac.dias_disfrutados += solicitud.dias_solicitados
            vac.save(update_fields=["dias_disfrutados"])
        solicitud.estado = nuevo_estado
        solicitud.save(update_fields=["estado"])
        return JsonResponse({"ok": True})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@login_required
def api_vacacion_eliminar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        SolicitudVacacion.objects.filter(id=data["id"]).delete()
        return JsonResponse({"ok": True})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@login_required
def app_finiquitos(request):
    contratos = Contrato.objects.select_related("empresa").all()
    return render(request, "app/finiquitos.html", {"contratos": contratos})


@login_required
def api_finiquitos_listar(request):
    contrato_id = request.GET.get("contrato_id")
    qs = Finiquito.objects.select_related("contrato__empresa").all()
    if contrato_id:
        qs = qs.filter(contrato_id=contrato_id)
    return JsonResponse({
        "finiquitos": [{
            "id": f.id, "contrato_id": f.contrato_id,
            "trabajador": f"{f.contrato.nombres} {f.contrato.apellidos}",
            "empresa": f.contrato.empresa.razon_social,
            "fecha_termino": f.fecha_termino.isoformat(),
            "causal": f.causal,
            "causal_display": f.get_causal_display(),
            "sueldo_base": float(f.sueldo_base),
            "indemn_aviso_previo": float(f.indemn_aviso_previo),
            "indemn_anios_servicio": float(f.indemn_anios_servicio),
            "anios_servicio": float(f.anios_servicio),
            "feriado_proporcional": float(f.feriado_proporcional),
            "sueldos_pendientes": float(f.sueldos_pendientes),
            "horas_extra_pendientes": float(f.horas_extra_pendientes),
            "otros_bonos": float(f.otros_bonos),
            "total_haberes": float(f.total_haberes),
            "descuentos": float(f.descuentos),
            "liquido": float(f.liquido),
            "created_at": f.created_at.isoformat(),
        } for f in qs]
    })


@csrf_exempt
@login_required
def api_finiquito_generar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        contrato = get_object_or_404(Contrato, id=data["contrato_id"])

        from decimal import Decimal, ROUND_HALF_UP
        sueldo_base = Decimal(str(data.get("sueldo_base", contrato.sueldo_base)))
        fecha_termino = data["fecha_termino"]
        causal = data["causal"]
        aviso_previo = data.get("aviso_previo", False)
        dias_trabajados = Decimal(str(data.get("dias_trabajados", 0)))
        otros_bonos = Decimal(str(data.get("otros_bonos", 0)))
        horas_extra_pendientes = Decimal(str(data.get("horas_extra_pendientes", 0)))

        params = ParametroPrevisional.objects.last()
        tope_uf = Decimal(str(params.tope_imponible_afp)) if params else Decimal("0")
        sueldo_diario = sueldo_base / Decimal("30")

        # Indemnización sustitutiva de aviso previo (Art.162)
        # 1 mes de sueldo si no se avisó con 30 días; solo para necesidades empresa o despido indirecto
        if not aviso_previo and causal in ("necesidades_empresa", "despido_indirecto"):
            indemn_aviso = min(sueldo_base, tope_uf) if tope_uf > 0 else sueldo_base
        else:
            indemn_aviso = Decimal("0")

        # Indemnización por años de servicio (Art.163)
        from datetime import date
        inicio = contrato.fecha_inicio
        fin = date.fromisoformat(fecha_termino)

        dias_totales = (fin - inicio).days
        anios = Decimal(str(max(0, dias_totales))) / Decimal("365")
        anios_servicio = anios.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)

        tope_anios = 11
        if causal in ("vencimiento_plazo", "conclusion_faena") and dias_totales < 365:
            anios_indemn = Decimal("0")
        else:
            anios_indemn = min(anios, Decimal(str(tope_anios)))

        tope_sueldo = min(sueldo_base, tope_uf) if tope_uf > 0 else sueldo_base
        indemn_anios = (tope_sueldo * anios_indemn).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

        # Sueldos pendientes
        sueldos_pend = (sueldo_diario * dias_trabajados).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

        # Feriado proporcional: (días trabajados / 360) * 15 * sueldo_diario
        feriado = (Decimal(str(dias_totales)) / Decimal("360") * Decimal("15") * sueldo_diario).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

        # Total haberes
        total_haberes = (indemn_aviso + indemn_anios + sueldos_pend + feriado + horas_extra_pendientes + otros_bonos).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

        # Descuentos (AFP + salud sobre sueldos pendientes aprox)
        desc = (sueldos_pend * Decimal("0.17")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

        liquido = total_haberes - desc

        finiquito, created = Finiquito.objects.update_or_create(
            contrato=contrato, fecha_termino=fecha_termino, causal=causal,
            defaults={
                "sueldo_base": sueldo_base,
                "aviso_previo": aviso_previo,
                "dias_trabajados": dias_trabajados,
                "indemn_aviso_previo": indemn_aviso,
                "indemn_anios_servicio": indemn_anios,
                "anios_servicio": anios_servicio,
                "sueldos_pendientes": sueldos_pend,
                "feriado_proporcional": feriado,
                "horas_extra_pendientes": horas_extra_pendientes,
                "otros_bonos": otros_bonos,
                "total_haberes": total_haberes,
                "descuentos": desc,
                "liquido": liquido,
                "observaciones": data.get("observaciones", ""),
            },
        )
        return JsonResponse({"ok": True, "creado": created, "id": finiquito.id})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@login_required
def api_finiquito_eliminar(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        Finiquito.objects.filter(id=data["id"]).delete()
        return JsonResponse({"ok": True})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)
