const estado = {
    parametros: null,
    tasas_afp: [],
    tramos_iu: [],
    modo: "bruto_a_liquido",
    resultado: null,
};

async function cargarParametros() {
    try {
        const [paramRes, afpRes, iuRes] = await Promise.all([
            fetch("/api/parametros"),
            fetch("/api/tasas-afp"),
            fetch("/api/tramos-impuesto"),
        ]);
        if (!paramRes.ok) throw new Error("Parámetros no disponibles (ejecuta scraping o siembra datos)");
        estado.parametros = await paramRes.json();
        const afpData = await afpRes.json();
        estado.tasas_afp = afpData.tasas || [];
        const iuData = await iuRes.json();
        estado.tramos_iu = iuData.tramos || [];
    } catch (e) {
        document.getElementById("resultados-placeholder").innerHTML =
            `<i class="fas fa-exclamation-triangle text-4xl mb-3 text-red-400"></i>
             <p class="text-sm text-red-300">${e.message}</p>`;
        return;
    }
    poblarAFP();
}

function poblarAFP() {
    const sel = document.getElementById("afp");
    if (!sel) return;
    if (!estado.tasas_afp.length) {
        sel.innerHTML = '<option value="">Sin AFP disponible</option>';
        return;
    }
    if (sel.options.length > 1) return;
    sel.innerHTML = '<option value="">Seleccionar AFP...</option>' +
        estado.tasas_afp.map(a =>
            `<option value="${a.nombre}">${a.nombre} (${(a.tasa_cotizacion + a.tasa_sis).toFixed(2)}%)</option>`
        ).join("");
}

document.addEventListener("DOMContentLoaded", function () {
    var selAFP = document.getElementById("afp");
    if (selAFP && selAFP.options.length <= 1) {
        fetch("/api/tasas-afp")
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.tasas && data.tasas.length) {
                    estado.tasas_afp = data.tasas;
                    poblarAFP();
                }
            })
            .catch(function() {});
    }
});

function redondear(val) {
    return Math.round(val * 100) / 100;
}

function calcularIU(sueldoTributable, utm, tramos) {
    if (sueldoTributable <= 0) return 0;
    const rentaUtm = sueldoTributable / utm;
    let impuesto = 0;
    for (const t of tramos) {
        const desde = t.desde_utm;
        const hasta = t.hasta_utm;
        if ((hasta === null && rentaUtm >= desde) ||
            (hasta !== null && rentaUtm >= desde && rentaUtm < hasta)) {
            impuesto = rentaUtm * t.factor - t.rebaja_utm;
            break;
        }
    }
    return Math.max(0, impuesto) * utm;
}

function calcularDesdeForm() {
    const datos = leerFormulario();
    let resultado;
    if (estado.modo === "bruto_a_liquido") {
        resultado = calcularBrutoALiquido(datos);
    } else {
        resultado = calcularLiquidoABruto(datos);
    }
    estado.resultado = resultado;
    mostrarResultados(resultado);
    return resultado;
}

function leerFormulario() {
    return {
        sueldo_base: parseFloat(document.getElementById("sueldo_base").value) || 0,
        otros_bonos: parseFloat(document.getElementById("otros_bonos").value) || 0,
        colacion: parseFloat(document.getElementById("colacion").value) || 0,
        movilizacion: parseFloat(document.getElementById("movilizacion").value) || 0,
        otros_no_imponibles: parseFloat(document.getElementById("otros_no_imponibles").value) || 0,
        tipo_contrato: document.getElementById("tipo_contrato").value,
        tipo_gratificacion: document.getElementById("tipo_gratificacion").value,
        afp: document.getElementById("afp").value,
        salud_tipo: document.getElementById("salud_tipo").value,
        plan_isapre_uf: parseFloat(document.getElementById("plan_isapre_uf").value) || 0,
    };
}

