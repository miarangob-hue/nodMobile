# Canal de Comunicación y Peticiones Backend — NOD Mobile

Este archivo define el protocolo para que el agente de desarrollo de **NOD Mobile** () solicite nuevos endpoints, ajustes de contratos, soporte de parámetros o cambios arquitectónicos al equipo/agente de **Backend**.

---

## 1. Flujo de Trabajo



---

## 2. Plantilla para Agregar una Nueva Petición

Copia y pega este bloque al final de la sección **3. Peticiones Activas**:

```markdown
### REQ-[AÑO]-[CORRELATIVO]: [Título corto y descriptivo]
* **Fecha:** YYYY-MM-DD
* **Módulo:** [NOD Cliente | NOD Pets Provider | NOD Home | Pagos | Autenticación]
* **Prioridad:** [P0 - Bloqueante | P1 - Alta | P2 - Media | P3 - Deseable]
* **Estado:** [PENDIENTE_REVISION | APROBADO | RECHAZADO | EN_DESARROLLO | IMPLEMENTADO]
* **Descripción de la necesidad:**
  [Explica por qué la app móvil requiere este cambio y qué pantalla/flujo está afectado]
* **Endpoint / Recurso afectado:**
  `METHOD /ruta/solicitada`
* **Headers esperados desde Mobile:**
  `Authorization: Bearer <JWT>`
* **Payload propuesto (Request Body):**
  ```json
  {
    campo_ejemplo: valor
  }
  ```
* **Respuesta esperada (Response):**
  ```json
  {
    data: { ... }
  }
  ```
* **Resolución Backend (Solo lectura para Mobile):**
  * *Decisión:* [Completado por Backend tras aprobación]
  * *Contrato oficial:* [Endpoints y reglas definitivas]
```

---

## 3. Peticiones Activas

### REQ-2026-001: Petición de Prueba — Protocolo de Comunicación Mobile ↔ Backend
* **Fecha:** 2026-11-07
* **Módulo:** NOD Home / Integración Mobile
* **Prioridad:** P1 - Alta
* **Estado:** APROBADO
* **Descripción de la necesidad:**
  Establecer el protocolo formal de comunicación para que el agente mobile pueda registrar requerimientos sin exponer API keys, utilizando autenticación basada en JWT de sesión e Idempotency-Key.
* **Endpoint / Recurso afectado:**
  `POST /home-service-requests`
* **Headers requeridos desde Mobile:**
  * `Authorization: Bearer <JWT_SESION>`
  * `Content-Type: application/json`
  * `Idempotency-Key: <UUIDv4>` (obligatorio en POST y operaciones mutables)
  * `X-Request-Id: <UUIDv4>` (opcional para trazabilidad)
* **Resolución Backend:**
  * *Decisión:* APROBADO Y CERTIFICADO.
  * *Contrato oficial:* Se encuentra publicado y versionado en la especificación `NOD_HOME_RESPUESTA_FEEDBACK_Y_CONTRATO_MOBILE.md`. Mobile nunca debe incluir secretos ni `x-api-key` en los binarios APK/AAB/IPA.
