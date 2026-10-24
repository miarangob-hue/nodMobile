# NOD Mobile

Aplicación móvil de NOD para clientes y proveedores de servicios de mascotas. Está construida con React Native y Expo y reúne en una sola aplicación los flujos de cliente, proveedor, comunidad, matches entre mascotas y alojamiento residencial.

**Rama de desarrollo:** `dev`

## Versiones móviles

| Plataforma | Versión | Build | Identificador | Estado |
|---|---:|---:|---|---|
| Android | `1.0.32` | `versionCode 32` | `com.nod.mobile` | APK y AAB release generados; R8 y Google Web Client ID verificados |
| iOS | `1.0.32` | `buildNumber 1` | `com.nod.mobile` | Configurado en Expo; IPA y distribución pendientes |

Android y iOS comparten el código funcional y la versión pública `1.0.32`. La compilación Android fue validada localmente con R8, `mapping.txt` y `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`; la versión iOS todavía debe compilarse y probarse en Xcode/EAS con certificados, provisioning profile, APNs y credenciales OAuth de iOS.

## Estado funcional

### Implementado y verificado

- Registro e inicio de sesión para clientes y proveedores.
- Inicio de sesión nativo con Google para ambos roles; el Web Client ID Android ya está configurado en el entorno local y embebido en los builds release.
- Validación de RUT chileno y onboarding por rol.
- Gestión de mascotas, ficha médica y perfiles sociales.
- Descubrimiento, likes, match mutuo y chat entre mascotas.
- Feed comunitario con publicaciones, fotografías, likes y comentarios.
- Catálogo de servicios y proveedores.
- Creación, consulta y cancelación de reservas de servicios.
- Seguimiento, rutas, evidencias, soporte y notificaciones.
- Búsqueda de alojamientos, detalle y contratos móviles para reservas residenciales.
- Wallet, pagos con Créditos NOD y flujo de Mercado Pago.
- Solicitud autenticada de eliminación de cuentas de cliente.

La validación local actual ejecuta **39 pruebas** y TypeScript sin errores. La certificación E2E fue repetida el **21 de octubre de 2026** contra los backends desplegados, incluyendo registros Customer y Provider completamente nuevos.

### Matriz E2E — 21 de octubre de 2026

| Área | Resultado | Evidencia |
|---|---|---|
| Login Customer y Provider | Aprobado | Ambas sesiones respondieron `200` |
| Registro Provider y carga de onboarding | Aprobado | Cuenta nueva `201`, login `200`, 13 pasos activos, progreso y rechazos `200` |
| Guardado de onboarding Provider | Aprobado | Categoría y datos de paseador guardados y recuperados `200`; Mobile envía `provider_id` en lectura, rechazos y escritura |
| Perfil, mascotas y ficha médica | Aprobado | Lectura autenticada `200` |
| Dating y match mutuo | Aprobado | Dos perfiles nuevos completaron Discovery, likes mutuos, match y chat; el perfil histórico QA fue reparado y Discovery volvió a responder `200` |
| Chat de match entre mascotas | Aprobado | Mensaje creado `201` y recibido por el segundo perfil `200` |
| Comunidad | Aprobado | Publicación `201`, like `200`, comentario `201`, estadísticas, 10 medallas y rankings global/por período `200` |
| Catálogo y reserva normal | Aprobado | Creación, listado, chat y cancelación usan Provider API como fuente única |
| Ciclo interno Provider | Aprobado | Crear, aceptar, iniciar, tracking, pausar, reanudar y completar funcionan |
| Chat de reserva de servicio | Aprobado tras corrección P0 | Customer crea/abre chat, envía con `body`, lista y marca lectura con `200/201` |
| Housing: búsqueda y ficha | Aprobado | `/search-hosting` y `/get-hosting-host` responden `200` con disponibilidad |
| Housing: reserva | Aprobado | Creación `201`, listado/detalle `200`, metadata residencial, chat y cancelación `200/201` usando `hosting_profile_id` y `pet_ids` |
| Reserva normal desde la app | Aprobado | Providencia: búsqueda, detalle, creación QA, listado y apertura del checkout Mercado Pago sandbox |
| Cobertura en reserva normal | Corregido | La app dejó de rechazar localmente zonas por un campo `zones` mal formado; la API queda como fuente única de cobertura |
| Suites E2E adicionales | Pendiente de ejecución | `e2e-authenticated.mjs`, `e2e-customer-community-hosting.mjs` y `e2e-residential-dating.mjs` requieren credenciales/IDs E2E ausentes en este checkout |
| Tarifas Provider unificadas | Backend aprobado | Pablo devuelve Paseador `$15.000` desde `provider_catalog_prices` y Housing `$25.000` desde `hosting_profiles` tanto en `/update-provider-pricing` como en `/get-provider-pricing` |
| Wallet, compras y notificaciones Customer | Aprobado | Consultas autenticadas `200` |
| Pagos Provider + Mercado Pago | Aprobado hasta checkout | Reserva Provider reconocida; estado `unpaid` → checkout `201` → `pending`; falta completar una tarjeta sandbox y validar webhook `paid` |
| Créditos NOD | Aprobado sin saldo | Wallet y paquetes `200`; débito sin saldo responde `402 insufficient_credits`; falta certificar débito exitoso e idempotente con saldo |
| Finanzas, documentos y reputación Provider | Aprobado | Balance, rendimiento, payouts, movimientos, bancos, impuestos, documentos y reseñas `200` |
| Seguridad sin sesión | Aprobado | Customer y Provider rechazan recursos privados con `401` |
| Eliminación de cuenta Provider | Aprobado reversible | Solicitud `201`, consulta pendiente `200`, cancelación `200`; texto de confirmación inválido `400`. No se ejecutó el borrado irreversible de la cuenta QA |
| Páginas legales | Aprobado | Privacidad, términos y eliminación responden `200` |

