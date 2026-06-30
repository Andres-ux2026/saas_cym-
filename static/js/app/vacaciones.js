document.addEventListener("DOMContentLoaded", listarVacaciones);

function mostrarMensaje(texto, tipo) {
  const el = document.getElementById("mensaje");
  el.classList.remove("hidden", "bg-emerald-900/50", "text-emerald-300", "bg-red-900/50", "text-red-300");
  el.textContent = texto;
  el.classList.add(tipo === "ok" ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-300");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

function listarVacaciones() {
  const el = document.getElementById("lista_vacaciones");
  const contrato_id = document.getElementById("filtro_contrato").value;
  let url = "/app/vacaciones/api/listar";
  if (contrato_id) url += `?contrato_id=${contrato_id}`;

  el.innerHTML = '<div class="text-center py-8 text-slate-500"><i class="fas fa-spinner fa-spin text-2xl"></i><p class="mt-2 text-sm">Cargando...</p></div>';

  fetch(url)
    .then(r => r.json())
    .then(data => {
      const vacs = data.vacaciones || [];
      if (vacs.length === 0) {
        el.innerHTML = '<div class="text-center py-12 text-slate-500"><i class="fas fa-umbrella-beach text-4xl mb-3 opacity-30"></i><p class="text-sm">Sin registros de vacaciones — inicie un año vacacional</p></div>';
        return;
      }
      el.innerHTML = vacs.map(v => {
        const pend = v.dias_pendientes;
        const barPct = Math.min(100, Math.round((v.dias_disfrutados / (v.dias_correspondientes + v.dias_pendientes_anterior)) * 100));
        const solicitudes = (v.solicitudes || []).map(s => `
          <div class="flex items-center justify-between text-xs py-1 ${s.estado === 'pendiente' ? 'bg-amber-900/20' : s.estado === 'aprobada' ? 'bg-emerald-900/20' : 'bg-red-900/20'} rounded px-2">
            <span>${s.fecha_inicio} → ${s.fecha_termino} (${s.dias_solicitados} días)</span>
            <span class="flex items-center gap-2">
              <span class="${s.estado === 'pendiente' ? 'text-amber-300' : s.estado === 'aprobada' ? 'text-emerald-300' : 'text-red-300'}">${s.estado}</span>
              ${s.estado === 'pendiente' ? `
                <button onclick="aprobarSolicitud(${s.id},'aprobada')" class="text-emerald-400 hover:text-emerald-300"><i class="fas fa-check"></i></button>
                <button onclick="aprobarSolicitud(${s.id},'rechazada')" class="text-red-400 hover:text-red-300"><i class="fas fa-times"></i></button>
              ` : ''}
              <button onclick="eliminarSolicitud(${s.id})" class="text-slate-500 hover:text-red-400"><i class="fas fa-trash-alt text-[10px]"></i></button>
            </span>
          </div>
        `).join("");

        return `
          <div class="glass-card p-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-white text-sm">${v.trabajador}</span>
                  <span class="text-xs bg-sky-900/40 text-sky-300 px-2 py-0.5 rounded-full">${v.anio}</span>
                </div>
                <div class="text-xs text-slate-400 mt-1">${v.empresa}</div>
              </div>
              <div class="flex gap-2 shrink-0">
                <button onclick="mostrarFormSolicitud(${v.id})" class="btn-primary text-xs px-3 py-1.5"><i class="fas fa-paper-plane"></i> Solicitar</button>
              </div>
            </div>
            <div class="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
              <div class="bg-dark-800/50 rounded p-2">
                <div class="text-slate-500">Corresponden</div>
                <div class="text-white font-medium">${v.dias_correspondientes}</div>
              </div>
              <div class="bg-dark-800/50 rounded p-2">
                <div class="text-slate-500">Pend. Anterior</div>
                <div class="text-white font-medium">${v.dias_pendientes_anterior}</div>
              </div>
              <div class="bg-dark-800/50 rounded p-2">
                <div class="text-slate-500">Disfrutados</div>
                <div class="text-sky-300 font-medium">${v.dias_disfrutados}</div>
              </div>
              <div class="bg-dark-800/50 rounded p-2">
                <div class="text-slate-500">Disponibles</div>
                <div class="text-emerald-400 font-medium text-sm">${(pend).toFixed(1)}</div>
              </div>
            </div>
            <div class="mt-2 bg-dark-800/50 rounded-full h-2 overflow-hidden">
              <div class="bg-sky-500 h-full rounded-full transition-all" style="width: ${barPct}%"></div>
            </div>
            ${solicitudes ? `<div class="mt-3 space-y-1">${solicitudes}</div>` : '<div class="text-xs text-slate-600 mt-2">Sin solicitudes</div>'}
          </div>
        `;
      }).join("");
    })
    .catch(() => {
      el.innerHTML = '<div class="text-center py-8 text-red-400"><p class="text-sm">Error al cargar</p></div>';
    });
}

function mostrarFormInicio() {
  document.getElementById("form_inicio").classList.remove("hidden");
  window.scrollTo({ top: document.getElementById("form_inicio").offsetTop - 80, behavior: "smooth" });
}

function cancelarFormInicio() {
  document.getElementById("form_inicio").classList.add("hidden");
  document.getElementById("inicioForm").reset();
}

function iniciarAnio(e) {
  e.preventDefault();
  const data = {
    contrato_id: parseInt(document.getElementById("vac_contrato").value),
    anio: parseInt(document.getElementById("vac_anio").value),
    dias_correspondientes: parseFloat(document.getElementById("vac_dias_corr").value) || 15,
    dias_pendientes_anterior: parseFloat(document.getElementById("vac_dias_ant").value) || 0,
  };
  fetch("/app/vacaciones/api/iniciar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify(data),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        mostrarMensaje("Año vacacional iniciado", "ok");
        cancelarFormInicio();
        listarVacaciones();
      } else {
        mostrarMensaje(res.error || "Error", "error");
      }
    })
    .catch(() => mostrarMensaje("Error de conexión", "error"));
}

