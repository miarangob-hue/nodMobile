# Pendientes de NOD Mobile

Última actualización: 18 de octubre de 2026. Versión móvil: 1.0.30 (`versionCode 30`).

## Backend bloqueante

- Housing y chat ya validan JWT Customer junto con `x-api-key`. La app fue ajustada para inferir identidad al crear, enviar `customer_id` solo en la query de listado y usar `body` como contenido del mensaje.
- Reservas normales y Housing usan Provider como fuente única. Ambos flujos aprobaron creación, listado, chat y cancelación E2E.
- Validación de servicio recertificada: UUID inexistente responde `404 service_not_found`.
- Cobertura geográfica recertificada: una reserva en Antártica para un proveedor de Providencia responde `422 out_of_coverage`.
- Ubicación recertificada: dirección, `commune`, ciudad y coordenadas se conservan en creación y listado, también dentro de `location`. Mobile dejó de serializar estos campos en `notes`.
- La validación de fechas y propiedad sí está activa: fecha pasada `400`, horario ocupado `409` y cancelación de reserva ajena `403`.
- Eliminación Provider integrada: solicitar, consultar, cancelar y confirmar. El ciclo reversible pasó E2E y la cuenta QA quedó activa; falta ejecutar la confirmación irreversible solo en una cuenta desechable.
- Housing recertificado tras el despliegue: `hosting_profile_id` crea `201`; listado, detalle, metadata (`is_hosting`, `hosting_profile`, dirección y tarifa), chat y cancelación responden `200/201`. Mobile envía `pet_ids` formalmente.
- El proveedor QA `pabloxp@gmail.com` aparece en Customer API asociado a Paseador ($15.000) y Alojamiento/Guardería; su perfil Housing expone Providencia y coordenadas. Queda una discrepancia de gestión: `/update-provider-pricing` responde `200` con cero elementos.
- Onboarding Provider corregido: Mobile incluye `provider_id` en progreso, rechazos y guardado. Una cuenta nueva aprobó 10/10 en registro, login, carga de 13 pasos, guardado de categoría/paseador y persistencia. Falta la revisión final con documentos reales.
- Los campos de clave y confirmación de los registros Customer/Provider ya no usan `visible-password` en Android y permanecen enmascarados.

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
- Upload key Android creada y AAB `1.0.30 (30)` firmado/verificado. Ese bundle precede al ajuste final de `pet_ids`; generar `1.0.31 (31)` antes de la próxima publicación. Respaldar el keystore y su contraseña y habilitar Play App Signing.
- Configurar certificados y perfiles de distribución iOS y generar el IPA.
- Crear las aplicaciones en Google Play Console y App Store Connect.
- Preparar capturas Android/iPhone, descripción, categoría, clasificación de contenido, soporte y material gráfico.
- Completar Data Safety de Google Play y Privacy Nutrition Labels de Apple.
- Publicar URLs públicas definitivas de privacidad, términos y eliminación de cuenta.
- Completar razón social, RUT, domicilio, contacto, jurisdicción, comisiones, cancelaciones y condiciones de pago en los documentos legales; obtener revisión jurídica.

## Pruebas finales

- Regresión Customer del 18-10: **38/38** con dos cuentas nuevas; registro, login, mascotas, Discovery, match/chat, comunidad, Housing/chat y reserva normal/chat aprobaron. Las reservas creadas fueron canceladas al finalizar.
- Regresión Provider del 18-10: **10/10** desde una cuenta nueva hasta persistencia de onboarding. No se envió a revisión final por ausencia de documentos reales.
- Ciclo Provider aprobado: crear, visualizar, aceptar, iniciar, registrar GPS, pausar, reanudar, completar y consultar detalle, timeline, ETA, ruta y fotos.
- Auditoría de contratos activos del 18-10: **74/74** responden. Las cinco rutas `/hosting/*` antiguas de Customer API fueron retiradas del barrido porque están deprecadas y Mobile usa las rutas Provider recertificadas.
- Regresión autenticada de lectura: **15/15** consultas Customer/Provider respondieron correctamente.
- Perfil histórico QA reparado: faltaba publicar el perfil social; después de crear perfil y foto principal, Discovery respondió `200` con cinco candidatos.
- Gamificación recertificada: estadísticas, catálogo de 10 medallas y rankings global/mensual/semanal/por comuna respondieron `200`; la actividad E2E persistió 13 puntos, nivel Cachorro, una medalla y posición 2.
- Validación local aprobada: TypeScript sin errores y **39/39** pruebas automatizadas.
- Eliminación Provider reversible aprobada: solicitud `201`, consulta `200`, cancelación `200` y cuenta activa; confirmación inválida `400`. Falta el borrado irreversible con una cuenta desechable.
- Pagos Provider: consulta inicial `unpaid`, checkout sandbox `201`, consulta posterior `pending`; falta completar pago sandbox y comprobar `paid` por webhook.
- Eliminación Customer reversible aprobada: crear, consultar y cancelar. Falta ejecutar eliminación/anonimización definitiva en una cuenta desechable.
- Ejecutar regresión E2E en teléfonos físicos Android e iPhone: registro, teclado, permisos denegados, cámara, GPS, mapa, red intermitente, reservas, chat y push.
- Completar una regresión residencial desde dispositivo físico, incluyendo UI, confirmación del proveedor, chat y cancelación.
- Certificar pago sandbox final, moderación administrativa y eliminación definitiva de cuentas.
- Realizar pruebas de accesibilidad con tamaños de texto grandes y lectores de pantalla.
- Smoke Android v30 aprobado en `NOD_Pixel`: `NOD-1.0.30-android-v30.apk` se instaló, reportó `versionName 1.0.30`/`versionCode 30` y arrancó `com.nod.mobile`. Incluye la corrección del onboarding Provider; Google mantiene el bloqueo esperado por Client ID ausente.
- Exports JavaScript Android e iOS aprobados; siguen pendientes IPA firmado y pruebas iOS nativas por ausencia de certificados, provisioning y OAuth/APNs.

## Mejoras no bloqueantes

- Agregar disponibilidad horaria avanzada al filtro de paseadores.
