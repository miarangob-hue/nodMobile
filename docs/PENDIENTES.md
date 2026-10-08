# Pendientes de NOD Mobile

Última actualización: 7 de octubre de 2026. Versión móvil: 1.0.26.

## Backend bloqueante

- Housing y chat ya validan JWT Customer junto con `x-api-key`. La app fue ajustada para inferir identidad al crear, enviar `customer_id` solo en la query de listado y usar `body` como contenido del mensaje.
- Publicar el flujo dedicado de eliminación y anonimización para cuentas proveedor, equivalente al disponible para clientes.

## Notificaciones e integraciones

- Vincular el proyecto EAS definitivo y configurar Firebase FCM para Android y APNs para iPhone.
- Probar el worker protegido de envío push con credencial interna y teléfonos físicos Android/iPhone.
- Configurar y probar pagos, reembolsos y payouts en un entorno sandbox antes de producción.

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

- Resultado posterior a la resolución P0: 8/8 en Housing + chat con JWT Customer (crear, listar, abrir chat, enviar, recibir, marcar lectura y cancelar). Sigue pendiente resolver la propagación de reservas normales Customer→Provider.
- Ejecutar regresión E2E en teléfonos físicos Android e iPhone: registro, teclado, permisos denegados, cámara, GPS, mapa, red intermitente, reservas, chat y push.
- Completar una regresión residencial desde dispositivo físico, incluyendo UI, confirmación del proveedor, chat y cancelación.
- Certificar pagos reales/sandbox, moderación administrativa y eliminación definitiva de cuentas.
- Realizar pruebas de accesibilidad con tamaños de texto grandes y lectores de pantalla.

## Mejoras no bloqueantes

- Agregar disponibilidad horaria avanzada al filtro de paseadores.
- Completar ranking y logros comunitarios server-side.
