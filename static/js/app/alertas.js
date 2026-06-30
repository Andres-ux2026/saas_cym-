document.addEventListener("DOMContentLoaded", function () {
  listarAlertas();
  actualizarBadge();
});

function mostrarMensaje(texto, tipo) {
  const el = document.getElementById("mensaje");
  el.classList.remove("hidden", "bg-emerald-900/50", "text-emerald-300", "bg-red-900/50", "text-red-300");
  el.textContent = texto;
  el.classList.add(tipo === "ok" ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-300");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

function actualizarBadge() {
  fetch("/app/alertas/api/no-leidas")
    .then(r => r.json())
    .then(data => {
      const el = document.getElementById("badge_no_leidas");
      if (data.no_leidas > 0) {
        el.classList.remove("hidden");
        el.innerHTML = `<div class="bg-rose-900/30 border border-rose-700/50 rounded-lg p-3 flex items-center gap-2 text-sm">
          <i class="fas fa-bell text-rose-400"></i>
          <span class="text-rose-300 font-medium">${data.no_leidas} alerta(s) sin leer</span>
        </div>`;
      } else {
        el.classList.add("hidden");
      }
    })
    .catch(() => {});
}

function listarAlertas() {
  const el = document.getElementById("lista_alertas");
  el.innerHTML = '<div class="text-center py-8 text-slate-500"><i class="fas fa-spinner fa-spin text-2xl"></i><p class="mt-2 text-sm">Cargando alertas...</p></div>';

  fetch("/app/alertas/api/listar")
    .then(r => r.json())
    .then(data => {
      if (!data.alertas || data.alertas.length === 0) {
        el.innerHTML = '<div class="text-center py-12 text-slate-500"><i class="fas fa-check-circle text-4xl mb-3 text-emerald-500/50"></i><p class="text-sm">No hay alertas</p></div>';
        return;
      }
      el.innerHTML = data.alertas.map(a => {
        const iconos = {
          "contrato_vencer": "fa-file-contract text-amber-400",
          "contrato_vencido": "fa-file-contract text-red-400",
          "pacto_vencer": "fa-clock text-amber-400",
          "pacto_vencido": "fa-clock text-red-400",
          "parametro_desactualizado": "fa-chart-line text-amber-400",
          "parametro_cambio": "fa-exchange-alt text-blue-400",
        };
        const ico = iconos[a.tipo] || "fa-bell text-slate-400";
        return `<div class="glass-card p-4 ${a.leido ? 'opacity-60' : 'border-l-4 border-l-rose-500'}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0">
              <i class="fas ${ico.split(" ")[0]} ${ico.split(" ")[1]} mt-1"></i>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-medium text-white truncate">${a.titulo}</span>
                  <span class="text-[10px] bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded">${a.tipo_display}</span>
                </div>
                <p class="text-xs text-slate-400 mt-1">${a.empresa}</p>
                <p class="text-xs text-slate-500 mt-1">${a.mensaje}</p>
                <p class="text-[10px] text-slate-600 mt-1">${new Date(a.created_at).toLocaleString("es-CL")}</p>
              </div>
            </div>
            ${!a.leido ? `<button onclick="marcarLeida(${a.id})" class="btn-secondary text-xs px-2 py-1 shrink-0"><i class="fas fa-check"></i></button>` : ''}
          </div>
        </div>`;
      }).join("");
      actualizarBadge();
    })
    .catch(() => {
      el.innerHTML = '<div class="text-center py-8 text-red-400"><p class="text-sm">Error al cargar alertas</p></div>';
    });
}

function marcarLeida(id) {
  fetch("/app/alertas/api/marcar-leido", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify({ id }),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) listarAlertas();
    });
}

function marcarTodasLeidas() {
  fetch("/app/alertas/api/marcar-leido", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify({ todas: true }),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) { mostrarMensaje("Todas marcadas como leídas", "ok"); listarAlertas(); }
    });
}

function procesarAlertas() {
  mostrarMensaje("Verificando...", "ok");
  fetch("/app/alertas/api/procesar", { method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: "{}",
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        mostrarMensaje(`Verificación completada: ${res.creadas} alerta(s) creada(s)`, "ok");
        listarAlertas();
      }
    })
    .catch(() => {
      fetch("/app/alertas/api/listar").then(() => listarAlertas());
      mostrarMensaje("Verificando...", "ok");
    });
}

function cargarConfig() {
  const rut = document.getElementById("cfg_empresa").value;
  const form = document.getElementById("cfg_form");
  if (!rut) { form.classList.add("hidden"); return; }
  form.classList.remove("hidden");
  fetch(`/app/alertas/api/config?rut_empresa=${encodeURIComponent(rut)}`)
    .then(r => r.json())
    .then(data => {
      if (data.config) {
        document.getElementById("cfg_email").value = data.config.email || "";
        document.getElementById("cfg_whatsapp").value = data.config.whatsapp_numero || "";
        document.getElementById("cfg_dias").value = data.config.dias_anticipacion || 7;
        document.getElementById("cfg_alertar_contratos").checked = data.config.alertar_contratos;
        document.getElementById("cfg_alertar_pactos").checked = data.config.alertar_pactos;
        document.getElementById("cfg_alertar_parametros").checked = data.config.alertar_parametros;
        document.getElementById("cfg_whatsapp_activo").checked = data.config.whatsapp_activo;
      }
    });
}

function guardarConfig() {
  const data = {
    rut_empresa: document.getElementById("cfg_empresa").value,
    email: document.getElementById("cfg_email").value,
    whatsapp_numero: document.getElementById("cfg_whatsapp").value,
    whatsapp_activo: document.getElementById("cfg_whatsapp_activo").checked,
    alertar_contratos: document.getElementById("cfg_alertar_contratos").checked,
    alertar_pactos: document.getElementById("cfg_alertar_pactos").checked,
    alertar_parametros: document.getElementById("cfg_alertar_parametros").checked,
    dias_anticipacion: parseInt(document.getElementById("cfg_dias").value),
  };
  fetch("/app/alertas/api/config/guardar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify(data),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) mostrarMensaje("Configuración guardada", "ok");
      else mostrarMensaje(res.error || "Error", "error");
    })
    .catch(() => mostrarMensaje("Error de conexión", "error"));
}

function getCSRF() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

setInterval(() => { actualizarBadge(); }, 30000);
