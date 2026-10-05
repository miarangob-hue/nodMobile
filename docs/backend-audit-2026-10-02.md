# Auditoría backend NOD — 2 de octubre de 2026

## Resumen

Se probaron los contratos consumidos por NOD Mobile en las APIs de cliente, proveedor y administración, además del webhook de Mercado Pago. Se ejecutaron pruebas de existencia, validación, autorización y lecturas con datos reales ya existentes, sin crear usuarios ni alterar reservas reales.

Resultado principal:

- Catálogos, login, clientes, mascotas, búsqueda de proveedores, reservas principales, tracking del cliente, seguros, spots, dating y moderación responden.
- El webhook de Mercado Pago está activo y rechaza correctamente llamadas sin firma con `401 invalid_signature`.
- Hay 21 contratos del backend proveedor cuya ruta responde, pero la función interna no está desplegada (`404 NOT_FOUND: Requested function was not found`).
- Falta `POST /unregister-push-token`.
- La API key móvil de cliente no tiene los scopes `hosting:read` y `hosting:write`.
- Varias APIs sensibles entregan información usando solamente una API key pública, sin una sesión Bearer. Esto debe considerarse un bloqueo de seguridad antes de producción.

## P0 — Bloqueos de seguridad

### Exigir sesión y pertenencia del recurso

Las siguientes lecturas respondieron `200` sin `Authorization: Bearer`, usando solamente la API key incluida en la aplicación:

- `GET /customers`
- `GET /pets?customer_id=...`
- `GET /get-customer-bookings?customer_id=...`
- `GET /get-provider-bookings?provider_id=...`
- `GET /get-provider-dashboard?provider_id=...`
- `GET /get-provider-balance?provider_id=...`
- `GET /get-provider-performance?provider_id=...`
- `GET /purchases?customer_id=...`
- `GET /spots?customer_id=...`
- `GET /customers/:id/emergency-contacts`

La API key de una aplicación móvil no es un secreto. Backend debe exigir Bearer y comprobar que el usuario autenticado sea dueño del `customer_id`/`provider_id`, o que tenga un rol administrativo autorizado.

También deben protegerse de la misma manera las mutaciones de reservas actualmente atendidas por la API de proveedor:

- `POST /create-booking-request`
- `POST /cancel-booking`

## P0 — Residencial bloqueado

La API key configurada responde:

- `GET /hosting/search` → `403 Missing scope hosting:read`
- `GET /hosting/hosts/:id` → `403 Missing scope hosting:read`
- `POST /hosting/bookings` → `403 Missing scope hosting:write`
- `GET /hosting/bookings/my-bookings` → `403 Missing scope hosting:write`
- `PUT /hosting/bookings/:id/status` → `403 Missing scope hosting:write`

Backend debe emitir/configurar una key móvil cliente con ambos scopes. Las solicitudes deben aceptar conjuntamente:

- `x-api-key: <customer-mobile-key>`
- `Authorization: Bearer <user-session>`

Además debe unificarse la identidad del proveedor para que una sesión proveedor pueda consultar y cambiar únicamente las estadías que le pertenecen.

## P0 — Funciones proveedor no desplegadas

Estos contratos devuelven `404`, código `NOT_FOUND`, mensaje `Requested function was not found`, incluso usando IDs reales cuando correspondía:

### Wallet, pagos y datos financieros

- `GET /get-wallet-transactions`
- `GET /get-provider-bank-accounts`
- `POST /create-provider-bank-account`
- `GET /get-provider-tax-summary`

### Perfil, documentos y reputación

- `GET /get-provider-documents`
- `GET /get-provider-reviews`

`GET /get-provider-review-summary` sí funciona.

### Tracking y evidencias para proveedor

- `GET /get-service-route`
- `GET /get-service-photos`
- `GET /get-service-incidents`
- `GET /get-service-summary`

Las alternativas de cliente `GET /bookings/:id/route` y `GET /bookings/:id/photos` sí funcionan con reservas reales.

### Chat de reserva

- `POST /get-or-create-booking-chat`
- `GET /get-chat-messages`
- `POST /send-chat-message`
- `POST /mark-chat-read`

El chat de dating es otro flujo y sí tiene sus rutas desplegadas; no reemplaza este chat cliente–proveedor.

### Notificaciones, seguridad y soporte proveedor

