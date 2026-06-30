# Documento de Requisitos del Producto (PRD)

## 1. Visión General del Producto
El sistema consiste en una solución SaaS (Software as a Service) B2B orientada al mercado chileno, compuesta por una Landing Page pública estática y un módulo de autenticación independiente para dueños de empresas y administradores. Este módulo automatiza el control, gestión y cumplimiento normativo laboral de clientes (empresas contratistas) y sus respectivas relaciones con empresas mandantes (conforme a la Ley Nº 20.123 sobre Régimen de Subcontratación).

### 1.1. Enfoque Mobile-First y Soporte PWA (Progressive Web App)
La aplicación web administrativa está diseñada bajo la filosofía *Mobile-First*, permitiendo su ejecución nativa y fluida en smartphones. Mediante la incorporación de tecnología **PWA**, los usuarios podrán:
* Instalar la aplicación en la pantalla de inicio de sus dispositivos móviles (Android / iOS) directamente desde el navegador web, sin intermediación de tiendas de aplicaciones (App Stores).
* Utilizar capacidades nativas del hardware móvil como el **micrófono** (para dictado y captura de audio) y la **cámara** (para digitalización y OCR de cédulas de identidad).
* Disponer de almacenamiento en caché local mediante *Service Workers* para optimizar la velocidad de carga en zonas con conectividad reducida o inestable (como faenas mineras o agrícolas).

---

## 2. Gestión de Usuarios y Roles

### Módulo de Autenticación (Login)
* **Acceso:** Formulario de inicio de sesión exclusivo en la Landing Page principal para los dueños de empresas/administradores autorizados.
* **Seguridad:** Restricción estricta de navegación. Los usuarios no autenticados son redirigidos automáticamente a la raíz de la aplicación web estática.

---

## 3. Módulo de Gestión de Empresas

### 3.1. Ingresar Empresas (Alta en el Sistema)
* **Campos Requeridos:** RUT Empresa, Razón Social (Nombre), Nombre del Representante Legal, RUT Representante Legal, Actividad Económica, Dirección, Clave SII Empresa, Clave SII Persona Natural, Contacto (Teléfono/Email), Clave PreviRed, Clave Mutual, Clave AFC, Clave Portuaria y ClaveÚnica.
* **Lógica de Interfaz y CRUD:**
    * **Filtro por RUT:** Al ingresar un RUT en el formulario, el sistema realiza una consulta asíncrona (AJAX/Fetch) en la base de datos de PostgreSQL.
    * **Comportamiento de Autocompletado:** Si el RUT ya existe, el sistema carga de forma inmediata y automática todos los datos almacenados en los campos del formulario. Adicionalmente, deshabilita el botón "Guardar" y habilita dinámicamente los botones "Modificar" y "Eliminar".
    * **Alta Nueva:** Si el RUT no se encuentra registrado, los campos permanecen vacíos para su llenado manual u automatizado y se activa el botón "Guardar".

### 3.2. Gestionar Empresas (Asignación y Contexto)
* **Búsqueda Principal:** Motor de búsqueda centralizado basado en el RUT de la empresa para habilitar operaciones avanzadas (contratos, anexos, sueldos).
* **Selector de Contexto Mandante (Ley 20.123):** El sistema incluye un componente de selección obligatoria para determinar si la gestión o documento se emite para la **Empresa Principal (Contratista)** de manera directa, o si se asocia a una **Empresa Mandante** específica.
    * **Lógica Relacional:** Una empresa registrada puede prestar servicios para múltiples empresas mandantes. Por lo tanto, el sistema soportará que cada relación con una mandante disponga de contratos, anexos y pactos de horas extraordinarias independientes y diferenciados.

---

## 4. Módulo de Automatización de Contratos y Anexos

### 4.1. Crear Contratos (Cumplimiento Art. 10 del Código del Trabajo)
* **Formatos Base (Plantillas):** El sistema permitirá predefinir formatos tipificados de contratos conforme al cargo requerido (ej. Contrato de Soldador, Supervisor, Administrativo, etc.) para acelerar la selección.
* **Ingreso Inteligente por Visión (OCR en Smartphone):**
    * **Captura de Cédula Chilena:** Utilizando la cámara del smartphone integrada vía PWA, el usuario captura el documento de identidad chileno (frente y dorso).
    * **Extracción de Datos:** El sistema poblará automáticamente en el formulario: Nombres completos, Apellidos, RUT y Fecha de Nacimiento.
    * **Persistencia de Firma y Vigencia:** Almacenará la firma digitalizada de la cédula y su fecha de vencimiento para su uso en flujos posteriores.
* **Ingreso Inteligente por Voz y Correo (IA Integrada):**
    * **Procesamiento Multimedia:** El sistema contará con interfaces para cargar correos, audios recibidos de WhatsApp o capturar voz directamente a través del **micrófono del smartphone** aprovechando la API de audio nativa de la PWA.
    * **Transcripción y Clasificación Semántica:** Una capa de IA transcribirá e identificará los datos faltantes para rellenar de forma automatizada los campos obligatorios del contrato (evitando la digitación ítem por ítem mediante flujos conversacionales interactivos).
