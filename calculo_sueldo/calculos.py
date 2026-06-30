from decimal import Decimal, ROUND_HALF_UP

def calcular_bruto_a_liquido(data, params, tasas_afp, tramos_iu):
    sueldo_base = Decimal(str(data.get("sueldo_base", 0)))
    otros_bonos = Decimal(str(data.get("otros_bonos", 0)))
    colacion = Decimal(str(data.get("colacion", 0)))
    movilizacion = Decimal(str(data.get("movilizacion", 0)))
    otros_no_imponibles = Decimal(str(data.get("otros_no_imponibles", 0)))
    tipo_contrato = data.get("tipo_contrato", "indefinido")
    tipo_gratificacion = data.get("tipo_gratificacion", "mensual")
    afp_nombre = data.get("afp", "AFP Habitat")
    salud_tipo = data.get("salud_tipo", "fonasa")
    plan_isapre_uf = Decimal(str(data.get("plan_isapre_uf", 0)))

    utm = params.valor_utm
    uf = params.valor_uf

    # Gratificación legal
    gratificacion = Decimal("0")
    if tipo_gratificacion != "sin":
        gratificacion = sueldo_base * Decimal("0.25")
        if gratificacion > params.tope_gratificacion:
            gratificacion = params.tope_gratificacion

    haberes_imponibles = sueldo_base + otros_bonos + gratificacion
    haberes_no_imponibles = colacion + movilizacion + otros_no_imponibles

    # Topes
    tope_afp = params.tope_imponible_afp
    tope_seg_ces = params.tope_imponible_seg_ces

    # AFP
    tasa_afp = Decimal("0")
    for afp in tasas_afp:
        if afp["nombre"] == afp_nombre:
            tasa_afp = Decimal(str(afp["tasa_cotizacion"])) / Decimal("100")
            break
    base_afp = min(haberes_imponibles, tope_afp)
    desc_afp = base_afp * tasa_afp

    # Salud
    tasa_salud = params.tasa_fonasa / Decimal("100")
    if plan_isapre_uf > 0:
        valor_isapre = plan_isapre_uf * uf
        desc_salud = valor_isapre
    else:
        desc_salud = base_afp * tasa_salud

    # AFC trabajador
    tasa_afc_t = params.tasa_afc_trabajador / Decimal("100")
    if tipo_contrato == "plazo_fijo":
        tasa_afc_t = Decimal("0")
    elif tipo_contrato == "indefinido_11anos":
        tasa_afc_t = Decimal("0")
    elif tipo_contrato == "casa_particular":
        tasa_afc_t = Decimal("0")
    desc_afc = min(haberes_imponibles, tope_seg_ces) * tasa_afc_t

    total_descuentos = desc_afp + desc_salud + desc_afc
    sueldo_tributable = haberes_imponibles - total_descuentos

    # Impuesto Único
    impuesto_unico = calcular_impuesto_unico(sueldo_tributable, utm, tramos_iu)

    sueldo_liquido = sueldo_tributable - impuesto_unico + haberes_no_imponibles

    # Costos empleador
    costos = calcular_costos_empleador(haberes_imponibles, tope_seg_ces, params, tipo_contrato)
    costo_total = sueldo_liquido + total_descuentos + costos["total_empleador"]

    return {
        "modo": "bruto_a_liquido",
        "sueldo_base": float(sueldo_base),
        "gratificacion": float(gratificacion),
        "haberes_imponibles": float(haberes_imponibles),
        "haberes_no_imponibles": float(haberes_no_imponibles),
        "descuento_afp": float(desc_afp),
        "descuento_salud": float(desc_salud),
        "descuento_afc": float(desc_afc),
        "total_descuentos": float(total_descuentos),
        "sueldo_tributable": float(sueldo_tributable),
        "impuesto_unico": float(impuesto_unico),
        "sueldo_liquido": float(sueldo_liquido),
        "costo_empleador_afc": float(costos["afc_empleador"]),
        "costo_empleador_sis": float(costos["sis"]),
        "costo_empleador_seguro": float(costos["seguro"]),
        "costo_empleador_reforma": float(costos["reforma"]),
        "total_empleador": float(costos["total_empleador"]),
        "costo_total_trabajador": float(costo_total),
    }


