# Reporte Backend: reserva de servicio no visible en Provider API y candidato ausente en Discovery

**Fecha:** 7 de octubre de 2026  
**Origen:** Certificación E2E de NOD Mobile  
**Ambiente:** APIs publicadas de Customer, Provider y Admin  
**Resultado general:** 32/36 pruebas E2E aprobadas

## Resumen ejecutivo

Housing funciona de extremo a extremo utilizando directamente Provider API: búsqueda, detalle, creación de reserva con Customer JWT, listado, apertura de chat, envío y recepción de mensajes, marcado como leído y cancelación.

Persisten dos problemas de backend:

1. Una reserva normal creada correctamente en Customer API no puede ser encontrada por los endpoints de chat de Provider API.
2. Un perfil social recién publicado no aparece en `/discovery/candidates`, aunque el backend permite efectuar likes directos, crear el match y utilizar su chat.

## P0 — Reserva normal creada en Customer API no existe para Provider API

### Flujo ejecutado

1. Autenticar un Customer mediante `POST /login` en Customer API.
2. Obtener catálogo y proveedor disponible.
3. Crear una reserva normal:

```http
POST {CUSTOMER_API}/bookings
x-api-key: <customer-api-key>
Authorization: Bearer <customer-jwt>
Content-Type: application/json
```

Payload representativo:

```json
{
  "provider_id": "<provider-uuid>",
  "pet_id": "<pet-uuid>",
  "service_id": "<service-uuid>",
  "starts_at": "<iso-date>",
  "ends_at": "<iso-date>",
  "address": "Av. Providencia 1234",
  "comuna": "Providencia",
  "city": "Santiago"
}
```

4. Customer API responde `201 Created` y entrega un `booking_id` válido.
5. Intentar abrir el chat mediante Provider API usando el mismo Customer JWT:

```http
POST {PROVIDER_API}/get-or-create-booking-chat
x-api-key: <provider-api-key>
Authorization: Bearer <customer-jwt>
Content-Type: application/json

{
  "booking_id": "<booking-id-creado-en-customer-api>"
}
```

### Resultado observado

```http
HTTP 404
```

```json
{
  "error": "Booking not found"
}
```

El mismo resultado se obtiene en:

- `POST /get-or-create-booking-chat`
- `POST /send-chat-message`
- `GET /get-chat-messages?booking_id=<booking-id>`

El envío se probó con el contrato actualmente aceptado por Provider API:

```json
{
  "booking_id": "<booking-id>",
  "body": "Mensaje E2E de cliente"
}
```

### Evidencia de la ejecución más reciente

- Reserva normal creada: `b6fbc2d9-ed7e-4451-964f-d3ebbd9d7551`
- Creación en Customer API: `201`
- Apertura de chat en Provider API: `404 Booking not found`
- Envío de mensaje en Provider API: `404 Booking not found`
- Lectura de mensajes en Provider API: `404 Booking not found`
- La reserva técnica fue cancelada posteriormente desde Customer API: `200`

### Resultado esperado

Una reserva creada en `POST {CUSTOMER_API}/bookings` debe quedar disponible para el proveedor asignado y para los endpoints de chat de Provider API usando el mismo `booking_id`.

### Solicitud al equipo backend

Revisar el límite entre `customer bookings` y `provider_bookings`. Debe implementarse una de estas soluciones como contrato oficial:

1. Crear de forma transaccional el registro correspondiente en Provider al crear la reserva en Customer API.
2. Hacer que Provider API consulte la fuente de verdad de Customer para reservas normales.
3. Unificar las reservas normales en una fuente compartida y conservar el mismo UUID en ambas APIs.

No se recomienda una sincronización eventual sin garantías porque el chat se abre inmediatamente después de crear la reserva. Si existe propagación asíncrona, el backend debe definir su SLA, mantener el mismo `booking_id` y exponer un estado consultable en vez de responder permanentemente `404`.

### Criterios de aceptación P0

- Crear una reserva normal mediante Customer API devuelve `201` y un `booking_id`.
- El `booking_id` aparece en `GET /get-provider-bookings` del proveedor asignado.
- Customer y Provider pueden ejecutar `POST /get-or-create-booking-chat` sobre ese ID.
- Ambos pueden enviar mensajes con `POST /send-chat-message`.
- Ambos pueden recuperar el mensaje mediante `GET /get-chat-messages`.
- `POST /mark-chat-read` actualiza correctamente el recibo de lectura.
- Un Customer ajeno y un Provider ajeno reciben `403`, no acceso al chat.
- El flujo funciona inmediatamente después del `201` de creación o respeta un SLA documentado y comprobable.

