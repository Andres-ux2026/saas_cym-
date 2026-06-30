document.addEventListener("DOMContentLoaded", function () {
  cargarAlertas();
  listarPactos();
});

function mostrarMensaje(texto, tipo) {
  const el = document.getElementById("mensaje");
  el.classList.remove("hidden", "bg-emerald-900/50", "text-emerald-300", "bg-red-900/50", "text-red-300", "bg-amber-900/50", "text-amber-300");
  el.textContent = texto;
  if (tipo === "ok") el.classList.add("bg-emerald-900/50", "text-emerald-300");
  else if (tipo === "warn") el.classList.add("bg-amber-900/50", "text-amber-300");
  else el.classList.add("bg-red-900/50", "text-red-300");
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 5000);
}

function cargarAlertas() {
  fetch("/app/horas-extra/api/alertas")
    .then(r => r.json())
    .then(data => {
      const panel = document.getElementById("alerta_panel");
      let html = "";
      if (data.vencidos && data.vencidos.length > 0) {
        html += `<div class="bg-red-900/30 border border-red-700/50 rounded-lg p-4 flex items-start gap-3">
          <i class="fas fa-exclamation-triangle text-red-400 mt-0.5"></i>
          <div><p class="text-sm font-semibold text-red-300">${data.vencidos.length} pacto(s) vencido(s)</p>
          <ul class="text-xs text-red-400 mt-1 space-y-0.5">`;
        data.vencidos.forEach(p => {
          html += `<li>${p.trabajador} — ${p.empresa} (venció ${p.fecha_fin})</li>`;
        });
        html += `</ul></div></div>`;
      }
      if (data.proximos && data.proximos.length > 0) {
        html += `<div class="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4 flex items-start gap-3 mt-3">
          <i class="fas fa-clock text-amber-400 mt-0.5"></i>
          <div><p class="text-sm font-semibold text-amber-300">${data.proximos.length} pacto(s) por vencer (próximos 7 días)</p>
          <ul class="text-xs text-amber-400 mt-1 space-y-0.5">`;
        data.proximos.forEach(p => {
          html += `<li>${p.trabajador} — ${p.empresa} (${p.dias} día${p.dias !== 1 ? 's' : ''})</li>`;
        });
        html += `</ul></div></div>`;
      }
      if (html) {
        panel.innerHTML = html;
        panel.classList.remove("hidden");
      } else {
        panel.classList.add("hidden");
      }
    })
    .catch(() => {});
}

