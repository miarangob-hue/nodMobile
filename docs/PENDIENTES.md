# Pendientes de NOD Mobile

Última actualización: 13 de octubre de 2026. Versión móvil: 1.0.26 (`versionCode 28`).

## Backend bloqueante

- Housing y chat ya validan JWT Customer junto con `x-api-key`. La app fue ajustada para inferir identidad al crear, enviar `customer_id` solo en la query de listado y usar `body` como contenido del mensaje.
- Reservas normales y Housing ya usan Provider como fuente única; creación, listado, chat y cancelación fueron recertificados E2E.
- Corregir `/create-booking-request`: actualmente acepta un `service_id` UUID inexistente con `201`. Debe validar existencia, vigencia y asociación del servicio al proveedor.
- Persistir dirección, comuna, ciudad, latitud y longitud. Provider acepta esos campos pero los omite de la respuesta y del listado; Mobile conserva temporalmente metadatos de presentación en `notes`.
- La validación de fechas y propiedad sí está activa: fecha pasada `400`, horario ocupado `409` y cancelación de reserva ajena `403`.
- Publicar el flujo dedicado de eliminación y anonimización para cuentas proveedor, equivalente al disponible para clientes.

## Notificaciones e integraciones

- Vincular el proyecto EAS definitivo y configurar Firebase FCM para Android y APNs para iPhone.
- Probar el worker protegido de envío push con credencial interna y teléfonos físicos Android/iPhone.
- Completar una tarjeta sandbox de Mercado Pago hasta webhook y estado `paid`. Checkout y recarga ya crean preferencias `201` y quedan `pending`.
- Acreditar saldo sandbox para certificar pago con Créditos NOD, reintento idempotente sin doble débito, reembolso y payout.

## Comunidad

- Persistir puntos, niveles y medallas en backend para que no puedan alterarse desde el teléfono y sobrevivan reinstalaciones.
- Implementar ranking comunitario global, por comuna y período.
- Probar moderación completa con una sesión que tenga permiso `admin:moderation`.

## Publicación en tiendas

- Sustituir claves y credenciales de desarrollo por secretos productivos y rotar las claves que hayan sido compartidas durante las pruebas.
- Configurar firma Android de producción y generar el AAB destinado a Google Play.
- Configurar certificados y perfiles de distribución iOS y generar el IPA.
- Crear las aplicaciones en Google Play Console y App Store Connect.
- Preparar capturas Android/iPhone, descripción, categoría, clasificación de contenido, soporte y material gráfico.
- Completar Data Safety de Google Play y Privacy Nutrition Labels de Apple.
- Publicar URLs públicas definitivas de privacidad, términos y eliminación de cuenta.
- Completar razón social, RUT, domicilio, contacto, jurisdicción, comisiones, cancelaciones y condiciones de pago en los documentos legales; obtener revisión jurídica.

## Pruebas finales

- Resultado funcional actual: **38/38** en registro, mascotas, Discovery, match/chat, comunidad, reserva normal, Housing y chats. La propagación Customer→Provider ya no aplica: Mobile crea directamente en Provider.
- Pagos Provider: consulta inicial `unpaid`, checkout sandbox `201`, consulta posterior `pending`; falta completar pago sandbox y comprobar `paid` por webhook.
- Eliminación Customer reversible aprobada: crear, consultar y cancelar. Falta ejecutar eliminación/anonimización definitiva en una cuenta desechable.
- Ejecutar regresión E2E en teléfonos físicos Android e iPhone: registro, teclado, permisos denegados, cámara, GPS, mapa, red intermitente, reservas, chat y push.
- Completar una regresión residencial desde dispositivo físico, incluyendo UI, confirmación del proveedor, chat y cancelación.
- Certificar pago sandbox final, moderación administrativa y eliminación definitiva de cuentas.
- Realizar pruebas de accesibilidad con tamaños de texto grandes y lectores de pantalla.

## Mejoras no bloqueantes

- Agregar disponibilidad horaria avanzada al filtro de paseadores.
- Completar ranking y logros comunitarios server-side.