## P1 — Perfil recién publicado no aparece en Discovery

### Flujo ejecutado

1. Crear dos Customers nuevos.
2. Crear una mascota para cada Customer.
3. Publicar ambos perfiles sociales mediante:

```http
PUT {CUSTOMER_API}/pets/{pet_id}/social-profile
Authorization: Bearer <customer-jwt>
```

4. Ambos perfiles se publican correctamente con `discovery_enabled: true`, ubicación en Providencia y atributos compatibles.
5. Consultar desde la primera mascota:

```http
GET {CUSTOMER_API}/discovery/candidates?pet_id=<first-pet-id>&limit=50
Authorization: Bearer <first-customer-jwt>
```

### Resultado observado

- El endpoint responde `200`.
- La segunda mascota no aparece entre los candidatos.
- En otra cuenta existente, el endpoint llegó a responder `404 not_found`.
- Al ejecutar los likes directamente entre ambas mascotas, los dos `POST /discovery/swipes` responden correctamente.
- El segundo like genera el match.
- El chat del match permite enviar y recibir mensajes correctamente.

IDs de la ejecución más reciente:

- Primera mascota: `48f782ff-2e48-459d-ba57-6a4d1409ea53`
- Segunda mascota: `68d7a6d9-948d-4796-b221-a3c4e8a18476`
- Match creado: `4a910810-6bb5-4bff-a551-7faf8ef6d1b4`

### Resultado esperado

Una mascota con perfil social completo, `discovery_enabled: true`, ubicación compatible y que no pertenece al mismo Customer debe aparecer en candidatos, salvo que exista una regla de exclusión explícita. Si existe una exclusión, la API debería exponer un motivo diagnosticable.

### Solicitud al equipo backend

Revisar:

- Indexación o activación posterior a publicar el perfil social.
- Filtros de ubicación, sexo, tamaño, especie y preferencias.
- Caché del feed de candidatos.
- Exclusiones por cuentas nuevas o por ausencia de fotografías.
- Diferencia entre `pet.id`, `pet_id` y el identificador del perfil social.
- Condiciones que producen `404 not_found` en lugar de una lista vacía `200`.

### Criterios de aceptación P1

- Dos perfiles recién creados y compatibles aparecen mutuamente en candidatos.
- Si no existen candidatos, el endpoint devuelve `200` con una colección vacía.
- `404` se reserva para una mascota inexistente o no accesible.
- Las reglas de exclusión quedan documentadas y son consistentes con `/discovery/swipes`.

## Verificaciones que sí aprobaron

### Housing directo en Provider API

- `GET /search-hosting`: `200`
- `GET /get-hosting-host`: `200`
- `POST /create-booking-request` con Customer JWT: `201`
- `GET /get-customer-bookings`: `200`, reserva visible
- `POST /get-or-create-booking-chat`: `201`
- `POST /send-chat-message` usando `body`: `201`
- `GET /get-chat-messages`: `200`, mensaje recibido
- `POST /mark-chat-read`: `200`
- `POST /cancel-booking`: `200`

### Otras funciones aprobadas

- Registro y login de Customers.
- Creación de mascotas y publicación de perfil social.
- Likes directos, creación de match y chat del match.
- Publicación, like y comentario en comunidad.
- Catálogo de servicios y proveedores.
- Creación y cancelación de reserva normal en Customer API.

## Nota sobre endpoints antiguos de Housing

El inventario detectó cinco rutas inexistentes bajo Customer API:

- `/hosting/search`
- `/hosting/hosts/:id`
- `/hosting/bookings`
- `/hosting/bookings/my-bookings`
- `/hosting/bookings/:id/status`

Esto es consistente con la migración informada: Housing pertenece a Provider API. NOD Mobile ya consume directamente `/search-hosting`, `/get-hosting-host`, `/create-booking-request`, `/get-customer-bookings` y `/cancel-booking`.

## Contratos observados que deben mantenerse

- Las operaciones de Housing/chat desde Customer requieren simultáneamente `x-api-key` de Provider y `Authorization: Bearer <customer-jwt>`.
- `POST /send-chat-message` acepta el texto en el campo `body`. El campo `content` documentado anteriormente no fue aceptado por el backend desplegado.
- `GET /get-customer-bookings` actualmente requiere `customer_id` como query parameter además del Customer JWT.
- El backend debe inferir y validar la identidad efectiva desde el JWT para evitar IDOR/BOLA.
