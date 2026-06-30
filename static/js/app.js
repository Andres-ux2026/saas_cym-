document.addEventListener("DOMContentLoaded", async () => {
    await cargarParametros();

    // Salud toggle
    document.getElementById("salud_tipo")?.addEventListener("change", function () {
        document.getElementById("isapre-field").classList.toggle("hidden", this.value !== "isapre");
    });

    // Modo toggle
    document.querySelectorAll(".modo-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            estado.modo = btn.dataset.modo;
            document.querySelectorAll(".modo-btn").forEach(b => {
                b.classList.toggle("tab-active", b.dataset.modo === estado.modo);
                b.classList.toggle("text-slate-400", b.dataset.modo !== estado.modo);
                b.classList.toggle("text-white", b.dataset.modo === estado.modo);
            });
        });
    });

    // Boton calcular
    document.getElementById("btn-calcular")?.addEventListener("click", () => {
        try {
            calcularDesdeForm();
        } catch (e) {
            console.error("Error al calcular:", e);
        }
    });

    // Boton limpiar
    document.getElementById("btn-limpiar")?.addEventListener("click", limpiarFormulario);

    // Inicializar voz
    initVoz();

    // Configurar voz
    document.getElementById("btn-voice-config")?.addEventListener("click", abrirModalVoz);

    // Guardar config voz
    document.getElementById("btn-guardar-voz")?.addEventListener("click", async () => {
        const data = {
            asistente_activado: document.getElementById("voz-activado").checked,
            respuestas_voz: document.getElementById("voz-respuestas").checked,
            notificacion_whatsapp: document.getElementById("voz-notificacion").checked,
            numero_whatsapp_cliente: document.getElementById("voz-whatsapp-numero").value,
        };
        voz.activo = data.asistente_activado;
        voz.respuestas = data.respuestas_voz;
        try {
            const res = await fetch("/api/voz/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                window.configVoz = { ...data };
                cerrarModalVoz();
                if (voz.activo) {
                    document.getElementById("voz-banner").classList.remove("hidden");
                } else {
                    document.getElementById("voz-banner").classList.add("hidden");
                }
            }
        } catch (e) {
            console.error("Error guardando config voz:", e);
        }
    });

    // Config inicial voz
    if (window.configVoz?.asistente_activado) {
        voz.activo = true;
        voz.respuestas = window.configVoz.respuestas_voz;
    }

    // Chequear cambios pendientes
    await verificarCambios();

    // Boton cambios
    document.getElementById("btn-cambios-pendientes")?.addEventListener("click", abrirModalCambios);
    document.getElementById("btn-revisar-todos")?.addEventListener("click", revisarTodosCambios);

    // Enter en inputs
    document.querySelectorAll(".input-field").forEach(el => {
        el.addEventListener("keydown", e => {
            if (e.key === "Enter") calcularDesdeForm();
        });
    });
});

async function verificarCambios() {
    try {
        const res = await fetch("/api/parametros/cambios-pendientes");
        const data = await res.json();
        if (data.hay_cambios) {
            document.getElementById("cambios-badge").classList.remove("hidden");
            document.getElementById("cambios-badge").textContent = data.cambios.length;
            document.getElementById("cambios-banner").classList.remove("hidden");
            document.getElementById("cambios-desc").textContent =
                `Se detectaron ${data.cambios.length} cambio(s) en parámetros previsionales.`;
        }
    } catch (e) {
        console.error("Error verificando cambios:", e);
    }
}

function abrirModalCambios() {
    document.getElementById("modal-cambios").classList.remove("hidden");
    fetch("/api/parametros/cambios-pendientes")
        .then(r => r.json())
        .then(data => {
            const lista = document.getElementById("cambios-lista");
            if (!data.hay_cambios) {
                lista.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No hay cambios pendientes.</p>';
                return;
            }
            lista.innerHTML = data.cambios.map(c =>
                `<div class="p-3 rounded-lg bg-dark-700/40 border border-dark-600 text-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <span class="font-medium text-slate-200">${c.campo}</span>
                            <p class="text-xs text-slate-500 mt-1">
                                <span class="text-red-400">${c.valor_anterior}</span>
                                <i class="fas fa-arrow-right mx-1 text-slate-600"></i>
                                <span class="text-green-400">${c.valor_nuevo}</span>
                            </p>
                        </div>
                        <button onclick="revisarCambio(${c.id})" class="text-xs text-primary-400 hover:text-primary-300">Revisar</button>
                    </div>
                </div>`
            ).join("");
        });
}

function cerrarModalCambios() {
    document.getElementById("modal-cambios").classList.add("hidden");
}

async function revisarCambio(id) {
    try {
        await fetch(`/api/parametros/${id}/revisar`, { method: "POST" });
        await verificarCambios();
        abrirModalCambios();
    } catch (e) {
        console.error("Error revisando cambio:", e);
    }
}

async function revisarTodosCambios() {
    try {
        const res = await fetch("/api/parametros/cambios-pendientes");
        const data = await res.json();
        for (const c of data.cambios) {
            await fetch(`/api/parametros/${c.id}/revisar`, { method: "POST" });
        }
        document.getElementById("cambios-badge").classList.add("hidden");
        document.getElementById("cambios-banner").classList.add("hidden");
        cerrarModalCambios();
    } catch (e) {
        console.error("Error revisando cambios:", e);
    }
}
