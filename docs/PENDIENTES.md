# Pendientes de NOD Mobile

Última actualización: 20 de octubre de 2026. Código actual: `1.0.31` (`versionCode 31`).

## Resumen ejecutivo

La funcionalidad principal está operativa: registro y login, mascotas, comunidad, match y chat, reservas normales, Housing y chat de reservas aprobaron las pruebas automatizadas y E2E. El trabajo pendiente se concentra en preparar una compilación publicable, configurar integraciones externas y validar en dispositivos reales.

Orden recomendado:

1. **P0 — Antes de entregar una nueva versión:** proteger credenciales, generar Android `1.0.31 (31)` y completar la configuración mínima de Google Play.
2. **P1 — Antes de abrir la app al público:** terminar pagos, Google OAuth, push, documentos legales y pruebas físicas Android.
3. **P1 iOS — Antes de publicar en App Store:** certificados, IPA, OAuth/APNs y pruebas físicas iPhone.
4. **P2 — Después de estabilizar el lanzamiento:** accesibilidad avanzada, moderación, disponibilidad horaria y pruebas destructivas controladas.

## P0 — Bloqueantes de la próxima entrega Android

### 1. Proteger y rotar credenciales

**Qué falta:** sustituir claves de desarrollo por secretos productivos y rotar cualquier clave que haya sido compartida durante QA.

**Por qué es prioritario:** una compilación pública no debe contener credenciales reutilizables o expuestas.

**Terminado cuando:** las claves productivas se carguen desde el mecanismo seguro del build, las anteriores estén revocadas y ningún secreto aparezca en Git o documentación pública.

### 2. Subir y probar Android `1.0.31 (31)`

**Estado actual:** el APK y AAB `1.0.31 (31)` ya fueron generados y verificados con la upload key. El APK declara `minSdk 24` y `targetSdk 36`.

**Qué falta:** instalar el APK v31 en emulador/dispositivo para el smoke final y cargar el AAB v31 en la pista interna de Google Play.

**Terminado cuando:** el APK v31 se instale y abra correctamente y el AAB v31 quede aceptado en una pista interna de Google Play.

### 3. Completar la ficha técnica mínima de Google Play

**Qué falta:** habilitar Play App Signing, crear o terminar la ficha, cargar ícono/capturas, descripción, clasificación de contenido, Data Safety, correo de soporte y URLs legales.

**Terminado cuando:** Google Play permita publicar una release en prueba interna sin advertencias bloqueantes.

## P1 — Antes de producción pública

### 4. Certificar pagos de extremo a extremo

**Estado actual:** la consulta devuelve `unpaid`, Checkout Pro crea la preferencia con `201` y luego queda `pending`. La recarga de Créditos NOD también crea una preferencia.

**Qué falta:** completar un pago con tarjeta sandbox, recibir el webhook válido, comprobar la transición a `paid` y verificar que no se duplique el cobro. Para Créditos NOD falta acreditar saldo de prueba y validar débito, idempotencia, reembolso y payout.

**Dependencia:** credenciales y usuarios sandbox de Mercado Pago, webhook accesible y saldo de prueba.

**Terminado cuando:** un pago completo cambie de `unpaid` a `pending` y finalmente a `paid`, y un reintento conserve un solo cobro.

### 5. Configurar Google Login real

**Estado actual:** el botón y el flujo móvil existen, pero no se puede completar OAuth sin los Client IDs.

**Qué falta:** configurar los clientes Web, Android e iOS, registrar SHA-1/SHA-256 de la firma Android y validar login y registro en builds firmados.

**Terminado cuando:** un usuario nuevo y uno existente puedan autenticarse con Google desde Android; para cerrar iOS también debe aprobar en iPhone.

### 6. Completar notificaciones push

**Estado actual:** Mobile implementa permisos, canal Android, registro del token por rol, baja al cerrar sesión y navegación desde una notificación.

**Qué falta:** vincular el proyecto EAS definitivo, configurar FCM y APNs, desplegar/probar el worker de envío y verificar tokens reales.

**Terminado cuando:** una reserva y un mensaje generen notificaciones visibles en Android y iPhone físicos, y al tocarlas se abra la pantalla correcta.

### 7. Cerrar documentación legal

**Qué falta:** completar razón social, RUT, domicilio, contacto, jurisdicción, comisiones, cancelaciones, tratamiento de datos y condiciones de pago; obtener revisión jurídica y publicar las URLs definitivas.

**Terminado cuando:** privacidad, términos y eliminación estén publicados con identidad legal definitiva y enlazados desde ambas tiendas y la app.

### 8. Probar Android en dispositivos físicos

**Qué falta:** registro Customer/Provider, teclado, cámara, GPS, mapa, permisos aceptados/denegados, red intermitente, reserva normal, Housing, ambos chats, pago y push.

**Terminado cuando:** la matriz pase en al menos un Android soportado y las fallas recuperables muestren mensajes claros sin cerrar la app.

## P1 — Publicación iOS