def calcular_liquido_a_bruto(data, params, tasas_afp, tramos_iu):
    sueldo_liquido_deseado = Decimal(str(data.get("sueldo_liquido_deseado", 0)))
    colacion = Decimal(str(data.get("colacion", 0)))
    movilizacion = Decimal(str(data.get("movilizacion", 0)))
    otros_no_imponibles = Decimal(str(data.get("otros_no_imponibles", 0)))
    otros_bonos = Decimal(str(data.get("otros_bonos", 0)))
    tipo_contrato = data.get("tipo_contrato", "indefinido")
    tipo_gratificacion = data.get("tipo_gratificacion", "mensual")
    afp_nombre = data.get("afp", "AFP Habitat")
    salud_tipo = data.get("salud_tipo", "fonasa")
    plan_isapre_uf = Decimal(str(data.get("plan_isapre_uf", 0)))

    haberes_no_imponibles = colacion + movilizacion + otros_no_imponibles
    sueldo_tributable_objetivo = sueldo_liquido_deseado - haberes_no_imponibles

    if sueldo_tributable_objetivo <= 0:
        return {"error": "El sueldo líquido deseado debe ser mayor a los haberes no imponibles"}

    # Búsqueda binaria para encontrar sueldo base
    tasa_afp = Decimal("0")
    for afp in tasas_afp:
        if afp["nombre"] == afp_nombre:
            tasa_afp = Decimal(str(afp["tasa_cotizacion"])) / Decimal("100")
            break

    tasa_salud = params.tasa_fonasa / Decimal("100")
    tasa_afc_t = params.tasa_afc_trabajador / Decimal("100")
    if tipo_contrato in ("plazo_fijo", "indefinido_11anos", "casa_particular"):
        tasa_afc_t = Decimal("0")

    def iterar(sb):
        grat = sb * Decimal("0.25")
        if grat > params.tope_gratificacion:
            grat = params.tope_gratificacion
        hi = sb + otros_bonos + grat
        base = min(hi, params.tope_imponible_afp)
        d_afp = base * tasa_afp
        d_salud = base * tasa_salud
        d_afc = min(hi, params.tope_imponible_seg_ces) * tasa_afc_t
        st = hi - d_afp - d_salud - d_afc
        iu = calcular_impuesto_unico(st, params.valor_utm, tramos_iu)
        return st - iu

    lo = Decimal("1")
    hi = sueldo_liquido_deseado * Decimal("2")
    for _ in range(200):
        mid = (lo + hi) / Decimal("2")
        val = iterar(mid)
        if abs(val - sueldo_tributable_objetivo) < Decimal("1"):
            break
        if val < sueldo_tributable_objetivo:
            lo = mid
        else:
            hi = mid

    sueldo_base = (lo + hi) / Decimal("2")
    gratificacion = sueldo_base * Decimal("0.25")
    if gratificacion > params.tope_gratificacion:
        gratificacion = params.tope_gratificacion
    haberes_imponibles = sueldo_base + otros_bonos + gratificacion
    base = min(haberes_imponibles, params.tope_imponible_afp)
    desc_afp = base * tasa_afp
    desc_salud = base * tasa_salud
    desc_afc = min(haberes_imponibles, params.tope_imponible_seg_ces) * tasa_afc_t
    total_descuentos = desc_afp + desc_salud + desc_afc
    st = haberes_imponibles - total_descuentos
    iu = calcular_impuesto_unico(st, params.valor_utm, tramos_iu)
    sl = st - iu + haberes_no_imponibles

    costos = calcular_costos_empleador(haberes_imponibles, params.tope_imponible_seg_ces, params, tipo_contrato)
    costo_total = sl + total_descuentos + costos["total_empleador"]

    return {
        "modo": "liquido_a_bruto",
        "sueldo_base": float(sueldo_base),
        "gratificacion": float(gratificacion),
        "haberes_imponibles": float(haberes_imponibles),
        "haberes_no_imponibles": float(haberes_no_imponibles),
        "descuento_afp": float(desc_afp),
        "descuento_salud": float(desc_salud),
        "descuento_afc": float(desc_afc),
        "total_descuentos": float(total_descuentos),
        "sueldo_tributable": float(st),
        "impuesto_unico": float(iu),
        "sueldo_liquido": float(sl),
        "costo_empleador_afc": float(costos["afc_empleador"]),
        "costo_empleador_sis": float(costos["sis"]),
        "costo_empleador_seguro": float(costos["seguro"]),
        "costo_empleador_reforma": float(costos["reforma"]),
        "total_empleador": float(costos["total_empleador"]),
        "costo_total_trabajador": float(costo_total),
    }


def calcular_impuesto_unico(sueldo_tributable, utm, tramos_iu):
    if sueldo_tributable <= 0:
        return Decimal("0")
    renta_utm = sueldo_tributable / utm
    impuesto = Decimal("0")
    for t in tramos_iu:
        desde = Decimal(str(t["desde_utm"]))
        hasta = Decimal(str(t["hasta_utm"])) if t["hasta_utm"] else None
        factor = Decimal(str(t["factor"]))
        rebaja = Decimal(str(t["rebaja_utm"]))
        if hasta and desde <= renta_utm < hasta:
            impuesto = renta_utm * factor - rebaja
            break
        elif not hasta and desde <= renta_utm:
            impuesto = renta_utm * factor - rebaja
            break
    if impuesto < 0:
        impuesto = Decimal("0")
    return impuesto * utm


def calcular_costos_empleador(haberes_imponibles, tope_seg_ces, params, tipo_contrato):
    base_afc = min(haberes_imponibles, tope_seg_ces)
    base_sis = min(haberes_imponibles, params.tope_imponible_afp)

    if tipo_contrato == "plazo_fijo":
        tasa_afc_e = params.tasa_afc_empresa_plazofijo
    elif tipo_contrato == "indefinido_11anos":
        tasa_afc_e = params.tasa_afc_empresa_11anos
    elif tipo_contrato == "casa_particular":
        tasa_afc_e = params.tasa_afc_empresa_casaparticular
    else:
        tasa_afc_e = params.tasa_afc_empresa_indefinido

    afc_e = base_afc * (tasa_afc_e / Decimal("100"))
    sis = base_sis * (params.tasa_sis / Decimal("100"))
    seguro = base_sis * Decimal("0.0348")
    reforma = base_sis * Decimal("0.01")
    total = afc_e + sis + seguro + reforma

    return {
        "afc_empleador": afc_e,
        "sis": sis,
        "seguro": seguro,
        "reforma": reforma,
        "total_empleador": total,
    }
