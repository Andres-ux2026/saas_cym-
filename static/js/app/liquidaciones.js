document.addEventListener("DOMContentLoaded", function () {
  const liqContrato = document.getElementById("liq_contrato");
  if (liqContrato) {
    liqContrato.addEventListener("change", cargarDatosContrato);
  }
  listarLiquidaciones();
});

function mostrarMensaje(texto, tipo) {
  const el = document.getElementById("mensaje");
  el.classList.remove("hidden", "bg-emerald-900/50", "text-emerald-300", "bg-red-900/50", "text-red-300");
  el.textContent = texto;
  el.classList.add(tipo === "ok" ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-300");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

function listarLiquidaciones() {
  const el = document.getElementById("lista_liquidaciones");
  const contrato_id = document.getElementById("filtro_contrato").value;
  let url = "/app/liquidaciones/api/listar";
  if (contrato_id) url += `?contrato_id=${contrato_id}`;

  el.innerHTML = '<div class="text-center py-8 text-slate-500"><i class="fas fa-spinner fa-spin text-2xl"></i><p class="mt-2 text-sm">Cargando...</p></div>';

  fetch(url)
    .then(r => r.json())
    .then(data => {
      const liqs = data.liquidaciones || [];
      if (liqs.length === 0) {
        el.innerHTML = '<div class="text-center py-12 text-slate-500"><i class="fas fa-file-invoice-dollar text-4xl mb-3 opacity-30"></i><p class="text-sm">Sin liquidaciones</p></div>';
        return;
      }
      el.innerHTML = liqs.map(l => `
        <div class="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-white text-sm truncate">${l.trabajador}</span>
              <span class="text-xs bg-green-900/40 text-green-300 px-2 py-0.5 rounded-full">${l.periodo}</span>
            </div>
            <div class="text-xs text-slate-400 mt-1">
              Empresa: ${l.empresa} · Imponible: $${l.total_imponible.toLocaleString("es-CL")}
            </div>
            <div class="text-xs text-slate-500 mt-0.5">
              Desc: $${l.total_descuentos.toLocaleString("es-CL")} ·
              <span class="text-green-400 font-medium">Líquido: $${l.liquido.toLocaleString("es-CL")}</span> ·
              Costo emp: $${l.costo_empleador.toLocaleString("es-CL")}
            </div>
          </div>
          <div class="flex gap-2 shrink-0">
            <button onclick="descargarPDFliquidacion(${l.id})" class="btn-secondary text-xs px-3 py-1.5" title="Descargar PDF"><i class="fas fa-file-pdf text-red-400"></i></button>
            <button onclick="eliminarLiquidacion(${l.id})" class="btn-danger text-xs px-3 py-1.5"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join("");
    })
    .catch(() => {
      el.innerHTML = '<div class="text-center py-8 text-red-400"><p class="text-sm">Error al cargar</p></div>';
    });
}

function mostrarFormulario() {
  document.getElementById("form_liquidacion").classList.remove("hidden");
  document.getElementById("liq_periodo").value = new Date().toISOString().slice(0, 7);
  window.scrollTo({ top: document.getElementById("form_liquidacion").offsetTop - 80, behavior: "smooth" });
}

function cancelarFormulario() {
  document.getElementById("form_liquidacion").classList.add("hidden");
  document.getElementById("liqForm").reset();
  document.getElementById("liq_preview").classList.add("hidden");
}

function cargarDatosContrato() {
  const sel = document.getElementById("liq_contrato");
  const opt = sel.options[sel.selectedIndex];
  if (opt && opt.dataset.sb) {
    document.getElementById("liq_sb").value = opt.dataset.sb;
    document.getElementById("liq_col").value = opt.dataset.col || "0";
    document.getElementById("liq_mov").value = opt.dataset.mov || "0";
    calcularHE();
  }
}

function calcularHE() {
  const cant = parseFloat(document.getElementById("liq_he_cant").value) || 0;
  const valor = parseFloat(document.getElementById("liq_he_valor").value) || 0;
  const sb = parseFloat(document.getElementById("liq_sb").value) || 0;
  const col = parseFloat(document.getElementById("liq_col").value) || 0;
  const mov = parseFloat(document.getElementById("liq_mov").value) || 0;

  const he_total = cant * valor;
  const imponible = sb + he_total;
  const no_imponible = col + mov;
  const dcto_afp = Math.round(imponible * 0.10);
  const dcto_salud = Math.round(imponible * 0.07);
  const dcto_seg = 0;
  const dcto_iu = 0;
  const total_descuentos = dcto_afp + dcto_salud + dcto_seg + dcto_iu;
  const liquido = imponible - total_descuentos + no_imponible;
  const costo_emp = Math.round(imponible * 0.0064);

  const preview = document.getElementById("liq_preview");
  const data = document.getElementById("liq_preview_data");
  preview.classList.remove("hidden");
  data.innerHTML = `
    <div class="grid grid-cols-2 gap-x-6 gap-y-1">
      <span>Sueldo Base: <span class="text-white">$${sb.toLocaleString("es-CL")}</span></span>
      <span>Horas Extra: <span class="text-white">$${he_total.toLocaleString("es-CL")} (${cant}h)</span></span>
      <span>Colación: <span class="text-white">$${col.toLocaleString("es-CL")}</span></span>
      <span>Movilización: <span class="text-white">$${mov.toLocaleString("es-CL")}</span></span>
      <span>Total Imponible: <span class="text-white font-medium">$${imponible.toLocaleString("es-CL")}</span></span>
      <span></span>
      <span class="text-red-400">Desc. AFP (10%): -$${dcto_afp.toLocaleString("es-CL")}</span>
      <span class="text-red-400">Desc. Salud (7%): -$${dcto_salud.toLocaleString("es-CL")}</span>
      <span class="text-green-400 font-semibold">Líquido a Pagar: <span class="text-lg">$${liquido.toLocaleString("es-CL")}</span></span>
      <span class="text-blue-400">Costo Empleador: <span>$${costo_emp.toLocaleString("es-CL")}</span></span>
    </div>
  `;
}

function generarLiquidacion(e) {
  e.preventDefault();
  const data = {
    contrato_id: parseInt(document.getElementById("liq_contrato").value),
    periodo: document.getElementById("liq_periodo").value + "-01",
    sueldo_base: parseFloat(document.getElementById("liq_sb").value),
    colacion: parseFloat(document.getElementById("liq_col").value) || 0,
    movilizacion: parseFloat(document.getElementById("liq_mov").value) || 0,
    horas_extra_cantidad: parseFloat(document.getElementById("liq_he_cant").value) || 0,
    horas_extra_valor_hora: parseFloat(document.getElementById("liq_he_valor").value) || 0,
  };

  fetch("/app/liquidaciones/api/generar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify(data),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        mostrarMensaje("Liquidación generada correctamente", "ok");
        cancelarFormulario();
        listarLiquidaciones();
      } else {
        mostrarMensaje(res.error || "Error al generar", "error");
      }
    })
    .catch(() => mostrarMensaje("Error de conexión", "error"));
}

function eliminarLiquidacion(id) {
  if (!confirm("¿Eliminar esta liquidación?")) return;
  fetch("/app/liquidaciones/api/eliminar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify({ id }),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) { mostrarMensaje("Liquidación eliminada", "ok"); listarLiquidaciones(); }
      else { mostrarMensaje(res.error || "Error", "error"); }
    });
}

function descargarPDFliquidacion(id) {
  fetch("/app/liquidaciones/api/listar")
    .then(r => r.json())
    .then(data => {
      const l = data.liquidaciones.find(x => x.id === id);
      if (l && typeof generarPDFliquidacion === "function") generarPDFliquidacion(l);
    });
}

function getCSRF() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}
