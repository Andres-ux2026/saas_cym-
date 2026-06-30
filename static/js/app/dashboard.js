document.addEventListener("DOMContentLoaded", cargarDashboard);

function cargarDashboard() {
  fetch("/app/api/dashboard")
    .then(r => r.json())
    .then(data => {
      renderKPIs(data.kpis);
      renderContratos(data.contratos_recientes);
      renderAlertas(data.alertas_recientes);
      renderParametros(data.parametros);
    })
    .catch(() => {
      document.getElementById("kpis").innerHTML = '<div class="col-span-full text-center py-8 text-red-400 text-sm">Error al cargar dashboard</div>';
    });
}

function renderKPIs(kpis) {
  const el = document.getElementById("kpis");
  const cards = [
    { icon: "fa-file-contract", color: "text-emerald-400", label: "Contratos", value: kpis.contratos_activos },
    { icon: "fa-clock", color: "text-amber-400", label: "Pactos HE activos", value: kpis.pactos_activos },
    { icon: "fa-exclamation-triangle", color: "text-rose-400", label: "Alertas no leídas", value: kpis.alertas_no_leidas },
    { icon: "fa-building", color: "text-blue-400", label: "Empresas", value: kpis.empresas },
    { icon: "fa-hourglass-half", color: "text-amber-400", label: "Contratos por vencer", value: kpis.contratos_por_vencer },
    { icon: "fa-hourglass-end", color: "text-rose-400", label: "Pactos por vencer", value: kpis.pactos_por_vencer },
    { icon: "fa-ban", color: "text-red-400", label: "Pactos vencidos", value: kpis.pactos_vencidos },
    { icon: "fa-calendar", color: "text-slate-400", label: "Próximos 30 días", value: kpis.contratos_por_vencer + kpis.pactos_por_vencer + kpis.pactos_vencidos },
  ];
  el.innerHTML = cards.map(c => `
    <div class="glass-card p-4 text-center">
      <i class="fas ${c.icon} ${c.color} text-xl"></i>
      <p class="text-2xl font-bold text-white mt-1">${c.value}</p>
      <p class="text-[10px] text-slate-500 uppercase tracking-wider">${c.label}</p>
    </div>
  `).join("");
}

function renderContratos(contratos) {
  const el = document.getElementById("contratos_recientes");
  if (!contratos || contratos.length === 0) {
    el.innerHTML = '<div class="text-center py-8 text-slate-500 text-sm">Sin contratos</div>';
    return;
  }
  el.innerHTML = contratos.map(c => `
    <div class="glass-card p-3 flex items-center justify-between">
      <div class="min-w-0">
        <p class="text-sm font-medium text-white truncate">${c.trabajador}</p>
        <p class="text-xs text-slate-400">${c.empresa} · ${c.tipo}</p>
        <p class="text-[10px] text-slate-500">Inicio: ${c.fecha_inicio}${c.fecha_termino ? ' · Término: ' + c.fecha_termino : ''}</p>
      </div>
      <a href="/app/contratos/" class="btn-secondary text-xs px-2 py-1 shrink-0"><i class="fas fa-arrow-right"></i></a>
    </div>
  `).join("");
}

function renderAlertas(alertas) {
  const el = document.getElementById("alertas_recientes");
  if (!alertas || alertas.length === 0) {
    el.innerHTML = '<div class="text-center py-8 text-slate-500 text-sm"><i class="fas fa-check-circle text-emerald-500/50 mr-1"></i>Sin alertas pendientes</div>';
    return;
  }
  el.innerHTML = alertas.map(a => {
    const colores = {
      "contrato_vencer": "text-amber-400", "contrato_vencido": "text-red-400",
      "pacto_vencer": "text-amber-400", "pacto_vencido": "text-red-400",
      "parametro_cambio": "text-blue-400",
    };
    return `<div class="glass-card p-3 flex items-center justify-between ${a.leido ? 'opacity-60' : ''}">
      <div class="min-w-0">
        <p class="text-xs font-medium text-white truncate">${a.titulo}</p>
        <p class="text-[10px] text-slate-500">${new Date(a.created_at).toLocaleDateString("es-CL")}</p>
      </div>
      <span class="text-[10px] ${colores[a.tipo] || 'text-slate-400'}">${a.tipo_display}</span>
    </div>`;
  }).join("");
}

function renderParametros(parametros) {
  const el = document.getElementById("parametros_info");
  if (!parametros) return;
  const html = [];
  if (parametros.ultima_actualizacion) {
    html.push(`<span class="text-slate-400">Última actualización:</span> <span class="text-white">${new Date(parametros.ultima_actualizacion).toLocaleString("es-CL")}</span>`);
  }
  if (parametros.cambios_pendientes > 0) {
    html.push(` · <span class="text-amber-400 font-medium">${parametros.cambios_pendientes} cambio(s) pendiente(s) de revisar</span>`);
  } else {
    html.push(` · <span class="text-emerald-400">Sin cambios pendientes</span>`);
  }
  el.innerHTML = html.join("");
}

setInterval(cargarDashboard, 60000);