La regresión Customer repetida el 21 de octubre obtuvo **38/38** con dos cuentas nuevas: registro, login, mascotas, perfiles sociales, Discovery, match/chat, comunidad, Housing con chat y reserva normal con chat aprobaron. Las reservas Housing y normal fueron canceladas al finalizar. La app envía ahora `pet_ids` formalmente en ambos flujos, además de `pet_id` por compatibilidad en reservas normales.

La auditoría general ejecutada el 23 de octubre obtuvo **74/74 contratos activos respondiendo**. Se retiraron del barrido las cinco rutas Housing antiguas de Customer API (`/hosting/*`), deprecadas después de centralizar el flujo en Provider API. La regresión autenticada histórica aprobó **15/15** lecturas de Customer y Provider; no se pudo repetir en esta ejecución porque faltan sus credenciales E2E. El registro Provider nuevo aprobó **10/10**. Los `401/403/404` del smoke con IDs inválidos o sin JWT son respuestas negativas esperadas y confirman control de acceso.

La ejecución verificable de este checkout quedó así: `npm run validate` **39/39**; `e2e-provider-registration.mjs` **10/10**; `e2e-two-customers.mjs` **38/38**; `audit-backend-contracts.mjs` **74/74**; `npm run test:api` respondió correctamente al ejecutarse con red autorizada. `e2e-authenticated.mjs`, `e2e-customer-community-hosting.mjs` y `e2e-residential-dating.mjs` no arrancaron porque faltan sus credenciales/IDs E2E. La auditoría adicional detectó un `400 database_error` en actualización de perfil Provider, que queda pendiente de corregir.

El smoke Android instaló `NOD-1.0.32-android-v32.apk` en el AVD `NOD_Pixel`, confirmó `versionName 1.0.32`, `versionCode 32` y el arranque de `com.nod.mobile`. La revisión visual completó login Customer, búsqueda en Providencia, reserva, detalle y apertura del checkout Mercado Pago sandbox con el concepto `Casa NOD con patio en Providencia` por `$10.000`; el formulario de tarjeta cargó sin confirmar el pago. El Web Client ID está incluido; aún falta certificar OAuth con el cliente Android de producción y un dispositivo físico.