function calcularBrutoALiquido(d) {
    const p = estado.parametros;
    if (!p) return { error: "Parámetros previsionales no cargados" };
    const utm = p.valor_utm;
    const uf = p.valor_uf;

    const gratificacion = d.tipo_gratificacion === "sin" ? 0
        : Math.min(d.sueldo_base * 0.25, p.tope_gratificacion);

    const haberesImp = d.sueldo_base + d.otros_bonos + gratificacion;
    const haberesNoImp = d.colacion + d.movilizacion + d.otros_no_imponibles;

    const tasaAFP = estado.tasas_afp.find(a => a.nombre === d.afp);
    const tasaAFPct = tasaAFP ? tasaAFP.tasa_cotizacion / 100 : 0;

    const baseAFP = Math.min(haberesImp, p.tope_imponible_afp);
    const descAFP = baseAFP * tasaAFPct;

    const tasaSalud = d.salud_tipo === "isapre"
        ? (d.plan_isapre_uf * uf) / baseAFP
        : p.tasa_fonasa / 100;
    const descSalud = d.salud_tipo === "isapre"
        ? d.plan_isapre_uf * uf
        : baseAFP * tasaSalud;

    let tasaAFCt = p.tasa_afc_trabajador / 100;
    if (["plazo_fijo", "indefinido_11anos", "casa_particular"].includes(d.tipo_contrato)) {
        tasaAFCt = 0;
    }
    const descAFC = Math.min(haberesImp, p.tope_imponible_seg_ces) * tasaAFCt;

    const totalDesc = descAFP + descSalud + descAFC;
    const sueldoTributable = haberesImp - totalDesc;
    const iu = calcularIU(sueldoTributable, utm, estado.tramos_iu);
    const sueldoLiquido = sueldoTributable - iu + haberesNoImp;

    const costos = calcularCostos(haberesImp, p, d.tipo_contrato);
    const costoTotal = sueldoLiquido + totalDesc + costos.total;

    return {
        modo: "bruto_a_liquido",
        sueldo_base: d.sueldo_base,
        gratificacion,
        haberes_imponibles: haberesImp,
        haberes_no_imponibles: haberesNoImp,
        descuento_afp: descAFP,
        descuento_salud: descSalud,
        descuento_afc: descAFC,
        total_descuentos: totalDesc,
        sueldo_tributable: sueldoTributable,
        impuesto_unico: iu,
        sueldo_liquido: sueldoLiquido,
        costo_empleador_afc: costos.afc,
        costo_empleador_sis: costos.sis,
        costo_empleador_seguro: costos.seguro,
        costo_empleador_reforma: costos.reforma,
        total_empleador: costos.total,
        costo_total_trabajador: costoTotal,
    };
}

function calcularLiquidoABruto(d) {
    const p = estado.parametros;
    if (!p) return { error: "Parámetros previsionales no cargados" };
    const haberesNoImp = d.colacion + d.movilizacion + d.otros_no_imponibles;
    const objetivo = d.sueldo_base - haberesNoImp;

    if (objetivo <= 0) return { error: "Sueldo líquido debe ser mayor a no imponibles" };

    const tasaAFP = estado.tasas_afp.find(a => a.nombre === d.afp);
    const tasaAFPct = tasaAFP ? tasaAFP.tasa_cotizacion / 100 : 0;
    const tasaSalud = p.tasa_fonasa / 100;

    let tasaAFCt = p.tasa_afc_trabajador / 100;
    if (["plazo_fijo", "indefinido_11anos", "casa_particular"].includes(d.tipo_contrato)) {
        tasaAFCt = 0;
    }

    function iterar(sb) {
        const grat = d.tipo_gratificacion === "sin" ? 0 : Math.min(sb * 0.25, p.tope_gratificacion);
        const hi = sb + d.otros_bonos + grat;
        const base = Math.min(hi, p.tope_imponible_afp);
        const dAFP = base * tasaAFPct;
        const dSalud = base * tasaSalud;
        const dAFC = Math.min(hi, p.tope_imponible_seg_ces) * tasaAFCt;
        const st = hi - dAFP - dSalud - dAFC;
        const iu = calcularIU(st, p.valor_utm, estado.tramos_iu);
        return st - iu;
    }

    let lo = 1, hi = d.sueldo_base * 2;
    for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        const val = iterar(mid);
        if (Math.abs(val - objetivo) < 1) break;
        if (val < objetivo) lo = mid;
        else hi = mid;
    }

    const sb = (lo + hi) / 2;
    const grat = d.tipo_gratificacion === "sin" ? 0 : Math.min(sb * 0.25, p.tope_gratificacion);
    const hi2 = sb + d.otros_bonos + grat;
    const base = Math.min(hi2, p.tope_imponible_afp);
    const dAFP = base * tasaAFPct;
    const dSalud = base * tasaSalud;
    const dAFC = Math.min(hi2, p.tope_imponible_seg_ces) * tasaAFCt;
    const totalDesc = dAFP + dSalud + dAFC;
    const st = hi2 - totalDesc;
    const iu = calcularIU(st, p.valor_utm, estado.tramos_iu);
    const sl = st - iu + haberesNoImp;

    const costos = calcularCostos(hi2, p, d.tipo_contrato);
    const costoTotal = sl + totalDesc + costos.total;

    return {
        modo: "liquido_a_bruto",
        sueldo_base: sb,
        gratificacion: grat,
        haberes_imponibles: hi2,
        haberes_no_imponibles: haberesNoImp,
        descuento_afp: dAFP,
        descuento_salud: dSalud,
        descuento_afc: dAFC,
        total_descuentos: totalDesc,
        sueldo_tributable: st,
        impuesto_unico: iu,
        sueldo_liquido: sl,
        costo_empleador_afc: costos.afc,
        costo_empleador_sis: costos.sis,
        costo_empleador_seguro: costos.seguro,
        costo_empleador_reforma: costos.reforma,
        total_empleador: costos.total,
        costo_total_trabajador: costoTotal,
    };
}

