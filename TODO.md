# TODO

## Prioridad alta

- [x] Crear, listar y cancelar reservas directamente en Provider como fuente única de datos.
- [x] Verificar aceptación y ciclo completo en Provider sobre el mismo `booking_id`.
- [x] Integrar pagos Customer con reservas Provider y alinear Checkout Pro, estado consolidado e idempotencia de Créditos NOD.
- [x] Validar propiedad, fechas futuras y conflictos de disponibilidad: otro cliente recibe `403`, fechas pasadas `400` y horario ocupado `409`.
- [ ] Rechazar servicios inexistentes o no asociados al proveedor; `/create-booking-request` aceptó un UUID inexistente con `201` en QA.
- [ ] Validar cobertura geográfica al crear/aceptar una reserva.
- [ ] Persistir comuna, ciudad, latitud y longitud: Provider acepta la petición pero omite actualmente esos campos en creación y listado.
- [ ] Sustituir las claves y credenciales de desarrollo antes de publicar en tiendas.

## Calidad y pruebas

- [x] Incorporar pruebas unitarias para RUT, normalización de comunas y estados de reserva.
- [x] Ejecutar prueba de integración de reserva, aceptación, inicio, tracking, pausa, reanudación y cierre en Provider.
- [x] Certificar el ciclo interno Provider directo: crear, aceptar, iniciar, tracking, pausar, reanudar y completar.
- [x] Unificar reservas normales en Provider API y certificar chat/cancelación sobre el mismo `booking_id`.
- [ ] Incorporar pruebas E2E Android/iOS para teclado, ubicación, mapa y formularios.
- [x] Agregar CI para ejecutar TypeScript, pruebas y export Android de validación en cada pull request.
- [ ] Probar permisos denegados y conectividad intermitente en dispositivos reales.

## Producto

- [x] Completar sincronización real de matches y mensajería entre teléfonos; verificado E2E con dos perfiles cliente.
- [x] Cliente móvil push: permiso, canal Android, registro por rol, persistencia, baja al cerrar sesión y navegación desde notificaciones.
- [ ] Completar push E2E externo: vincular proyecto EAS, cargar FCM/APNs, publicar worker de envío y probar tokens reales en Android/iPhone.
- [ ] Agregar disponibilidad horaria al filtro previo de paseadores.
- [ ] Mejorar accesibilidad, tamaños de texto y navegación con lector de pantalla.
- [x] Sincronizar spots personales con foto y GPS mediante GET/POST /spots.
- [x] Agregar puntos, progreso y medallas derivadas en la experiencia Comunidad.
- [x] Integrar feed comunitario global, publicaciones con foto, reacciones y comentarios mediante `/feed` y `/posts`.
- [ ] Persistir logros/medallas en backend y agregar ranking comunitario; hoy el progreso se deriva de los spots sincronizados.
- [x] Migrar Housing a Provider API como fuente única (`search-hosting`, `get-hosting-host`, `create-booking-request`, `get-customer-bookings`).
- [x] Probar Housing backend E2E con JWT Provider: búsqueda, disponibilidad, creación, listado, confirmación y cancelación.
- [x] Aceptar JWT Customer para crear y cancelar reservas Housing, infiriendo la identidad desde la sesión.
- [x] Certificar chat de reservas Customer: crear/obtener, enviar, listar y marcar lectura.
- [x] Incorporar borradores de privacidad, términos y solicitud autenticada de eliminación de cuenta.
- [ ] Revisión jurídica, identidad legal completa y publicación web de privacidad, términos y eliminación.
- [x] Integrar en cliente crear, consultar y cancelar solicitudes de eliminación mediante la API dedicada.
- [x] Probar E2E reversible de eliminación Customer: crear `202`, consultar `200`, cancelar `200` y confirmar ausencia `404`.
- [ ] Probar ejecución definitiva y anonimización en una cuenta Customer desechable, y publicar el equivalente para Provider.

## Publicación

- [ ] Configurar firma Android de producción; actualmente el release local usa la firma de desarrollo.
- [ ] Configurar certificados y perfiles de distribución iOS.
- [ ] Preparar íconos, capturas, ficha de tienda y política de privacidad.
- [ ] Completar la lista consolidada de [`docs/PENDIENTES.md`](docs/PENDIENTES.md).
