function limpiarRUT(rut) {
    return rut.replace(/[^0-9kK]/g, "").toUpperCase();
}

function formatearRUT(rut) {
    const limpio = limpiarRUT(rut);
    if (limpio.length <= 1) return limpio;
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    const formateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return formateado + "-" + dv;
}

let empresaActual = null;
let modoEdicion = false;

document.addEventListener("DOMContentLoaded", () => {
    cargarTodasEmpresas();

    document.getElementById("rut-busqueda").addEventListener("input", function () {
        const cursor = this.selectionStart;
        this.value = formatearRUT(this.value);
        this.setSelectionRange(cursor, cursor);
    });

    document.getElementById("btn-buscar").addEventListener("click", buscarEmpresa);
    document.getElementById("rut-busqueda").addEventListener("keydown", (e) => {
        if (e.key === "Enter") buscarEmpresa();
    });

    document.getElementById("btn-nueva").addEventListener("click", () => mostrarFormulario(null));
    document.getElementById("btn-cancelar").addEventListener("click", ocultarFormulario);
    document.getElementById("btn-guardar").addEventListener("click", guardarEmpresa);
    document.getElementById("btn-modificar").addEventListener("click", () => modoEdicion = true);
    document.getElementById("btn-eliminar").addEventListener("click", eliminarEmpresa);

    document.getElementById("btn-nuevo-mandante").addEventListener("click", () => {
        document.getElementById("form-mandante").classList.remove("hidden");
        document.getElementById("m-rut").focus();
    });
    document.getElementById("btn-cancelar-mandante").addEventListener("click", () => {
        document.getElementById("form-mandante").classList.add("hidden");
        limpiarFormMandante();
    });
    document.getElementById("btn-guardar-mandante").addEventListener("click", guardarMandante);
});

async function buscarEmpresa() {
    const rut = limpiarRUT(document.getElementById("rut-busqueda").value);
    if (!rut) return mostrarToast("Ingresa un RUT", "error");
    try {
        const res = await fetch("/app/empresas/api/buscar?rut=" + rut);
        const data = await res.json();
        if (data.encontrada) {
            empresaActual = data.empresa;
            mostrarFormulario(data.empresa);
        } else {
            empresaActual = null;
            mostrarFormulario({ rut: formatearRUT(rut) });
            mostrarToast("Empresa no encontrada. Completa los datos para crear una nueva.", "error");
        }
    } catch (e) {
        mostrarToast("Error al buscar", "error");
    }
}

function mostrarFormulario(empresa) {
    const form = document.getElementById("form-empresa");
    form.classList.remove("hidden");

    document.getElementById("empresa-id").value = empresa?.id || "";
    document.getElementById("e-rut").value = empresa?.rut || "";
    document.getElementById("e-razon-social").value = empresa?.razon_social || "";
    document.getElementById("e-nombre-representante").value = empresa?.nombre_representante || "";
    document.getElementById("e-rut-representante").value = empresa?.rut_representante || "";
    document.getElementById("e-actividad").value = empresa?.actividad_economica || "";
    document.getElementById("e-direccion").value = empresa?.direccion || "";
    document.getElementById("e-telefono").value = empresa?.contacto_telefono || "";
    document.getElementById("e-email").value = empresa?.contacto_email || "";

    const existe = !!empresa?.id;
    modoEdicion = false;
    document.getElementById("form-titulo").textContent = existe ? empresa.razon_social : "Nueva empresa";
    document.getElementById("btn-guardar").classList.toggle("hidden", existe && !modoEdicion);
    document.getElementById("btn-modificar").classList.toggle("hidden", !existe);
    document.getElementById("btn-eliminar").classList.toggle("hidden", !existe);
    document.getElementById("acciones-empresa").classList.toggle("hidden", !existe);

    const mandantes = document.getElementById("section-mandantes");
    if (existe) {
        mandantes.classList.remove("hidden");
        cargarMandantes(empresa.rut);
    } else {
        mandantes.classList.add("hidden");
    }

    form.scrollIntoView({ behavior: "smooth" });
}

function ocultarFormulario() {
    document.getElementById("form-empresa").classList.add("hidden");
    document.getElementById("section-mandantes").classList.add("hidden");
    empresaActual = null;
}