Los exports JavaScript Android e iOS terminaron correctamente. Esto valida el bundle compartido, pero no sustituye un IPA firmado ni pruebas iOS en simulador/dispositivo. Moderación rechazó correctamente al usuario Customer con `403`; falta una sesión que tenga `admin:moderation` para certificar las acciones administrativas.

La regresión autenticada Customer → Provider también confirmó creación, visibilidad inmediata, aceptación, inicio, tracking, pausa, reanudación, finalización y consulta posterior sobre el mismo `booking_id`. El export Android de producción local terminó correctamente. La ruta documentada `/pets/:id/social-discovery` no está publicada; Mobile usa el contrato real `GET /discovery/candidates`.

La certificación de pagos confirmó que `nod-api` reconoce las reservas de Provider. `GET /payments/bookings/:id` devolvió `unpaid`, `POST /payments/checkout` creó una preferencia sandbox con `init_point` y `sandbox_init_point`, y la consulta posterior devolvió `pending`. La prueba visual en Android abrió el checkout `x.mercadopago.cl` en sandbox y el formulario de tarjeta. `POST /wallet/topups` también creó una preferencia sandbox `201`. Mobile normaliza estos contratos y envía `idempotency_key` al pagar con créditos. No se realizó ningún cargo real; queda pendiente completar una tarjeta sandbox para verificar webhook, transición a `paid`, acreditación de créditos y reembolsos.

La gamificación persistente también quedó recertificada: después de publicar, reaccionar y comentar, la cuenta E2E reportó 13 puntos, nivel Cachorro, una medalla y posición 2; el catálogo devolvió 10 medallas y los rankings global, mensual, semanal y por comuna respondieron `200`.

### Limitaciones actuales del backend

- Todas las reservas usan Provider API como fuente única: `/create-booking-request`, `/get-customer-bookings` y `/cancel-booking`; Housing agrega `/search-hosting` y `/get-hosting-host`.
- El proveedor `pabloxp@gmail.com` tiene un perfil residencial activo en Provider API (`NOD Residencial QA`, Providencia, $25.000 por noche).
- La unificación de tarifas de Pablo quedó operativa: `/update-provider-pricing` y `/get-provider-pricing` devuelven Paseador (`$15.000`, `provider_catalog_prices`) y Alojamiento/Guardería (`$25.000`, `hosting_profiles`). Mobile todavía debe consumir `/get-provider-pricing` en el detalle Customer y permitir edición `POST/PATCH` en Provider.
- El proxy `contract-api` indicado en el informe de tarifas no está disponible como JSON en la URL publicada: la URL Lovable entrega HTML y `/contract-api` en la API Customer actual responde `404`. Mobile debe usar por ahora el endpoint Provider directo ya verificado.
- Housing y chat de reservas ya aceptan conjuntamente `x-api-key` y JWT Customer. La identidad del cliente se obtiene del token y la app no envía `customer_id` al crear la reserva.
- Customer API retiró `GET/POST /bookings` y `/bookings/:id/cancel`; la app ya no depende de esas rutas.
- Payments ya consulta las reservas de Provider: Mobile normaliza `init_point`, `sandbox_init_point` y `payment_status`, y usa idempotencia al pagar con Créditos NOD.
- Las reservas envían ubicación estructurada (`address`, `commune`, `city`, `latitude`, `longitude`) y conservan el fallback desde `notes` solo para registros históricos.
- Provider dispone en Ajustes del flujo dedicado para programar, consultar, cancelar y confirmar la eliminación de cuenta.
- El onboarding Provider vuelve a enviar el `provider_id` exigido por el backend al consultar progreso/rechazos y al guardar pasos. Los campos de clave Customer y Provider usan teclado seguro en Android y permanecen enmascarados.
- FCM/APNs, confirmación final de pagos sandbox, payouts y la ejecución irreversible de eliminación requieren certificación con servicios externos o cuentas desechables.

## TO-DO

### P0 — Bloqueos de backend

