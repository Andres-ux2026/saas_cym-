document.addEventListener("DOMContentLoaded", function () {
  const finContrato = document.getElementById("fin_contrato");
  if (finContrato) {
    finContrato.addEventListener("change", cargarDatosContrato);
  }
  listarFiniquitos();
});

function mostrarMensaje(texto, tipo) {
  const el = document.getElementById("mensaje");
  el.classList.remove("hidden", "bg-emerald-900/50", "text-emerald-300", "bg-red-900/50", "text-red-300");
  el.textContent = texto;
  el.classList.add(tipo === "ok" ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-300");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

function listarFiniquitos() {
  const el = document.getElementById("lista_finiquitos");
  const contrato_id = document.getElementById("filtro_contrato").value;
  let url = "/app/finiquitos/api/listar";
  if (contrato_id) url += `?contrato_id=${contrato_id}`;

  el.innerHTML = '<div class="text-center py-8 text-slate-500"><i class="fas fa-spinner fa-spin text-2xl"></i><p class="mt-2 text-sm">Cargando...</p></div>';

  fetch(url)
    .then(r => r.json())
    .then(data => {
      const fins = data.finiquitos || [];
      if (fins.length === 0) {
        el.innerHTML = '<div class="text-center py-12 text-slate-500"><i class="fas fa-file-signature text-4xl mb-3 opacity-30"></i><p class="text-sm">Sin finiquitos</p></div>';
        return;
      }
      el.innerHTML = fins.map(f => `
        <div class="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-white text-sm truncate">${f.trabajador}</span>
              <span class="text-xs bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded-full">${f.causal_display}</span>
            </div>
            <div class="text-xs text-slate-400 mt-1">
              Empresa: ${f.empresa} · Término: ${f.fecha_termino}
            </div>
            <div class="text-xs text-slate-500 mt-0.5">
              Indem. aviso: $${f.indemn_aviso_previo.toLocaleString("es-CL")} ·
              Indem. años servicio: $${f.indemn_anios_servicio.toLocaleString("es-CL")} ·
              Feriado: $${f.feriado_proporcional.toLocaleString("es-CL")}
            </div>
            <div class="text-xs text-slate-500 mt-0.5">
              Total haberes: $${f.total_haberes.toLocaleString("es-CL")} ·
              <span class="text-green-400 font-medium">Líquido: $${f.liquido.toLocaleString("es-CL")}</span>
            </div>
          </div>
          <div class="flex gap-2 shrink-0">
            <button onclick="descargarPDFfiniquito(${f.id})" class="btn-secondary text-xs px-3 py-1.5" title="Descargar PDF"><i class="fas fa-file-pdf text-red-400"></i></button>
            <button onclick="eliminarFiniquito(${f.id})" class="btn-danger text-xs px-3 py-1.5"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join("");
    })
    .catch(() => {
      el.innerHTML = '<div class="text-center py-8 text-red-400"><p class="text-sm">Error al cargar</p></div>';
    });
}

function mostrarFormulario() {
  document.getElementById("form_finiquito").classList.remove("hidden");
  document.getElementById("fin_fecha_termino").value = new Date().toISOString().slice(0, 10);
  window.scrollTo({ top: document.getElementById("form_finiquito").offsetTop - 80, behavior: "smooth" });
}

function cancelarFormulario() {
  document.getElementById("form_finiquito").classList.add("hidden");
  document.getElementById("finForm").reset();
  document.getElementById("fin_preview").classList.add("hidden");
}

function cargarDatosContrato() {
  const sel = document.getElementById("fin_contrato");
  const opt = sel.options[sel.selectedIndex];
  if (opt && opt.dataset.sb) {
    document.getElementById("fin_sb").value = opt.dataset.sb;
    calcularPreview();
  }
}

function calcularPreview() {
  const sb = parseFloat(document.getElementById("fin_sb").value) || 0;
  const causal = document.getElementById("fin_causal").value;
  const aviso = document.getElementById("fin_aviso").value === "0";
  const dias = parseFloat(document.getElementById("fin_dias").value) || 0;
  const he = parseFloat(document.getElementById("fin_he").value) || 0;
  const bonos = parseFloat(document.getElementById("fin_bonos").value) || 0;

  const sel = document.getElementById("fin_contrato");
  const opt = sel.options[sel.selectedIndex];
  const fechaInicio = opt ? opt.dataset.inicio : null;
  const fechaTermino = document.getElementById("fin_fecha_termino").value;

  const sueldoDiario = sb / 30;

  // Indemnización aviso previo
  let indemnAviso = 0;
  if (!aviso && (causal === "necesidades_empresa" || causal === "despido_indirecto")) {
    indemnAviso = sb;
  }

  // Años de servicio
  let anios = 0, indemnAnios = 0;
  if (fechaInicio && fechaTermino) {
    const inicio = new Date(fechaInicio);
    const termino = new Date(fechaTermino);
    const diffDays = Math.max(0, (termino - inicio) / (1000 * 60 * 60 * 24));
    anios = diffDays / 365;
    if (!(causal === "vencimiento_plazo" || causal === "conclusion_faena") || diffDays >= 365) {
      const aniosIndemn = Math.min(Math.floor(anios), 11);
      indemnAnios = sb * aniosIndemn;
    }
  }

  const sueldosPend = sueldoDiario * dias;
  const feriado = Math.round((diffDays || 0) / 360 * 15 * sueldoDiario);
  const totalHaberes = indemnAviso + indemnAnios + sueldosPend + feriado + he + bonos;
  const descuentos = Math.round(sueldosPend * 0.17);
  const liquido = totalHaberes - descuentos;

  const preview = document.getElementById("fin_preview");
  const data = document.getElementById("fin_preview_data");
  preview.classList.remove("hidden");
  data.innerHTML = `
    <div class="grid grid-cols-2 gap-x-6 gap-y-1">
      <span>Sueldo Base: <span class="text-white">$${sb.toLocaleString("es-CL")}</span></span>
      <span>${(anios).toFixed(1)} años de servicio</span>
      ${indemnAviso > 0 ? `<span class="text-amber-400">Indemn. Aviso Previo: <span>$${indemnAviso.toLocaleString("es-CL")}</span></span>` : '<span class="text-slate-500">Sin aviso previo</span>'}
      ${indemnAnios > 0 ? `<span class="text-amber-400">Indemn. Años Servicio: <span>$${indemnAnios.toLocaleString("es-CL")}</span></span>` : '<span class="text-slate-500">Sin indem. años servicio</span>'}
      <span>Sueldos Pendientes: <span class="text-white">$${sueldosPend.toLocaleString("es-CL")}</span></span>
      <span>Feriado Proporcional: <span class="text-white">$${Math.round(feriado).toLocaleString("es-CL")}</span></span>
      ${he > 0 ? `<span>Horas Extra Pend.: <span class="text-white">$${he.toLocaleString("es-CL")}</span></span>` : ''}
      ${bonos > 0 ? `<span>Otros Bonos: <span class="text-white">$${bonos.toLocaleString("es-CL")}</span></span>` : ''}
      <span class="text-slate-300 font-semibold border-t border-slate-600 pt-1 mt-1">Total Haberes: <span class="text-white">$${Math.round(totalHaberes).toLocaleString("es-CL")}</span></span>
      <span class="text-slate-300 border-t border-slate-600 pt-1 mt-1">Descuentos (17% s/sueldos pend.): <span class="text-red-400">-$${descuentos.toLocaleString("es-CL")}</span></span>
      <span class="text-green-400 font-semibold text-sm">Líquido a Pagar: <span class="text-lg">$${Math.round(liquido).toLocaleString("es-CL")}</span></span>
    </div>
  `;
}

// Auto-preview on field changes
["fin_sb", "fin_causal", "fin_aviso", "fin_dias", "fin_he", "fin_bonos", "fin_fecha_termino"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("change", calcularPreview);
});
document.getElementById("fin_dias")?.addEventListener("input", calcularPreview);
document.getElementById("fin_he")?.addEventListener("input", calcularPreview);
document.getElementById("fin_bonos")?.addEventListener("input", calcularPreview);
document.getElementById("fin_sb")?.addEventListener("input", calcularPreview);

function generarFiniquito(e) {
  e.preventDefault();
  const sel = document.getElementById("fin_contrato");
  const opt = sel.options[sel.selectedIndex];
  const data = {
    contrato_id: parseInt(sel.value),
    fecha_termino: document.getElementById("fin_fecha_termino").value,
    causal: document.getElementById("fin_causal").value,
    sueldo_base: parseFloat(document.getElementById("fin_sb").value),
    aviso_previo: document.getElementById("fin_aviso").value === "1",
    dias_trabajados: parseFloat(document.getElementById("fin_dias").value) || 0,
    horas_extra_pendientes: parseFloat(document.getElementById("fin_he").value) || 0,
    otros_bonos: parseFloat(document.getElementById("fin_bonos").value) || 0,
    observaciones: document.getElementById("fin_obs").value || "",
  };

  fetch("/app/finiquitos/api/generar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify(data),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        mostrarMensaje("Finiquito generado correctamente", "ok");
        cancelarFormulario();
        listarFiniquitos();
      } else {
        mostrarMensaje(res.error || "Error al generar", "error");
      }
    })
    .catch(() => mostrarMensaje("Error de conexión", "error"));
}

function eliminarFiniquito(id) {
  if (!confirm("¿Eliminar este finiquito?")) return;
  fetch("/app/finiquitos/api/eliminar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify({ id }),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) { mostrarMensaje("Finiquito eliminado", "ok"); listarFiniquitos(); }
      else { mostrarMensaje(res.error || "Error", "error"); }
    });
}

function descargarPDFfiniquito(id) {
  fetch("/app/finiquitos/api/listar")
    .then(r => r.json())
    .then(data => {
      const f = data.finiquitos.find(x => x.id === id);
      if (f && typeof generarPDFfiniquito === "function") generarPDFfiniquito(f);
    });
}

function getCSRF() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}
