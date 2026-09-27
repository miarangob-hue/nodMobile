# TODO

## Prioridad alta

- [ ] Unificar las reservas de cliente y proveedor en un solo backend o fuente de datos.
- [ ] Implementar `POST /bookings/{booking_id}/accept` para reservas creadas desde la app cliente.
- [ ] Implementar `POST /bookings/{booking_id}/reject` con motivo opcional.
- [ ] Implementar `PUT /customers/{customer_id}` para sincronizar la edición del perfil entre dispositivos.
- [ ] Validar cobertura, servicio y disponibilidad nuevamente en backend al crear y aceptar una reserva.
- [ ] Persistir comuna, ciudad, latitud y longitud como campos estructurados de la reserva.
- [ ] Sustituir las claves y credenciales de desarrollo antes de publicar en tiendas.

## Calidad y pruebas

- [ ] Incorporar pruebas unitarias para RUT, normalización de comunas y estados de reserva.
- [ ] Incorporar pruebas de integración para registro, login, reserva y aceptación.
- [ ] Incorporar pruebas E2E Android/iOS para teclado, ubicación, mapa y formularios.
- [ ] Agregar CI para ejecutar TypeScript, pruebas y build de validación en cada pull request.
- [ ] Probar permisos denegados y conectividad intermitente en dispositivos reales.

## Producto

- [ ] Completar sincronización real de matches y mensajería entre teléfonos.
- [ ] Implementar notificaciones push originadas por backend para reservas y mensajes.
- [ ] Agregar disponibilidad horaria al filtro previo de paseadores.
- [ ] Mejorar accesibilidad, tamaños de texto y navegación con lector de pantalla.
- [ ] Completar textos legales, privacidad, términos y eliminación de cuenta.

## Publicación

- [ ] Configurar firma Android de producción; actualmente el release local usa la firma de desarrollo.
- [ ] Configurar certificados y perfiles de distribución iOS.
- [ ] Preparar íconos, capturas, ficha de tienda y política de privacidad.
- [ ] Ejecutar la lista de [`docs/store-release-checklist.txt`](docs/store-release-checklist.txt).