- [x] Migrar búsqueda, ficha, creación y listado Housing directamente a Provider API.
- [x] Recertificar Housing después del despliegue: búsqueda, detalle, creación, listado, metadata residencial, chat, lectura y cancelación aprobados.
- [x] Validar JWT Customer en `/create-booking-request` y `/cancel-booking` sin confiar en `customer_id` del body.
- [x] Habilitar chat de reservas para Customer: crear, enviar, listar y marcar lectura.
- [x] Crear y operar reservas normales directamente en Provider, conservando un único `booking_id`.
- [x] Validar propiedad, fechas futuras y conflictos de disponibilidad al crear/cancelar reservas.
- [x] Rechazar `service_id` inexistentes y validar que el servicio pertenezca realmente al proveedor (`404 service_not_found`).
- [x] Validar cobertura geográfica (`422 out_of_coverage`) y persistir dirección, comuna, ciudad y coordenadas en creación/listados.
- [x] Publicar e integrar solicitud, consulta, cancelación y confirmación de eliminación de cuentas Provider.

### P1 — Integraciones y pruebas

- [x] Configurar `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` y verificarlo dentro del APK/AAB `1.0.32`.
- [ ] Configurar los clientes OAuth Android/iOS definitivos, registrar la SHA de producción y probar Google Login en dispositivos reales.
- [ ] Vincular el proyecto EAS definitivo y configurar FCM para Android y APNs para iOS.
- [ ] Probar notificaciones push externas en teléfonos físicos.
- [ ] Completar Mercado Pago sandbox con tarjeta de prueba hasta webhook `paid`, acreditar Créditos NOD, comprobar débito idempotente con saldo, reembolsos y payouts.
- [ ] Corregir y repetir la actualización de perfil Provider que respondió `400 database_error` (`Cannot coerce the result to a single JSON object`).
- [ ] Ejecutar regresión E2E en dispositivos físicos: permisos, cámara, GPS, mapas, teclado y red intermitente.
- [ ] Probar moderación comunitaria con un usuario que tenga `admin:moderation`.
- [x] Reparar el perfil social histórico de QA y confirmar `/discovery/candidates` con respuesta `200`.
- [x] Probar creación, consulta y cancelación reversible de eliminación de cliente (`202`, `200`, luego `404` sin solicitud activa).
- [ ] Probar la ejecución definitiva de eliminación y anonimización de cliente en una cuenta desechable.
- [x] Probar el ciclo reversible Provider: solicitud `201`, consulta pendiente `200`, cancelación `200` y cuenta nuevamente activa.
- [ ] Ejecutar la confirmación irreversible Provider en una cuenta desechable; la validación de texto incorrecto ya responde `400 confirmation_required`.
- [ ] Repetir Google Login, push, pagos y permisos en dispositivos físicos con credenciales de producción/sandbox; no son certificables únicamente por HTTP.

### P2 — Producto y publicación

- [x] Persistir puntos, niveles y medallas comunitarias en backend e integrarlos en Mobile.
- [x] Agregar ranking comunitario global, por comuna y período; Mobile permite cambiar entre histórico, mes y semana.
- [ ] Incorporar disponibilidad horaria avanzada al filtro de proveedores.
- [ ] Completar accesibilidad y pruebas con lector de pantalla y texto ampliado.
- [x] Configurar upload key Android de producción y generar el AAB `1.0.30 (30)` para Google Play.
- [x] Generar APK/AAB `1.0.32 (32)` con R8, `mapping.txt` y Web Client ID; falta cargar el AAB en la pista interna de Google Play.
- [ ] Configurar certificados y perfiles de distribución iOS.
- [ ] Completar revisión jurídica e identidad legal de privacidad, términos y eliminación; las páginas públicas ya responden `200`.
- [ ] Preparar capturas, fichas de tienda, Data Safety y Privacy Nutrition Labels.

El detalle ampliado se mantiene en [`TODO.md`](TODO.md) y [`docs/PENDIENTES.md`](docs/PENDIENTES.md).

## Requisitos

- Node.js compatible con `package.json`.
- npm.
- Android Studio/Android SDK para compilación local Android.
- Xcode para compilación local iOS.
- Cuenta de Expo/EAS para builds remotos.

## Configuración

```bash
npm install
cp .env.example .env
```

Completar `.env` con las credenciales del entorno. `.env`, llaves, certificados y archivos de servicios nativos están excluidos de Git.