async function guardarEmpresa() {
    const data = {
        rut: limpiarRUT(document.getElementById("e-rut").value),
        razon_social: document.getElementById("e-razon-social").value,
        nombre_representante: document.getElementById("e-nombre-representante").value,
        rut_representante: limpiarRUT(document.getElementById("e-rut-representante").value),
        actividad_economica: document.getElementById("e-actividad").value,
        direccion: document.getElementById("e-direccion").value,
        contacto_telefono: document.getElementById("e-telefono").value,
        contacto_email: document.getElementById("e-email").value,
        clave_sii_empresa: document.getElementById("e-clave-sii-emp").value,
        clave_sii_persona: document.getElementById("e-clave-sii-per").value,
        clave_previred: document.getElementById("e-clave-previred").value,
        clave_mutual: document.getElementById("e-clave-mutual").value,
        clave_afc: document.getElementById("e-clave-afc").value,
        clave_portuaria: document.getElementById("e-clave-portuaria").value,
        clave_unica: document.getElementById("e-clave-unica").value,
    };

    if (!data.rut || !data.razon_social) {
        return mostrarToast("RUT y Razón Social son obligatorios", "error");
    }

    try {
        const res = await fetch("/app/empresas/api/guardar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.ok) {
            mostrarToast(result.creada ? "Empresa creada" : "Empresa actualizada", "success");
            ocultarFormulario();
            document.getElementById("rut-busqueda").value = formatearRUT(data.rut);
            await buscarEmpresa();
            cargarTodasEmpresas();
        } else {
            mostrarToast(result.error || "Error al guardar", "error");
        }
    } catch (e) {
        mostrarToast("Error de conexión", "error");
    }
}

async function eliminarEmpresa() {
    const rut = limpiarRUT(document.getElementById("e-rut").value);
    if (!confirm("¿Eliminar esta empresa y todos sus datos?")) return;
    try {
        const res = await fetch("/app/empresas/api/eliminar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rut }),
        });
        const result = await res.json();
        if (result.ok) {
            mostrarToast("Empresa eliminada", "success");
            ocultarFormulario();
            document.getElementById("rut-busqueda").value = "";
            cargarTodasEmpresas();
        } else {
            mostrarToast(result.error || "Error al eliminar", "error");
        }
    } catch (e) {
        mostrarToast("Error de conexión", "error");
    }
}

async function cargarTodasEmpresas() {
    const tabla = document.getElementById("tabla-empresas");
    try {
        const res = await fetch("/app/empresas/api/buscar?rut=");
        // We'll load all by fetching a non-existent pattern trick
        // Actually, let's just show a message for now
        tabla.innerHTML = '<p class="text-sm text-slate-500 text-center py-8">Usa la búsqueda por RUT para gestionar empresas.</p>';
    } catch (e) {
        tabla.innerHTML = '<p class="text-sm text-red-400 text-center py-8">Error al cargar empresas.</p>';
    }
}

async function cargarMandantes(rut) {
    try {
        const res = await fetch("/app/empresas/api/mandantes?rut=" + rut);
        const data = await res.json();
        const container = document.getElementById("tabla-mandantes");
        if (!data.mandantes?.length) {
            container.innerHTML = '<p class="text-sm text-slate-500">Sin mandantes registrados.</p>';
            return;
        }
        container.innerHTML = data.mandantes.map(m =>
            `<div class="flex items-center justify-between py-2 border-b border-dark-700/30">
                <div>
                    <span class="text-sm text-slate-200">${m.razon_social_mandante}</span>
                    <span class="text-xs text-slate-500 ml-2">${m.rut_mandante}</span>
                </div>
                <button onclick="eliminarMandante('${m.rut_mandante}')" class="text-red-400 hover:text-red-300 text-xs"><i class="fas fa-times"></i></button>
            </div>`
        ).join("");
    } catch (e) {
        console.error("Error cargando mandantes:", e);
    }
}

async function guardarMandante() {
    if (!empresaActual) return;
    const data = {
        rut_empresa: empresaActual.rut,
        rut_mandante: limpiarRUT(document.getElementById("m-rut").value),
        razon_social_mandante: document.getElementById("m-razon-social").value,
    };
    if (!data.rut_mandante || !data.razon_social_mandante) {
        return mostrarToast("Completa todos los campos del mandante", "error");
    }
    try {
        const res = await fetch("/app/empresas/api/mandantes/guardar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.ok) {
            mostrarToast("Mandante agregado", "success");
            limpiarFormMandante();
            document.getElementById("form-mandante").classList.add("hidden");
            cargarMandantes(empresaActual.rut);
        } else {
            mostrarToast(result.error || "Error", "error");
        }
    } catch (e) {
        mostrarToast("Error de conexión", "error");
    }
}

async function eliminarMandante(rutMandante) {
    if (!empresaActual || !confirm("¿Eliminar esta relación mandante?")) return;
    try {
        const res = await fetch("/app/empresas/api/mandantes/eliminar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rut_empresa: empresaActual.rut, rut_mandante: rutMandante }),
        });
        const result = await res.json();
        if (result.ok) {
            mostrarToast("Mandante eliminado", "success");
            cargarMandantes(empresaActual.rut);
        }
    } catch (e) {
        mostrarToast("Error", "error");
    }
}

function limpiarFormMandante() {
    document.getElementById("m-rut").value = "";
    document.getElementById("m-razon-social").value = "";
}

function mostrarToast(msg, tipo) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();
    const div = document.createElement("div");
    div.className = "toast toast-" + tipo;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}
