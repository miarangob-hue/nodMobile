# TODO

## Prioridad alta

- [x] Crear, listar y cancelar reservas directamente en Provider como fuente única de datos.
- [x] Verificar aceptación y ciclo completo en Provider sobre el mismo `booking_id`.
- [ ] Validar cobertura, servicio y disponibilidad nuevamente en backend al crear y aceptar una reserva.
- [ ] Confirmar en backend la persistencia de comuna, ciudad, latitud y longitud que la app ya envía como campos estructurados.
- [ ] Sustituir las claves y credenciales de desarrollo antes de publicar en tiendas.

## Calidad y pruebas

- [x] Incorporar pruebas unitarias para RUT, normalización de comunas y estados de reserva.
- [x] Ejecutar prueba de integración de reserva, aceptación, inicio, tracking, pausa, reanudación y cierre en Provider.
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
- [x] Verificar acceso autenticado a búsqueda residencial con la llave móvil y Bearer Customer.
- [ ] Vincular la identidad del proveedor con `nod-api` y sincronizar el `hosting_profile` ya activo de `pabloxp@gmail.com`; Customer API responde `404 Host not found` para su ID Provider.
- [ ] Corregir el chat de reservas: Provider API rechaza el JWT Customer aunque las rutas ya existen.
- [x] Incorporar borradores de privacidad, términos y solicitud autenticada de eliminación de cuenta.
- [ ] Revisión jurídica, identidad legal completa y publicación web de privacidad, términos y eliminación.
- [x] Integrar en cliente crear, consultar y cancelar solicitudes de eliminación mediante la API dedicada.
- [ ] Probar eliminación de cliente E2E y publicar el equivalente dedicado para cuentas proveedor.

## Publicación

- [ ] Configurar firma Android de producción; actualmente el release local usa la firma de desarrollo.
- [ ] Configurar certificados y perfiles de distribución iOS.
- [ ] Preparar íconos, capturas, ficha de tienda y política de privacidad.
- [ ] Completar la lista consolidada de [`docs/PENDIENTES.md`](docs/PENDIENTES.md).