Para pruebas E2E residenciales autenticadas se requieren además, solo en el entorno local:

```env
NOD_E2E_PROVIDER_EMAIL=
NOD_E2E_PROVIDER_PASSWORD=
```

## Ejecución y validación

```bash
npm start
npm run android
npm run ios
npm run validate
```

`npm run validate` ejecuta TypeScript y las pruebas automatizadas. GitHub Actions repite la validación y genera un export Android en los cambios a `dev` o `main`.

## Build Android

Build local release:

```bash
cd android
ANDROID_HOME=/ruta/al/android-sdk \
ANDROID_SDK_ROOT=/ruta/al/android-sdk \
JAVA_HOME=/ruta/al/jdk-17 \
./gradlew assembleRelease
```

El APK queda en `android/app/build/outputs/apk/release/app-release.apk`. Los APK y demás binarios de build no se versionan en Git. El release local actual usa una clave de pruebas y no debe publicarse en Google Play.

Build de producción para Google Play mediante Android App Bundle:

```bash
cd android
NOD_UPLOAD_STORE_FILE=/ruta/segura/nod-play-upload.jks \
NOD_UPLOAD_STORE_PASSWORD='<secreto>' \
NOD_UPLOAD_KEY_ALIAS=nod-upload \
NOD_UPLOAD_KEY_PASSWORD='<secreto>' \
ANDROID_HOME=/ruta/al/android-sdk \
ANDROID_SDK_ROOT=/ruta/al/android-sdk \
JAVA_HOME=/ruta/al/jdk-17 \
./gradlew bundleRelease
```

El `.aab` queda en `android/app/build/outputs/bundle/release/app-release.aab`. Con R8 activado, `mapping.txt` queda en `android/app/build/outputs/mapping/release/mapping.txt` y también se incluye en los metadatos del AAB. La upload key y sus contraseñas deben mantenerse fuera de Git, respaldarse en un gestor seguro y reutilizarse para las próximas versiones.

Los artefactos locales recién generados también están copiados en `dist/NOD-1.0.32-android-v32.apk`, `dist/NOD-1.0.32-android-v32-play.aab` y `dist/NOD-1.0.32-android-v32-mapping.txt`; esta verificación local usa la clave debug. Para publicar, se debe regenerar con la upload key `nod-upload`; el APK declara `versionName 1.0.32`, `versionCode 32`, `minSdk 24` y `targetSdk 36`. Google Play App Signing debe estar habilitado para la publicación.

Build remoto con EAS:

```bash
npm run build:android
```

Para publicación se deben configurar `EAS_PROJECT_ID`, Firebase/Google Services y una firma Android de producción en el entorno seguro correspondiente.

## Build iOS

La configuración iOS actual usa:

- Bundle identifier: `com.nod.mobile`.
- Versión: `1.0.32`.
- Build number: `1`.
- Compatibilidad con iPhone y iPad.
- Permisos declarados para cámara y ubicación.

Ejecución local en simulador o dispositivo de desarrollo:

```bash
npm run ios
```

Build remoto con EAS:

```bash
npm run build:ios
```

Antes de generar el IPA distribuible se deben configurar el Apple Team, certificado de distribución, provisioning profile, APNs, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` y el proyecto EAS definitivo. Aún no se ha certificado un build iOS en dispositivo físico ni se ha generado un IPA de producción.

## Estructura

- `src/api`: clientes y contratos de API.
- `src/screens`: pantallas de clientes, proveedores, registro y onboarding.
- `src/components`: componentes visuales compartidos.
- `src/services`: autenticación Google, notificaciones y servicios del dispositivo.
- `src/storage`: persistencia local y sesión.
- `scripts`: auditorías y pruebas E2E contra backend.
- `docs`: auditorías, pendientes, integraciones y borradores legales.
- `android`: proyecto Android nativo.

## Seguridad

- No versionar `.env`, tokens, contraseñas, llaves privadas, certificados, APK o AAB.
- Usar `.env.example` únicamente como plantilla sin valores secretos.
- Mantener permisos mínimos en las API keys móviles.
- Rotar credenciales compartidas durante QA antes de publicar.