### 9. Preparar y certificar iOS

**Qué falta:** crear certificados y provisioning profiles, configurar App Store Connect, generar un IPA, habilitar Google OAuth y APNs, y ejecutar la regresión en simulador y iPhone físico.

**Aclaración:** el export JavaScript de iOS está aprobado, pero eso no certifica permisos nativos, firma, cámara, ubicación, OAuth, push ni distribución.

**Terminado cuando:** el IPA se distribuya por TestFlight y la matriz crítica pase en un iPhone real.

## P2 — Importantes, pero no bloquean una prueba interna

### 10. Integrar las tarifas unificadas en Mobile

El backend ya quedó corregido y fue verificado el 20 de octubre. Para `pabloxp@gmail.com`, tanto `GET /update-provider-pricing` como `GET /get-provider-pricing` responden `200` con Paseador a `$15.000` desde `provider_catalog_prices` y Alojamiento/Guardería a `$25.000` desde `hosting_profiles`.

**Qué falta en Mobile:** consultar `/get-provider-pricing` en el detalle Customer, representar `item_type`, `source`, `catalog_item_id`, `hosting_profile_id` y recargos, permitir edición Provider mediante `POST/PATCH /update-provider-pricing`, y omitir el precio en Housing para que backend calcule el total oficial.

**Observación de backend:** el proxy `contract-api` documentado no respondió como API durante QA. La URL Lovable devolvió HTML y `/contract-api` sobre la API Customer actual respondió `404`; hasta corregirlo, Mobile puede consumir Provider directamente.

### 11. Moderación administrativa

El control de acceso funciona: una cuenta Customer recibe `403 forbidden`. Falta una cuenta con permiso `admin:moderation` para probar resolución de reportes, suspensión y restauración.

### 12. Eliminación definitiva de cuentas

Los ciclos reversibles Customer y Provider están aprobados: solicitar, consultar y cancelar. Falta comprobar eliminación/anonimización definitiva usando cuentas desechables; nunca debe utilizarse la cuenta QA operativa de Pablo.

### 13. Accesibilidad y resistencia

Falta probar lector de pantalla, tamaños de texto grandes, contraste, navegación por foco, permisos denegados y conectividad intermitente.

### 14. Mejoras de producto

- Agregar disponibilidad horaria avanzada al filtro de paseadores.
- Completar la lectura y administración de precios unificados desde Mobile; backend ya expone datos consistentes.

## Funcionalidad ya certificada

No debe confundirse esta sección con trabajo pendiente:

- **Customer E2E del 20-10: 38/38.** Dos cuentas nuevas completaron registro, login, mascotas, perfiles sociales, Discovery, match/chat, comunidad, Housing/chat y reserva normal/chat. Las reservas de prueba fueron canceladas.
- **Provider nuevo del 20-10: 10/10.** Registro, login, 13 pasos activos, progreso, rechazos, guardado de categoría/paseador y persistencia.
- **Lecturas autenticadas del 20-10: 15/15.** Las cuentas QA Customer y Provider accedieron correctamente a sus recursos; Pablo devolvió dos tarifas consolidadas.
- **Contratos activos del 20-10: 74/74.** Las cinco rutas `/hosting/*` antiguas de Customer API quedaron fuera porque están deprecadas; Mobile usa Provider API.
- **Tarifas unificadas:** los dos endpoints Provider devolvieron las mismas dos tarifas, con su fuente efectiva y el perfil Housing correspondiente.
- **Validación local: 39/39.** TypeScript y pruebas automatizadas sin errores.
- **Housing:** búsqueda, detalle, creación `201`, listado, metadata residencial, chat, lectura y cancelación aprobados. Mobile envía `hosting_profile_id` y `pet_ids`.
- **Reservas normales:** creación, listado, chat y cancelación aprobados sobre Provider API.
- **Ciclo Provider:** aceptar, iniciar, registrar GPS, pausar, reanudar, completar y consultar detalle, timeline, ETA, ruta y fotos.
- **Comunidad:** publicaciones, likes, comentarios, estadísticas, diez medallas y rankings global, mensual, semanal y por comuna.
- **Seguridad funcional:** servicio inexistente `404`, fuera de cobertura `422`, fecha pasada `400`, conflicto horario `409` y cancelación ajena `403`.
- **Android v30:** APK instalado y ejecutado en el emulador `NOD_Pixel`. Esta prueba no reemplaza el nuevo build v31 ni las pruebas en dispositivo físico.

## Próxima secuencia de trabajo recomendada

1. Rotar/configurar secretos productivos.
2. Instalar y ejecutar el smoke de `1.0.31 (31)`.
3. Subir el AAB v31 a prueba interna de Google Play.
4. Completar Google OAuth y FCM en Android.
5. Ejecutar la matriz física Android.
6. Completar pago sandbox y webhook.
7. Cerrar ficha, Data Safety y documentos legales.
8. Preparar certificados, APNs, IPA y TestFlight para iOS.