function mostrarFormSolicitud(vacacionId) {
  document.getElementById("sol_vacacion_id").value = vacacionId;
  document.getElementById("form_solicitud").classList.remove("hidden");
  window.scrollTo({ top: document.getElementById("form_solicitud").offsetTop - 80, behavior: "smooth" });
}

function cancelarSolicitud() {
  document.getElementById("form_solicitud").classList.add("hidden");
  document.getElementById("solForm").reset();
}

function calcDiasVac() {
  const inicio = document.getElementById("sol_fecha_inicio").value;
  const termino = document.getElementById("sol_fecha_termino").value;
  if (inicio && termino) {
    const diff = (new Date(termino) - new Date(inicio)) / (1000 * 60 * 60 * 24) + 1;
    if (diff > 0) document.getElementById("sol_dias").value = Math.round(diff * 10) / 10;
  }
}

function solicitarVacaciones(e) {
  e.preventDefault();
  const data = {
    vacacion_id: parseInt(document.getElementById("sol_vacacion_id").value),
    fecha_inicio: document.getElementById("sol_fecha_inicio").value,
    fecha_termino: document.getElementById("sol_fecha_termino").value,
    dias_solicitados: parseFloat(document.getElementById("sol_dias").value),
    comentario: document.getElementById("sol_comentario").value || "",
  };
  fetch("/app/vacaciones/api/solicitar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify(data),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        mostrarMensaje("Solicitud creada", "ok");
        cancelarSolicitud();
        listarVacaciones();
      } else {
        mostrarMensaje(res.error || "Error", "error");
      }
    })
    .catch(() => mostrarMensaje("Error de conexión", "error"));
}

function aprobarSolicitud(id, estado) {
  fetch("/app/vacaciones/api/aprobar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify({ id, estado }),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        mostrarMensaje(`Solicitud ${estado}`, "ok");
        listarVacaciones();
      } else {
        mostrarMensaje(res.error || "Error", "error");
      }
    });
}

function eliminarSolicitud(id) {
  if (!confirm("¿Eliminar esta solicitud?")) return;
  fetch("/app/vacaciones/api/eliminar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify({ id }),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) { mostrarMensaje("Solicitud eliminada", "ok"); listarVacaciones(); }
      else { mostrarMensaje(res.error || "Error", "error"); }
    });
}

function getCSRF() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}
