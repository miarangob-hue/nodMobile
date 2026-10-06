# Pendientes de NOD Mobile

Última actualización: 5 de octubre de 2026. Versión móvil: 1.0.26.

## Backend bloqueante

- Corregir la autenticación cruzada definida por la especificación vigente: Housing consume Provider API directamente, pero `/create-booking-request` rechaza el JWT Customer con `401 Invalid or expired session` y rechaza la API key sola con `401 Bearer access token required`.
- Completar y certificar el ciclo de reservas Housing en Provider API después de corregir el Bearer Customer: crear, listar, cancelar y operar estados.
- Corregir la validación de sesión del chat de reservas cliente–proveedor. Las rutas existen en Provider API, pero rechazan el JWT Customer con `401 Invalid or expired session`. El chat de dating ya funciona.
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

- Ejecutar regresión E2E en teléfonos físicos Android e iPhone: registro, teclado, permisos denegados, cámara, GPS, mapa, red intermitente, reservas, chat y push.
- Certificar residencial completo cuando backend sincronice anfitriones: búsqueda, reserva, confirmación, chat, ingreso, salida, finalización y cancelación.
- Certificar pagos reales/sandbox, moderación administrativa y eliminación definitiva de cuentas.
- Realizar pruebas de accesibilidad con tamaños de texto grandes y lectores de pantalla.

## Mejoras no bloqueantes

- Agregar disponibilidad horaria avanzada al filtro de paseadores.
- Completar ranking y logros comunitarios server-side.