- `GET /get-notifications`
- `POST /mark-notification-read`
- `POST /create-emergency-alert`
- `GET /get-emergency-contacts`
- `GET /get-veterinary-coverage`
- `GET /list-support-tickets`
- `POST /create-support-ticket` en la API proveedor

El endpoint de soporte con el mismo nombre en la API cliente sí responde.

## P1 — Push

- `POST /register-push-token` existe y exige Bearer correctamente.
- `DELETE /push-devices/:id` existe y exige Bearer correctamente.
- `POST /unregister-push-token` no existe y responde `404 Unknown endpoint`.

La app usa `DELETE /push-devices/:id` cuando el registro devuelve un identificador. El endpoint faltante sigue siendo necesario como compatibilidad/fallback, o backend debe garantizar siempre `device_id` en el registro.

## P1 — Contratos desalineados

### Notificaciones cliente

Backend exige `customer_id` en:

- `GET /notifications`
- `POST /notifications/:id/read`

Debe decidirse un contrato único: inferir el cliente desde Bearer (preferido) o documentar/exigir `customer_id` y validar que pertenezca a la sesión.

### Comunidad

Backend exige `customer_id` para crear publicaciones, dar like y comentar cuando no puede inferir una sesión. Debe inferirlo siempre desde Bearer y rechazar IDs de otros clientes. No se debe confiar en un `customer_id` arbitrario enviado por el teléfono.

### Búsqueda de proveedores

`GET /providers` exige `service_id` UUID. Debe mantenerse documentado y devolver un error estable; para una vista general puede agregarse soporte opcional sin `service_id` o un endpoint de destacados.

## Mercado Pago y Créditos NOD

Comprobado:

- `GET /wallet` existe y exige Bearer.
- `POST /wallet/topups` existe y exige Bearer.
- `POST /wallet/payments` existe y exige Bearer.
- `POST /payments/checkout` existe y exige Bearer.
- `GET /payments/bookings/:id` existe y exige Bearer.
- `/mercadopago-webhook` está activo y valida firma (`401 invalid_signature` sin firma válida).

No certificado por falta de cuentas sandbox autenticadas y medios de prueba:

- creación real de preferencia Mercado Pago;
- acreditación de recarga mediante webhook;
- débito de Créditos NOD;
- pago de reserva con Checkout Pro;
- idempotencia del webhook;
- devolución al medio original;
- devolución a Créditos NOD;
- comisión de plataforma;
- acreditación neta en wallet del proveedor;
- reversa de la liquidación al cancelar;
- payout del proveedor.

Backend debe entregar cuentas E2E cliente/proveedor, paquete de créditos sandbox, una reserva pagable y credenciales/test users de Mercado Pago para certificar este ciclo.

## Funcionalidades que respondieron correctamente

- Familias, servicios, bancos y conteo de proveedores.
- Login cliente/proveedor (rechazo correcto para credenciales inválidas).
- Registro proveedor (validación correcta de payload vacío).
- Clientes, mascotas y búsqueda de proveedores.
- Reservas cliente/proveedor principales.
- Aceptar, rechazar, iniciar, pausar, reanudar y completar: rutas desplegadas y validaciones activas.
- Actualización GPS, incidentes, fotos e informes: mutaciones desplegadas y validaciones activas.
- Dashboard, saldo, rendimiento, payouts, pricing, disponibilidad y resumen de reseñas del proveedor.
- Rutas y fotos de servicio desde la API cliente con una reserva real.
- Dating: preferencias, perfil social, matches, bloqueos, reportes y mensajes.
- Feed, spots, seguros, ficha médica, disputas, tracking compartido y moderación.
- Solicitud de eliminación de cuenta cliente protegida por Bearer.
- Webhook Mercado Pago con validación de firma.

## Pruebas aún necesarias

Para una certificación E2E completa se requieren variables separadas de QA, no credenciales personales:

- `NOD_E2E_CUSTOMER_EMAIL`
- `NOD_E2E_CUSTOMER_PASSWORD`
- `NOD_E2E_PROVIDER_EMAIL`
- `NOD_E2E_PROVIDER_PASSWORD`
- un perfil residencial QA publicado y asociado al proveedor;
- un usuario administrador con `admin:moderation`;
- usuarios y tarjetas sandbox de Mercado Pago;
- proyecto EAS/FCM/APNs configurado para probar push en dispositivos físicos.

Con esas credenciales se debe ejecutar una reserva completa, tracking, chat, pago, cancelación, reembolso, liquidación al proveedor, residencial y notificación push.