function calcularCostos(haberesImp, p, tipoContrato) {
    const baseAFC = Math.min(haberesImp, p.tope_imponible_seg_ces);
    const baseSIS = Math.min(haberesImp, p.tope_imponible_afp);

    let tasaAFCe;
    if (tipoContrato === "plazo_fijo") tasaAFCe = p.tasa_afc_empresa_plazofijo;
    else if (tipoContrato === "indefinido_11anos") tasaAFCe = p.tasa_afc_empresa_11anos;
    else if (tipoContrato === "casa_particular") tasaAFCe = p.tasa_afc_empresa_casaparticular;
    else tasaAFCe = p.tasa_afc_empresa_indefinido;

    const afc = baseAFC * (tasaAFCe / 100);
    const sis = baseSIS * (p.tasa_sis / 100);
    const seguro = baseSIS * 0.0348;
    const reforma = baseSIS * 0.01;
    return { afc, sis, seguro, reforma, total: afc + sis + seguro + reforma };
}

function mostrarResultados(r) {
    const placeholder = document.getElementById("resultados-placeholder");
    const content = document.getElementById("resultados-content");
    if (r.error) {
        placeholder.classList.remove("hidden");
        content.classList.add("hidden");
        placeholder.innerHTML = `<i class="fas fa-exclamation-circle text-4xl mb-3 text-red-400"></i><p class="text-sm text-red-300">${r.error}</p>`;
        return;
    }
    placeholder.classList.add("hidden");
    content.classList.remove("hidden");

    const rows = [
        { label: "Sueldo base", value: r.sueldo_base, highlight: false },
        { label: "Gratificación", value: r.gratificacion, highlight: false },
        { label: "Haberes imponibles", value: r.haberes_imponibles, highlight: true },
        { label: "Haberes no imponibles", value: r.haberes_no_imponibles, highlight: true },
    ];
    if (r.modo === "bruto_a_liquido") {
        rows.push(
            { label: "Descuento AFP", value: r.descuento_afp, highlight: false },
            { label: "Descuento Salud", value: r.descuento_salud, highlight: false },
            { label: "Descuento AFC", value: r.descuento_afc, highlight: false },
            { label: "Total descuentos", value: r.total_descuentos, highlight: true },
            { label: "Sueldo tributalbe", value: r.sueldo_tributable, highlight: true },
            { label: "Impuesto Único", value: r.impuesto_unico, highlight: false },
        );
    } else {
        rows.push(
            { label: "Sueldo líquido deseado", value: r.sueldo_liquido, highlight: true },
        );
    }
    rows.push(
        { label: "Sueldo líquido", value: r.sueldo_liquido, highlight: true },
        { label: "Costo empleador - AFC", value: r.costo_empleador_afc, highlight: false },
        { label: "Costo empleador - SIS", value: r.costo_empleador_sis, highlight: false },
        { label: "Costo empleador - Seguro Mutual", value: r.costo_empleador_seguro, highlight: false },
        { label: "Costo empleador - Reforma", value: r.costo_empleador_reforma, highlight: false },
        { label: "Total empleador", value: r.total_empleador, highlight: true },
    );

    const tbody = document.getElementById("resultados-body");
    tbody.innerHTML = rows.map(rr =>
        `<tr class="${rr.highlight ? 'highlight-row' : ''}">
            <td class="text-slate-400">${rr.label}</td>
            <td class="text-right font-semibold text-slate-200">
                ${rr.value !== undefined ? formatearPeso(rr.value) : '-'}
            </td>
        </tr>`
    ).join("");

    document.getElementById("result-liquido").textContent = formatearPeso(r.sueldo_liquido);
    document.getElementById("result-costo-total").textContent = formatearPeso(r.costo_total_trabajador);
    document.getElementById("btn-enviar-whatsapp").classList.remove("hidden");
}

function formatearPeso(valor) {
    if (valor === undefined || valor === null || isNaN(valor) || !isFinite(valor)) return "$0";
    return "$" + Math.round(valor).toLocaleString("es-CL");
}

function limpiarFormulario() {
    document.querySelectorAll(".input-field[type=number]").forEach(el => el.value = "");
    document.querySelectorAll(".input-field[type=text]").forEach(el => el.value = "");
    document.getElementById("resultados-placeholder").classList.remove("hidden");
    document.getElementById("resultados-content").classList.add("hidden");
    document.getElementById("btn-enviar-whatsapp").classList.add("hidden");
}
