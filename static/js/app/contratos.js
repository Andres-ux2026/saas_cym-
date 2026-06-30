let streamCamara = null;
let contratoEditandoId = null;
let contratosDataCache = null;

document.addEventListener("DOMContentLoaded", function () {
  listarContratos();
});

let _timeoutMsg = null;
function mostrarMensaje(texto, tipo) {
  const el = document.getElementById("mensaje");
  if (_timeoutMsg) clearTimeout(_timeoutMsg);
  el.classList.remove("hidden", "bg-emerald-900/50", "text-emerald-300", "bg-red-900/50", "text-red-300");
  el.textContent = texto;
  el.classList.add(tipo === "ok" ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-300");
  _timeoutMsg = setTimeout(() => el.classList.add("hidden"), 4000);
}

function listarContratos() {
  const el = document.getElementById("lista_contratos");
  el.innerHTML = '<div class="text-center py-8 text-slate-500"><i class="fas fa-spinner fa-spin text-2xl"></i><p class="mt-2 text-sm">Cargando contratos...</p></div>';
  fetch("/app/contratos/api/listar")
    .then(r => r.json())
    .then(data => {
      if (!data.contratos || data.contratos.length === 0) {
        el.innerHTML = '<div class="text-center py-12 text-slate-500"><i class="fas fa-file-contract text-4xl mb-3 opacity-30"></i><p class="text-sm">No hay contratos registrados</p></div>';
        return;
      }
      contratosDataCache = data.contratos;
      el.innerHTML = data.contratos.map(c => `
        <div class="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-white text-sm truncate">${c.nombres} ${c.apellidos}</span>
              <span class="text-xs bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded-full">${c.tipo_display}</span>
            </div>
            <div class="text-xs text-slate-400 mt-1">
              RUT: ${c.rut_trabajador} · Empresa: ${c.razon_social_empresa} · Sueldo: $${Number(c.sueldo_base).toLocaleString("es-CL")}
            </div>
            <div class="text-xs text-slate-500 mt-0.5">Inicio: ${c.fecha_inicio}${c.fecha_termino ? ' · Término: ' + c.fecha_termino : ''}</div>
          </div>
          <div class="flex gap-2 shrink-0">
            <button onclick="editarContrato(${c.id})" class="btn-secondary text-xs px-3 py-1.5"><i class="fas fa-edit"></i></button>
            <button onclick="descargarPDFcontrato(${c.id})" class="btn-secondary text-xs px-3 py-1.5" title="Descargar PDF"><i class="fas fa-file-pdf text-red-400"></i></button>
            <button onclick="eliminarContrato(${c.id})" class="btn-danger text-xs px-3 py-1.5"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join("");
    })
    .catch(() => {
      el.innerHTML = '<div class="text-center py-8 text-red-400"><p class="text-sm">Error al cargar contratos</p></div>';
    });
}

function mostrarFormulario(contratoId) {
  contratoEditandoId = contratoId || null;
  document.getElementById("form_contrato").classList.remove("hidden");
  document.getElementById("titulo_form").textContent = contratoId ? "Editar Contrato" : "Nuevo Contrato";
  window.scrollTo({ top: document.getElementById("form_contrato").offsetTop - 80, behavior: "smooth" });
}

function cancelarFormulario() {
  document.getElementById("contratoForm").reset();
  document.getElementById("contrato_id").value = "";
  contratoEditandoId = null;
  document.getElementById("form_contrato").classList.add("hidden");
}

function toggleTipoContrato() {
  const tipo = document.getElementById("tipo").value;
  document.getElementById("div_fecha_termino").style.display = tipo === "indefinido" ? "none" : "block";
  document.getElementById("div_nombre_faena").classList.toggle("hidden", tipo !== "faena");
}

function formatearRUT(input) {
  let v = input.value.replace(/[^0-9kK]/g, "").toUpperCase();
  if (v.length <= 1) { input.value = v; return; }
  let cuerpo = v.slice(0, -1);
  let dv = v.slice(-1);
  cuerpo = cuerpo.replace(/^0+/, "");
  if (cuerpo.length > 3) cuerpo = cuerpo.slice(0, -3) + "." + cuerpo.slice(-3);
  if (cuerpo.length > 7) cuerpo = cuerpo.slice(0, -7) + "." + cuerpo.slice(-7);
  input.value = cuerpo + "-" + dv;
}

function buscarTrabajador(rut) {
  if (rut.length < 6) return;
  fetch(`/app/contratos/api/trabajador?rut=${encodeURIComponent(rut)}`)
    .then(r => r.json())
    .then(data => {
      if (data.encontrado) {
        document.getElementById("nombres").value = data.trabajador.nombres;
        document.getElementById("apellidos").value = data.trabajador.apellidos;
        document.getElementById("fecha_nacimiento").value = data.trabajador.fecha_nacimiento;
      }
    })
    .catch(() => {});
}

document.getElementById("rut_empresa").addEventListener("change", function () {
  const rut = this.value;
  const sel = document.getElementById("rut_mandante");
  sel.innerHTML = '<option value="">Sin mandante</option>';
  if (!rut) return;
  fetch(`/app/empresas/api/mandantes?rut=${encodeURIComponent(rut)}`)
    .then(r => r.json())
    .then(data => {
      if (data.mandantes) {
        data.mandantes.forEach(m => {
          const opt = document.createElement("option");
          opt.value = m.rut_mandante;
          opt.textContent = `${m.razon_social_mandante} (${m.rut_mandante})`;
          sel.appendChild(opt);
        });
      }
    })
    .catch(() => {});
});

function cargarPlantilla(sel) {
  if (!sel.value) return;
  fetch(`/app/contratos/api/plantillas`)
    .then(r => r.json())
    .then(data => {
      const pl = data.plantillas.find(p => p.id == sel.value);
      if (pl) {
        document.getElementById("funciones").value = pl.funciones;
        document.getElementById("clausulas_adicionales").value = pl.clausulas;
      }
    })
    .catch(() => {});
}

function guardarContrato(e) {
  e.preventDefault();
  const data = {
    id: contratoEditandoId,
    rut_empresa: document.getElementById("rut_empresa").value,
    rut_mandante: document.getElementById("rut_mandante").value || null,
    plantilla_id: document.getElementById("plantilla_id").value || null,
    tipo: document.getElementById("tipo").value,
    fecha_inicio: document.getElementById("fecha_inicio").value,
    fecha_termino: document.getElementById("fecha_termino").value || null,
    nombre_faena: document.getElementById("nombre_faena").value || "",
    rut_trabajador: document.getElementById("rut_trabajador").value,
    nombres: document.getElementById("nombres").value,
    apellidos: document.getElementById("apellidos").value,
    fecha_nacimiento: document.getElementById("fecha_nacimiento").value,
    direccion: document.getElementById("direccion").value,
    telefono: document.getElementById("telefono").value,
    email: document.getElementById("email").value,
    funciones: document.getElementById("funciones").value,
    lugar_trabajo: document.getElementById("lugar_trabajo").value,
    horas_semanales: parseInt(document.getElementById("horas_semanales").value),
    sueldo_base: parseFloat(document.getElementById("sueldo_base").value),
    colacion: parseFloat(document.getElementById("colacion").value) || 0,
    movilizacion: parseFloat(document.getElementById("movilizacion").value) || 0,
    periodicidad_pago: document.getElementById("periodicidad_pago").value,
    clausulas_adicionales: document.getElementById("clausulas_adicionales").value,
  };

  fetch("/app/contratos/api/guardar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify(data),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        mostrarMensaje(res.creado ? "Contrato creado correctamente" : "Contrato actualizado correctamente", "ok");
        cancelarFormulario();
        listarContratos();
      } else {
        mostrarMensaje(res.error || "Error al guardar", "error");
      }
    })
    .catch(() => mostrarMensaje("Error de conexión", "error"));
}

function editarContrato(id) {
  const data = contratosDataCache;
  if (!data) {
    fetch("/app/contratos/api/listar")
      .then(r => r.json())
      .then(d => { contratosDataCache = d.contratos; rellenarFormulario(d.contratos.find(x => x.id === id)); });
    return;
  }
  rellenarFormulario(data.find(x => x.id === id));
}

function rellenarFormulario(c) {
  if (!c) return;
  mostrarFormulario(c.id);
  document.getElementById("contrato_id").value = c.id;
  document.getElementById("rut_empresa").value = c.rut_empresa;
  document.getElementById("rut_mandante").value = c.rut_mandante || "";
  document.getElementById("plantilla_id").value = c.plantilla_id || "";
  document.getElementById("tipo").value = c.tipo;
  document.getElementById("fecha_inicio").value = c.fecha_inicio;
  document.getElementById("fecha_termino").value = c.fecha_termino || "";
  document.getElementById("nombre_faena").value = c.nombre_faena || "";
  document.getElementById("rut_trabajador").value = c.rut_trabajador;
  document.getElementById("nombres").value = c.nombres;
  document.getElementById("apellidos").value = c.apellidos;
  document.getElementById("fecha_nacimiento").value = c.fecha_nacimiento;
  document.getElementById("direccion").value = c.direccion;
  document.getElementById("telefono").value = c.telefono;
  document.getElementById("email").value = c.email;
  document.getElementById("funciones").value = c.funciones;
  document.getElementById("lugar_trabajo").value = c.lugar_trabajo;
  document.getElementById("horas_semanales").value = c.horas_semanales;
  document.getElementById("sueldo_base").value = c.sueldo_base;
  document.getElementById("colacion").value = c.colacion;
  document.getElementById("movilizacion").value = c.movilizacion;
  document.getElementById("periodicidad_pago").value = c.periodicidad_pago;
  document.getElementById("clausulas_adicionales").value = c.clausulas_adicionales;
  toggleTipoContrato();
  setTimeout(() => document.getElementById("rut_empresa").dispatchEvent(new Event("change")), 100);
}

function eliminarContrato(id) {
  if (!confirm("¿Eliminar este contrato?")) return;
  fetch("/app/contratos/api/eliminar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify({ id }),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        mostrarMensaje("Contrato eliminado", "ok");
        listarContratos();
      } else {
        mostrarMensaje(res.error || "Error al eliminar", "error");
      }
    });
}

function abrirCamara() {
  document.getElementById("modal_camara").classList.remove("hidden");
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        streamCamara = stream;
        document.getElementById("video_camara").srcObject = stream;
      })
      .catch(() => {
        mostrarMensaje("No se pudo acceder a la cámara", "error");
        cerrarCamara();
      });
  }
}

function cerrarCamara() {
  if (streamCamara) {
    streamCamara.getTracks().forEach(t => t.stop());
    streamCamara = null;
  }
  document.getElementById("modal_camara").classList.add("hidden");
}

function capturarCedula() {
  const video = document.getElementById("video_camara");
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  const imageData = canvas.toDataURL("image/jpeg", 0.8);

  const data = {
    rut: document.getElementById("rut_trabajador").value,
    nombres: document.getElementById("nombres").value,
    apellidos: document.getElementById("apellidos").value,
    fecha_nacimiento: document.getElementById("fecha_nacimiento").value,
    imagen: imageData,
  };

  fetch("/app/contratos/api/carnet/guardar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify(data),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        mostrarMensaje("Documento de identidad guardado", "ok");
      }
      cerrarCamara();
    })
    .catch(() => {
      mostrarMensaje("Error al guardar documento", "error");
      cerrarCamara();
    });
}

function consultarAFP() {
  const rut = document.getElementById("rut_trabajador").value;
  if (!rut || rut.length < 8) {
    mostrarMensaje("Ingrese un RUT válido primero", "error");
    return;
  }
  const el = document.getElementById("afp_resultado");
  const datos = document.getElementById("afp_datos");
  el.classList.remove("hidden");
  datos.innerHTML = '<span class="text-slate-500"><i class="fas fa-spinner fa-spin"></i> Consultando Superintendencia de Pensiones...</span>';

  fetch(`/app/spensiones/api/consultar-afp?rut=${encodeURIComponent(rut)}`)
    .then(r => r.json())
    .then(res => {
      if (res.error) {
        datos.innerHTML = `<span class="text-red-400">${res.error}</span>`;
        return;
      }
      const rows = [
        ["AFP", res.afp],
        ["Estado", res.estado],
        ["Tipo", res.tipo],
        ["Fecha afiliación", res.fecha_afiliacion],
      ];
      datos.innerHTML = rows.filter(r => r[1]).map(r =>
        `<div><span class="text-slate-500">${r[0]}:</span> <span class="text-white">${r[1]}</span></div>`
      ).join("");
      if (res.cache) datos.innerHTML += '<div class="text-[10px] text-slate-600 mt-1">Datos en caché (últimas 24h)</div>';

      if (res.nombres && !document.getElementById("nombres").value) {
        document.getElementById("nombres").value = res.nombres;
      }
      if (res.apellidos && !document.getElementById("apellidos").value) {
        document.getElementById("apellidos").value = res.apellidos;
      }
    })
    .catch(() => {
      datos.innerHTML = '<span class="text-red-400">Error al consultar SP</span>';
    });
}

function descargarPDFcontrato(id) {
  const c = contratosDataCache?.find(x => x.id === id);
  if (c) {
    if (typeof generarPDFcontrato === "function") generarPDFcontrato(c);
    else mostrarMensaje("Error: librería PDF no disponible", "error");
    return;
  }
  fetch("/app/contratos/api/listar")
    .then(r => r.json())
    .then(data => {
      contratosDataCache = data.contratos;
      const c2 = data.contratos.find(x => x.id === id);
      if (c2 && typeof generarPDFcontrato === "function") generarPDFcontrato(c2);
    });
}

function descargarPDFactual() {
  const data = getContratoFormData();
  if (!data.rut_trabajador) {
    mostrarMensaje("Complete los datos del trabajador primero", "error");
    return;
  }
  data.tipo = document.querySelector("#tipo option:checked")?.textContent || data.tipo || "Indefinido";
  data.periodicidad_pago = document.querySelector("#periodicidad_pago option:checked")?.textContent || "Mensual";
  const sel = document.getElementById("rut_empresa");
  data.empresa = sel.options[sel.selectedIndex]?.textContent?.split("(")[0]?.trim() || "";
  const sel2 = document.getElementById("rut_mandante");
  data.mandante = sel2.options[sel2.selectedIndex]?.textContent?.split("(")[0]?.trim() || null;
  if (typeof generarPDFcontrato === "function") generarPDFcontrato(data);
}

function getContratoFormData() {
  return {
    rut_trabajador: document.getElementById("rut_trabajador").value,
    nombres: document.getElementById("nombres").value,
    apellidos: document.getElementById("apellidos").value,
    fecha_nacimiento: document.getElementById("fecha_nacimiento").value,
    direccion: document.getElementById("direccion").value,
    telefono: document.getElementById("telefono").value,
    email: document.getElementById("email").value,
    tipo: document.getElementById("tipo").value,
    fecha_inicio: document.getElementById("fecha_inicio").value,
    fecha_termino: document.getElementById("fecha_termino").value,
    nombre_faena: document.getElementById("nombre_faena").value,
    funciones: document.getElementById("funciones").value,
    lugar_trabajo: document.getElementById("lugar_trabajo").value,
    horas_semanales: document.getElementById("horas_semanales").value,
    sueldo_base: document.getElementById("sueldo_base").value,
    colacion: document.getElementById("colacion").value,
    movilizacion: document.getElementById("movilizacion").value,
    periodicidad_pago: document.getElementById("periodicidad_pago").value,
    clausulas_adicionales: document.getElementById("clausulas_adicionales").value,
  };
}

function toggleGestionPlantillas() {
  const el = document.getElementById("gestion_plantillas");
  el.classList.toggle("hidden");
  if (!el.classList.contains("hidden")) listarPlantillas();
}

function listarPlantillas() {
  fetch("/app/contratos/api/plantillas")
    .then(r => r.json())
    .then(data => {
      const el = document.getElementById("lista_plantillas");
      if (!data.plantillas?.length) {
        el.innerHTML = '<p class="text-slate-500">Sin plantillas creadas.</p>';
        return;
      }
      el.innerHTML = data.plantillas.map(p =>
        `<div class="flex items-center justify-between py-1.5 border-b border-dark-700/30">
          <div><span class="text-slate-200">${p.cargo}</span><span class="text-slate-500 ml-2">${p.nombre}</span></div>
          <button onclick="eliminarPlantilla(${p.id})" class="text-red-400 hover:text-red-300 text-[10px]"><i class="fas fa-times"></i></button>
        </div>`
      ).join("");
    });
}

function guardarPlantilla() {
  const data = {
    nombre: document.getElementById("pl_nombre").value,
    cargo: document.getElementById("pl_cargo").value,
    funciones: document.getElementById("pl_funciones").value,
    clausulas: document.getElementById("pl_clausulas").value,
  };
  if (!data.nombre || !data.cargo) {
    mostrarMensaje("Nombre y cargo son obligatorios", "error");
    return;
  }
  fetch("/app/contratos/api/plantillas/guardar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify(data),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        mostrarMensaje("Plantilla guardada", "ok");
        document.getElementById("pl_nombre").value = "";
        document.getElementById("pl_cargo").value = "";
        document.getElementById("pl_funciones").value = "";
        document.getElementById("pl_clausulas").value = "";
        listarPlantillas();
        actualizarSelectPlantillas();
      } else {
        mostrarMensaje(res.error || "Error al guardar", "error");
      }
    });
}

function eliminarPlantilla(id) {
  if (!confirm("¿Eliminar esta plantilla?")) return;
  fetch("/app/contratos/api/plantillas/eliminar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
    body: JSON.stringify({ id }),
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        mostrarMensaje("Plantilla eliminada", "ok");
        listarPlantillas();
        actualizarSelectPlantillas();
      }
    });
}

function actualizarSelectPlantillas() {
  fetch("/app/contratos/api/plantillas")
    .then(r => r.json())
    .then(data => {
      const sel = document.getElementById("plantilla_id");
      const actual = sel.value;
      sel.innerHTML = '<option value="">Sin plantilla</option>';
      if (data.plantillas) {
        data.plantillas.forEach(p => {
          const opt = document.createElement("option");
          opt.value = p.id;
          opt.textContent = `${p.cargo} — ${p.nombre}`;
          sel.appendChild(opt);
        });
      }
      sel.value = actual;
    });
}

function getCSRF() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}
