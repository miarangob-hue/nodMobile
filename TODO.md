# TODO

## Prioridad alta

- [x] Crear, listar y cancelar reservas directamente en Provider como fuente única de datos.
- [x] Verificar aceptación y ciclo completo en Provider sobre el mismo `booking_id`.
- [x] Integrar pagos Customer con reservas Provider y alinear Checkout Pro, estado consolidado e idempotencia de Créditos NOD.
- [x] Validar propiedad, fechas futuras y conflictos de disponibilidad: otro cliente recibe `403`, fechas pasadas `400` y horario ocupado `409`.
- [x] Rechazar servicios inexistentes o no asociados al proveedor; QA recertificado con `404 service_not_found`.
- [x] Validar cobertura geográfica al crear una reserva; Antártica contra Providencia responde `422 out_of_coverage`.
- [x] Persistir dirección, comuna, ciudad, latitud y longitud en creación y listados; Mobile envía `commune` y normaliza el objeto `location`.
- [ ] Sustituir las claves y credenciales de desarrollo antes de publicar en tiendas.
- [x] Configurar el Web Client ID de Google en el entorno local y verificar su inclusión en APK/AAB `1.0.32`.
- [x] Corregir falso rechazo de cobertura en Mobile: la reserva normal ya no compara `provider.zones` mal formado localmente y delega la decisión a Provider API.
- [x] Probar en Android el flujo Customer de Providencia hasta checkout Mercado Pago sandbox; reserva QA quedó `pending/unpaid` sin cobro real.

## Calidad y pruebas

Última ejecución verificable: **23 de octubre de 2026**. `npm run validate` pasó **39/39**; registro Provider **10/10**; E2E de dos Customer **38/38**; auditoría de contratos **74/74**; `npm run test:api` respondió al ejecutarse con red autorizada. La regresión autenticada histórica **15/15** no se pudo repetir porque faltan sus credenciales; tampoco arrancaron los E2E que requieren `NOD_E2E_HOSTING_PROFILE_ID`, proyecto/anon key y cuentas separadas. La auditoría adicional detectó un `400 database_error` en actualización de perfil Provider.

- [x] Recertificar registro Provider desde cero: cuenta nueva, login, 13 pasos, progreso/rechazos, guardado de categoría/paseador y persistencia (10/10).
- [x] Corregir el contrato de onboarding Provider para enviar `provider_id` en lectura, rechazos y escritura; agregar regresión automatizada.
- [x] Corregir campos de contraseña visibles en Android para los registros Customer y Provider.
- [x] Incorporar pruebas unitarias para RUT, normalización de comunas y estados de reserva.
- [x] Ejecutar prueba de integración de reserva, aceptación, inicio, tracking, pausa, reanudación y cierre en Provider.
- [x] Certificar el ciclo interno Provider directo: crear, aceptar, iniciar, tracking, pausar, reanudar y completar.
- [x] Unificar reservas normales en Provider API y certificar chat/cancelación sobre el mismo `booking_id`.
- [ ] Completar pruebas E2E Android/iOS para ubicación, mapa, permisos y formularios; Android ya aprobó instalación, arranque, render de Login y entrada con teclado en emulador.
- [ ] Repetir `e2e-authenticated.mjs`, `e2e-customer-community-hosting.mjs` y `e2e-residential-dating.mjs` después de configurar todas sus credenciales/IDs E2E.
- [ ] Corregir el `400 database_error` de actualización de perfil Provider y repetir `audit-backend-extra.mjs`.
- [x] Agregar CI para ejecutar TypeScript, pruebas y export Android de validación en cada pull request.
- [ ] Probar permisos denegados y conectividad intermitente en dispositivos reales.
- [x] Reparar el perfil social histórico asociado al cliente QA: perfil y foto principal publicados; `/discovery/candidates` volvió a responder `200`.

## Producto

- [x] Completar sincronización real de matches y mensajería entre teléfonos; verificado E2E con dos perfiles cliente.
- [x] Cliente móvil push: permiso, canal Android, registro por rol, persistencia, baja al cerrar sesión y navegación desde notificaciones.
- [ ] Completar push E2E externo: vincular proyecto EAS, cargar FCM/APNs, publicar worker de envío y probar tokens reales en Android/iPhone.
- [ ] Agregar disponibilidad horaria al filtro previo de paseadores.
- [ ] Mejorar accesibilidad, tamaños de texto y navegación con lector de pantalla.
- [x] Sincronizar spots personales con foto y GPS mediante GET/POST /spots.
- [x] Agregar puntos, progreso y medallas derivadas en la experiencia Comunidad.
- [x] Integrar feed comunitario global, publicaciones con foto, reacciones y comentarios mediante `/feed` y `/posts`.
- [x] Persistir puntos, niveles y medallas en backend e integrar perfil comunitario server-side.
- [x] Integrar ranking comunitario global y por período; el contrato también admite filtro por comuna.
- [x] Migrar Housing a Provider API como fuente única (`search-hosting`, `get-hosting-host`, `create-booking-request`, `get-customer-bookings`).
- [x] Recertificar Housing E2E: búsqueda, detalle, creación `201`, listado, metadata, chat y cancelación aprobaron nuevamente el 20-10.
- [x] Restaurar asociaciones operativas de `pabloxp@gmail.com`: Customer lo lista como Paseador a $15.000 y Alojamiento/Guardería, con perfil Housing georreferenciado.
- [x] Alinear backend de tarifas: `/update-provider-pricing` y `/get-provider-pricing` devuelven las dos tarifas consolidadas de Pablo desde catálogo y Housing.
- [ ] Consumir `/get-provider-pricing` desde el detalle Customer, ampliar los tipos de fuente/tarifa y agregar edición Provider mediante `POST/PATCH /update-provider-pricing`.
- [ ] Publicar/corregir el proxy Customer `contract-api`; la URL Lovable documentada devuelve HTML y la API Customer actual responde `404` para esa ruta.
- [x] Aceptar JWT Customer para crear y cancelar reservas Housing, infiriendo la identidad desde la sesión.
- [x] Certificar chat de reservas Customer: crear/obtener, enviar, listar y marcar lectura.
- [x] Incorporar borradores de privacidad, términos y solicitud autenticada de eliminación de cuenta.
- [ ] Revisión jurídica, identidad legal completa y publicación web de privacidad, términos y eliminación.
- [x] Integrar en cliente crear, consultar y cancelar solicitudes de eliminación mediante la API dedicada.
- [x] Probar E2E reversible de eliminación Customer: crear `202`, consultar `200`, cancelar `200` y confirmar ausencia `404`.
- [ ] Probar ejecución definitiva y anonimización en una cuenta Customer desechable.
- [x] Integrar y probar solicitud, consulta y cancelación reversible de eliminación Provider.
- [ ] Probar confirmación irreversible Provider con una cuenta desechable; nunca usar la cuenta QA operativa.

## Publicación

- [x] Configurar upload key Android de producción y generar el AAB firmado `1.0.30 (30)`; falta cargarlo y habilitar Play App Signing en Play Console.
- [x] Generar y verificar nuevamente el APK y AAB `1.0.32 (32)` después de corregir cobertura, con R8, `mapping.txt`, Web Client ID y el ajuste final de `pet_ids`; falta subir el AAB a la pista correspondiente de Google Play.
- [ ] Configurar certificados y perfiles de distribución iOS.
- [ ] Preparar íconos, capturas, ficha de tienda y política de privacidad.
- [ ] Completar la lista consolidada de [`docs/PENDIENTES.md`](docs/PENDIENTES.md).
