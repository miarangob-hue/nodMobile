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

## Calidad y pruebas

- [x] Recertificar registro Provider desde cero: cuenta nueva, login, 13 pasos, progreso/rechazos, guardado de categoría/paseador y persistencia (10/10).
- [x] Corregir el contrato de onboarding Provider para enviar `provider_id` en lectura, rechazos y escritura; agregar regresión automatizada.
- [x] Corregir campos de contraseña visibles en Android para los registros Customer y Provider.
- [x] Incorporar pruebas unitarias para RUT, normalización de comunas y estados de reserva.
- [x] Ejecutar prueba de integración de reserva, aceptación, inicio, tracking, pausa, reanudación y cierre en Provider.
- [x] Certificar el ciclo interno Provider directo: crear, aceptar, iniciar, tracking, pausar, reanudar y completar.
- [x] Unificar reservas normales en Provider API y certificar chat/cancelación sobre el mismo `booking_id`.
- [ ] Completar pruebas E2E Android/iOS para ubicación, mapa, permisos y formularios; Android ya aprobó instalación, arranque, render de Login y entrada con teclado en emulador.
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
- [ ] Recertificar Housing E2E: el despliegue del 14-10 mantiene búsqueda/detalle, pero `create-booking-request` rechaza el servicio anterior con `404` y `hosting_profile_id` con `422 out_of_coverage`.
- [ ] Restaurar una asociación de servicio/precio para `pabloxp@gmail.com`; Provider devuelve actualmente cero precios y la validación estricta impide repetir con esa cuenta el ciclo operativo.
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

- [ ] Configurar firma Android de producción; actualmente el release local usa la firma de desarrollo.
- [ ] Configurar certificados y perfiles de distribución iOS.
- [ ] Preparar íconos, capturas, ficha de tienda y política de privacidad.
- [ ] Completar la lista consolidada de [`docs/PENDIENTES.md`](docs/PENDIENTES.md).