* **Estructura y Campos del Contrato (Art. 10):**
    * Información de la Empresa Empleadora o Empresa Mandante asociada.
    * Datos del Trabajador: Nombres, apellidos, RUT, fecha de nacimiento, dirección, número de contacto y correo electrónico.
    * Fecha de inicio del contrato.
    * Tipo de contrato: Indefinido, Plazo Fijo (requiere campo de fecha de término), Por Faena (exige registrar el Nombre de la Faena específica), o Jornada Parcial (Part-time).
    * Determinación de la naturaleza de los servicios (funciones específicas a realizar).
    * Lugar o ciudad en que hayan de prestarse los servicios.
    * Duración y distribución de la jornada ordinaria de trabajo (horas semanales).
    * Monto, forma y período de pago de la remuneración acordada (vinculado al Módulo de Sueldos).

### 4.2. Crear Anexos (Modificaciones por Mutuo Acuerdo, Art. 11)
* **Lógica de Automatización:** Sigue los mismos principios de autocompletado inteligente por IA, micrófono y voz que los contratos, minimizando la escritura del usuario desde el móvil.
* **Funcionalidad:** Permite emitir documentos de anexos de contrato destinados a modificar cualquier cláusula o artículo del contrato de trabajo vigente por mutuo consentimiento de las partes.

---

## 5. Módulo de Horas Extraordinarias Automáticas (Pactos)

* **Generación Nativa:** Al completarse la creación de cualquier contrato de trabajo, el sistema emitirá automáticamente un **Pacto de Horas Extraordinarias** asociado, con su fecha de inicio correspondiente.
* **Vigencia Legal:** Los pactos tendrán una vigencia máxima de 3 meses, de acuerdo con la legislación laboral chilena.
* **Autorenovación:** El motor de la aplicación evaluará periódicamente el estado de los contratos. Si el contrato de trabajo sigue vigente, el sistema generará automáticamente el documento de renovación del pacto con un mínimo de **una semana (7 días) de anticipación** a su fecha de caducidad.

---

## 6. Módulo de Cálculo de Sueldos y Conectividad

* **Propuestas de Remuneración:** El sistema procesará simulaciones entregando desgloses completos para propuestas de Sueldo Líquido o Sueldo Bruto.
* **Sincronización Automatizada (PreviRed):**
    * Consumo diario o mensual automatizado (vía API o Web Scraping) de los indicadores previsionales directamente desde el portal oficial de PreviRed (UF, UTM, topes imponibles, tasas de cotización, etc.).
* **Consulta Automatizada de Afiliación (Superintendencia de Pensiones):**
    * El sistema consultará de forma asíncrona mediante el RUT del trabajador el portal oficial de la Superintendencia de Pensiones para identificar en qué AFP se encuentra afiliado el trabajador, aplicando de manera automática la tasa de cotización correspondiente al cálculo.
* **Outputs:**
    * Integración de parámetros basados en la planilla Excel provista por el usuario.
    * Emisión de un reporte detallado con el **Costo Total del Trabajador para la Empresa** (Costo Empresa), desglosando aportes patronales (SIS, Seguro de Cesantía, Mutual de Seguridad, etc.).

---

## 7. Motor de Alertas y Notificaciones Configurable

### 7.1. Reglas de Notificación Automatizada
1.  **Vencimiento de Contratos:** Envío de recordatorio automático al cliente por canal digital (WhatsApp o Correo) notificando la proximidad del término de un contrato a plazo fijo.
2.  **Renovación de Pactos de Horas Extras:** Al cumplirse el plazo de generación automatizada (7 días antes del vencimiento), el sistema emite el archivo en formato PDF y lo envía de forma directa al cliente a través de WhatsApp o correo electrónico para su firma.
3.  **Alertas Personalizadas por el Usuario:** Interfaz de control móvil donde el usuario selecciona un archivo cargado en el sistema y, por medio de una lista desplegable parametrizada por él mismo, define una fecha de vencimiento y programa un recordatorio vía WhatsApp.

### 7.2. Panel de Configuración de Alertas
* **Control de Suscripción (Opt-in / Opt-out):** Módulo de configuración granular que permite activar o desactivar los envíos de notificaciones por cada cliente de forma independiente, respetando la preferencia de aquellos que opten por no recibir alertas automáticas.

---

## 8. Arquitectura y Stack Tecnológico

* **Backend:** Django 6.0+ (Python 3.12+)
* **Base de Datos:** PostgreSQL 16+ ejecutado de manera aislada.
* **Frontend:** Vistas adaptativas renderizadas por Django utilizando HTML5, CSS3 y Tailwind CSS integrado a través de su CDN oficial.
* **Componentes PWA:**
    * `manifest.json`: Configuración de iconos, colores institucionales y comportamiento de visualización a pantalla completa en smartphones (standalone mode).
    * `service-worker.js`: Estrategias de caché para recursos estáticos y assets de Tailwind, permitiendo la carga instantánea de la interfaz móvil.
* **Entorno de Contenedores:** Docker y Docker Compose para desarrollo local homogéneo.
* **Infraestructura de Despliegue:** Preparado para despliegue directo en **Render** integrado con flujos de CI/CD de GitHub.
