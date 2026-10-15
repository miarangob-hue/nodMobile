# Pendientes de NOD Mobile

Última actualización: 14 de octubre de 2026. Versión móvil: 1.0.27 (`versionCode 29`).

## Backend bloqueante

- Housing y chat ya validan JWT Customer junto con `x-api-key`. La app fue ajustada para inferir identidad al crear, enviar `customer_id` solo en la query de listado y usar `body` como contenido del mensaje.
- Reservas normales y Housing ya usan Provider como fuente única. Creación, listado, chat y cancelación de reserva normal fueron recertificados E2E; en Housing solo búsqueda y detalle están aprobados porque la creación continúa bloqueada por la regresión descrita abajo.
- Validación de servicio recertificada: UUID inexistente responde `404 service_not_found`.
- Cobertura geográfica recertificada: una reserva en Antártica para un proveedor de Providencia responde `422 out_of_coverage`.
- Ubicación recertificada: dirección, `commune`, ciudad y coordenadas se conservan en creación y listado, también dentro de `location`. Mobile dejó de serializar estos campos en `notes`.
- La validación de fechas y propiedad sí está activa: fecha pasada `400`, horario ocupado `409` y cancelación de reserva ajena `403`.
- Eliminación Provider integrada: solicitar, consultar, cancelar y confirmar. El ciclo reversible pasó E2E y la cuenta QA quedó activa; falta ejecutar la confirmación irreversible solo en una cuenta desechable.
- Regresión Housing tras el despliegue: búsqueda y detalle responden `200`, pero el UUID de servicio anterior devuelve `404 service_not_found`; el servicio de alojamiento del catálogo también devuelve `404`, y el contrato con `hosting_profile_id` devuelve `422 out_of_coverage` aunque el informe declara que Housing está exento. Mobile ya envía `hosting_profile_id` y la ubicación del anfitrión.
- El proveedor QA `pabloxp@gmail.com` mantiene su perfil Housing activo, pero actualmente devuelve cero precios/servicios asociados. La validación estricta impide repetir con esa cuenta el ciclo operativo hasta restaurar la asociación; las reservas normales y pagos se certificaron con una combinación válida del catálogo.

## Notificaciones e integraciones

- Vincular el proyecto EAS definitivo y configurar Firebase FCM para Android y APNs para iPhone.
- Probar el worker protegido de envío push con credencial interna y teléfonos físicos Android/iPhone.
- Completar una tarjeta sandbox de Mercado Pago hasta webhook y estado `paid`. Checkout y recarga ya crean preferencias `201` y quedan `pending`.
- Acreditar saldo sandbox para certificar pago con Créditos NOD, reintento idempotente sin doble débito, reembolso y payout.

## Comunidad

- Puntos, niveles y diez medallas ya se persisten en backend. Mobile consume `/community/stats` y `/community/badges` y refresca el progreso después de publicaciones, comentarios y likes.
- Ranking integrado mediante `/community/ranking`; Mobile muestra histórico, mensual y semanal, y el backend admite filtro por comuna.
- Probar moderación completa con una sesión que tenga permiso `admin:moderation`.
- El control de acceso fue comprobado: una sesión Customer recibe `403 forbidden`; no hay credenciales administrativas configuradas para probar resolución, suspensión y restauración.

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

- Resultado funcional previo: **38/38**. Recertificación posterior al despliegue del 14-10: **30/32**; fallan exclusivamente creación y visibilidad Housing porque no se genera la reserva. Registro, mascotas, Discovery, match/chat, comunidad, reserva normal y chat normal siguen aprobados.
- Ciclo Provider aprobado: crear, visualizar, aceptar, iniciar, registrar GPS, pausar, reanudar, completar y consultar detalle, timeline, ETA, ruta y fotos.
- Auditoría de contratos: **74/79** responden. Los cinco ausentes corresponden a `/hosting/*` de Customer API, retirados y reemplazados por las rutas Provider que Mobile utiliza y que pasaron E2E.
- Regresión autenticada de lectura: **15/15** consultas Customer/Provider respondieron correctamente.
- Perfil histórico QA reparado: faltaba publicar el perfil social; después de crear perfil y foto principal, Discovery respondió `200` con cinco candidatos.
- Gamificación recertificada: estadísticas, catálogo de 10 medallas y rankings global/mensual/semanal/por comuna respondieron `200`; la actividad E2E persistió 13 puntos, nivel Cachorro, una medalla y posición 2.
- Validación local aprobada: TypeScript sin errores y **37/37** pruebas automatizadas.
- Eliminación Provider reversible aprobada: solicitud `201`, consulta `200`, cancelación `200` y cuenta activa; confirmación inválida `400`. Falta el borrado irreversible con una cuenta desechable.
- Pagos Provider: consulta inicial `unpaid`, checkout sandbox `201`, consulta posterior `pending`; falta completar pago sandbox y comprobar `paid` por webhook.
- Eliminación Customer reversible aprobada: crear, consultar y cancelar. Falta ejecutar eliminación/anonimización definitiva en una cuenta desechable.
- Ejecutar regresión E2E en teléfonos físicos Android e iPhone: registro, teclado, permisos denegados, cámara, GPS, mapa, red intermitente, reservas, chat y push.
- Completar una regresión residencial desde dispositivo físico, incluyendo UI, confirmación del proveedor, chat y cancelación.
- Certificar pago sandbox final, moderación administrativa y eliminación definitiva de cuentas.
- Realizar pruebas de accesibilidad con tamaños de texto grandes y lectores de pantalla.
- Smoke Android v29 aprobado en `NOD_Pixel`: `NOD-1.0.27-android-v29.apk` se instaló, reportó `versionName 1.0.27`/`versionCode 29` y arrancó `com.nod.mobile`. Onboarding, Login, selector de rol, teclado y formulario ya tenían smoke visual aprobado; Google mantiene el bloqueo esperado por Client ID ausente.
- Exports JavaScript Android e iOS aprobados; siguen pendientes IPA firmado y pruebas iOS nativas por ausencia de certificados, provisioning y OAuth/APNs.

## Mejoras no bloqueantes

- Agregar disponibilidad horaria avanzada al filtro de paseadores.