function listarPactos() {
  const el = document.getElementById("lista_pactos");
  const contrato_id = document.getElementById("filtro_contrato").value;
  const estado = document.getElementById("filtro_estado").value;
  let url = "/app/horas-extra/api/pactos";
  if (contrato_id) url += `?contrato_id=${contrato_id}`;

  el.innerHTML = '<div class="text-center py-8 text-slate-500"><i class="fas fa-spinner fa-spin text-2xl"></i><p class="mt-2 text-sm">Cargando pactos...</p></div>';

  fetch(url)
    .then(r => r.json())
    .then(data => {
      let pactos = data.pactos || [];
      if (estado === "activos") pactos = pactos.filter(p => p.activo);
      else if (estado === "vencidos") pactos = pactos.filter(p => !p.activo);

      if (pactos.length === 0) {
        el.innerHTML = '<div class="text-center py-12 text-slate-500"><i class="fas fa-clock text-4xl mb-3 opacity-30"></i><p class="text-sm">No hay pactos registrados</p></div>';
        return;
      }

      el.innerHTML = pactos.map(p => {
        const badge = p.activo
          ? (p.dias_restantes <= 7 ? 'bg-amber-900/40 text-amber-300' : 'bg-emerald-900/40 text-emerald-300')
          : 'bg-slate-700/40 text-slate-400';
        const texto = p.activo ? (p.dias_restantes <= 7 ? `Por vencer (${p.dias_restantes}d)` : `Vigente (${p.dias_restantes}d)`) : "Vencido";
        return `<div class="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-white text-sm truncate">${p.trabajador}</span>
              <span class="text-xs ${badge} px-2 py-0.5 rounded-full">${texto}</span>
              ${p.numero_renovacion > 0 ? `<span class="text-xs text-slate-500">R#${p.numero_renovacion}</span>` : ''}
            </div>
            <div class="text-xs text-slate-400 mt-1">Empresa: ${p.empresa}</div>
            <div class="text-xs text-slate-500 mt-0.5">${p.fecha_inicio} → ${p.fecha_fin}</div>
          </div>
          <div class="flex gap-2 shrink-0">
            ${p.activo ? `<button onclick="renovarPacto(${p.id})" class="btn-secondary text-xs px-3 py-1.5"><i class="fas fa-sync"></i> Renovar</button>` : ''}
            <button onclick="descargarPDFpacto(${p.id})" class="btn-secondary text-xs px-3 py-1.5" title="Descargar PDF"><i class="fas fa-file-pdf text-red-400"></i></button>
            <button onclick="eliminarPacto(${p.id})" class="btn-danger text-xs px-3 py-1.5"><i class="fas fa-trash"></i></button>
          </div>
        </div>`;
      }).join("");
    })
    .catch(() => {
      el.innerHTML = '<div class="text-center py-8 text-red-400"><p class="text-sm">Error al cargar pactos</p></div>';
    });
}

function renovarPacto(id) {
  if (!confirm("¿Renovar este pacto por 90 días más?")) return;
  fetch("/app/horas-extra/api/pactos/renovar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify({ id }),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        mostrarMensaje("Pacto renovado correctamente", "ok");
        listarPactos();
        cargarAlertas();
      } else {
        mostrarMensaje(res.error || "Error al renovar", "error");
      }
    })
    .catch(() => mostrarMensaje("Error de conexión", "error"));
}

function renovarMasivo() {
  if (!confirm("¿Renovar todos los pactos activos próximos a vencer?")) return;
  fetch("/app/horas-extra/api/pactos")
    .then(r => r.json())
    .then(data => {
      const porVencer = data.pactos.filter(p => p.activo && p.dias_restantes <= 7);
      if (porVencer.length === 0) {
        mostrarMensaje("No hay pactos por renovar", "warn");
        return;
      }
      let renovados = 0;
      const renovarSiguiente = i => {
        if (i >= porVencer.length) {
          mostrarMensaje(`${renovados} pacto(s) renovado(s)`, "ok");
          listarPactos();
          cargarAlertas();
          return;
        }
        fetch("/app/horas-extra/api/pactos/renovar", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
          body: JSON.stringify({ id: porVencer[i].id }),
        })
          .then(r => r.json())
          .then(res => {
            if (res.ok) renovados++;
            renovarSiguiente(i + 1);
          })
          .catch(() => renovarSiguiente(i + 1));
      };
      renovarSiguiente(0);
    })
    .catch(() => mostrarMensaje("Error al obtener pactos", "error"));
}

function eliminarPacto(id) {
  if (!confirm("¿Eliminar este pacto?")) return;
  fetch("/app/horas-extra/api/pactos/eliminar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify({ id }),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        mostrarMensaje("Pacto eliminado", "ok");
        listarPactos();
        cargarAlertas();
      } else {
        mostrarMensaje(res.error || "Error al eliminar", "error");
      }
    })
    .catch(() => mostrarMensaje("Error de conexión", "error"));
}

function descargarPDFpacto(id) {
  const p = pactosCache?.find(x => x.id === id);
  if (p && typeof generarPDFpacto === "function") {
    generarPDFpacto(p, p);
    return;
  }
  fetch("/app/horas-extra/api/pactos")
    .then(r => r.json())
    .then(data => {
      const p2 = data.pactos.find(x => x.id === id);
      if (p2 && typeof generarPDFpacto === "function") generarPDFpacto(p2, p2);
    });
}

let pactosCache = null;
const origListarPactos = listarPactos;
listarPactos = function () {
  origListarPactos();
  fetch("/app/horas-extra/api/pactos")
    .then(r => r.json())
    .then(data => { pactosCache = data.pactos; })
    .catch(() => {});
};

function getCSRF() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

setInterval(function () {
  const hidden = document.getElementById("alerta_panel").classList.contains("hidden");
  if (!hidden) cargarAlertas();
}, 60000);
