const voz = {
    activo: false,
    respuestas: false,
    reconocimiento: null,
    escuchando: false,
    campoActivo: null,
    transcripcionParal: null,
    comandos: {
        "calcular": () => document.getElementById("btn-calcular")?.click(),
        "calcule": () => document.getElementById("btn-calcular")?.click(),
        "calcula": () => document.getElementById("btn-calcular")?.click(),
        "limpiar": () => limpiarFormulario(),
        "limpia": () => limpiarFormulario(),
        "modo bruto": () => cambiarModo("bruto_a_liquido"),
        "modo líquido": () => cambiarModo("liquido_a_bruto"),
        "modo liquido": () => cambiarModo("liquido_a_bruto"),
        "leer resultados": () => leerResultados(),
        "lee resultados": () => leerResultados(),
        "configurar voz": () => abrirModalVoz(),
        "whatsapp": () => enviarWhatsApp(),
    },
};

function initVoz() {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
        document.querySelectorAll(".voice-btn").forEach(b => b.classList.add("hidden"));
        document.getElementById("voz-banner")?.classList.add("hidden");
        return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    voz.reconocimiento = new SpeechRecognition();
    voz.reconocimiento.lang = "es-CL";
    voz.reconocimiento.continuous = false;
    voz.reconocimiento.interimResults = true;
    voz.reconocimiento.maxAlternatives = 3;

    voz.reconocimiento.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.toLowerCase().trim();
            if (event.results[i].isFinal) {
                procesarVoz(transcript);
                voz.escuchando = false;
                actualizarBotonesVoz();
            }
        }
    };

    voz.reconocimiento.onend = () => {
        voz.escuchando = false;
        actualizarBotonesVoz();
    };

    voz.reconocimiento.onerror = () => {
        voz.escuchando = false;
        actualizarBotonesVoz();
    };

    document.querySelectorAll(".mic-field").forEach(btn => {
        btn.addEventListener("click", () => {
            if (!voz.activo) {
                abrirModalVoz();
                return;
            }
            const campo = btn.dataset.campo;
            if (voz.escuchando) {
                voz.reconocimiento.stop();
            } else {
                voz.campoActivo = campo;
                iniciarEscucha();
            }
        });
    });

    document.getElementById("btn-leer-resultados")?.addEventListener("click", leerResultados);
}

function iniciarEscucha() {
    try {
        voz.reconocimiento.start();
        voz.escuchando = true;
        actualizarBotonesVoz();
    } catch (e) {
        if (e.name === "InvalidStateError") {
            setTimeout(() => iniciarEscucha(), 200);
        }
    }
}

function procesarVoz(texto) {
    if (voz.campoActivo) {
        const numeros = texto.match(/[\d.]+/g);
        if (numeros) {
            const valor = parseFloat(numeros.join("").replace(/\./g, ""));
            if (!isNaN(valor)) {
                const campo = document.getElementById(voz.campoActivo);
                if (campo) {
                    campo.value = valor;
                    campo.dispatchEvent(new Event("input"));
                    hablar(`Valor ${formatearPeso(valor)} ingresado`);
                }
            }
        }
        voz.campoActivo = null;
        return;
    }

    for (const [comando, accion] of Object.entries(voz.comandos)) {
        if (texto.includes(comando)) {
            accion();
            hablar(`Ejecutando comando: ${comando}`);
            return;
        }
    }
}

function actualizarBotonesVoz() {
    document.querySelectorAll(".voice-btn").forEach(btn => {
        if (voz.escuchando) {
            btn.classList.remove("inactive");
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
            btn.classList.add("inactive");
        }
    });
}

function hablar(texto) {
    if (!voz.respuestas) return;
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = "es-CL";
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
}

function leerResultados() {
    if (!voz.respuestas || !estado.resultado) return;
    const r = estado.resultado;
    if (r.error) {
        hablar(`Error: ${r.error}`);
        return;
    }
    const texto = `Sueldo líquido: ${formatearPeso(r.sueldo_liquido)}. ` +
        `Descuento AFP: ${formatearPeso(r.descuento_afp)}. ` +
        `Impuesto Único: ${formatearPeso(r.impuesto_unico)}. ` +
        `Costo total empleador: ${formatearPeso(r.costo_total_trabajador)}.`;
    hablar(texto);
}

function cambiarModo(modo) {
    estado.modo = modo;
    document.querySelectorAll(".modo-btn").forEach(btn => {
        btn.classList.toggle("tab-active", btn.dataset.modo === modo);
        btn.classList.toggle("text-slate-400", btn.dataset.modo !== modo);
    });
    document.querySelectorAll("#sueldo_base, #sueldo_liquido_deseado").forEach(el => {
        el.placeholder = modo === "bruto_a_liquido" ? "Sueldo base" : "Sueldo líquido deseado";
    });
}

function abrirModalVoz() {
    document.getElementById("modal-voz").classList.remove("hidden");
    const cfg = window.configVoz || {};
    document.getElementById("voz-activado").checked = cfg.asistente_activado ?? true;
    document.getElementById("voz-respuestas").checked = cfg.respuestas_voz ?? true;
    document.getElementById("voz-notificacion").checked = cfg.notificacion_whatsapp ?? false;
    document.getElementById("voz-whatsapp-numero").value = cfg.numero_whatsapp_cliente || "";
    document.getElementById("voz-whatsapp-field").classList.toggle("hidden", !cfg.notificacion_whatsapp);
    document.getElementById("voz-notificacion").addEventListener("change", function () {
        document.getElementById("voz-whatsapp-field").classList.toggle("hidden", !this.checked);
    });
}

function cerrarModalVoz() {
    document.getElementById("modal-voz").classList.add("hidden");
}

function enviarWhatsApp() {
    if (!estado.resultado) return;
    const r = estado.resultado;
    const texto = `Hola, te comparto el cálculo de sueldo:\n\n` +
        `Sueldo líquido: ${formatearPeso(r.sueldo_liquido)}\n` +
        `Descuentos: ${formatearPeso(r.total_descuentos)}\n` +
        `Impuesto Único: ${formatearPeso(r.impuesto_unico)}\n` +
        `Costo empleador: ${formatearPeso(r.costo_total_trabajador)}`;

    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
}
