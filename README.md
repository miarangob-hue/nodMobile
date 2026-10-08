# NOD Mobile

Aplicación móvil de NOD para clientes y proveedores de servicios de mascotas. Está construida con React Native y Expo y reúne en una sola aplicación los flujos de cliente, proveedor, comunidad, matches entre mascotas y alojamiento residencial.

**Rama de desarrollo:** `dev`

## Versiones móviles

| Plataforma | Versión | Build | Identificador | Estado |
|---|---:|---:|---|---|
| Android | `1.0.26` | `versionCode 28` | `com.nod.mobile` | APK release de QA generado y verificado |
| iOS | `1.0.26` | `buildNumber 1` | `com.nod.mobile` | Configurado en Expo; IPA y distribución pendientes |

Android y iOS comparten el código funcional y la versión pública `1.0.26`. La compilación Android fue validada localmente; la versión iOS todavía debe compilarse y probarse en Xcode/EAS con certificados, provisioning profile, APNs y credenciales OAuth de iOS.

## Estado funcional

### Implementado y verificado

- Registro e inicio de sesión para clientes y proveedores.
- Inicio de sesión nativo con Google para ambos roles, sujeto a la configuración OAuth del entorno.
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

La validación local actual ejecuta **29 pruebas**. La certificación E2E más reciente se realizó el 8 de octubre de 2026 contra los backends desplegados después de la centralización de reservas.

### Matriz E2E — 8 de octubre de 2026

| Área | Resultado | Evidencia |
|---|---|---|
| Login Customer y Provider | Aprobado | Ambas sesiones respondieron `200` |
| Perfil, mascotas y ficha médica | Aprobado | Lectura autenticada `200` |
| Dating y match mutuo | Aprobado con requisito | Discovery omite perfiles sin foto principal; likes mutuos crean match y chat funciona |
| Chat de match entre mascotas | Aprobado | Mensaje creado `201` y recibido por el segundo perfil `200` |
| Comunidad | Aprobado | Publicación `201`, like `200` y comentario `201` |
| Catálogo y reserva normal | Aprobado | Creación, listado, chat y cancelación usan Provider API como fuente única |
| Ciclo interno Provider | Aprobado | Crear, aceptar, iniciar, tracking, pausar, reanudar y completar funcionan |
| Chat de reserva de servicio | Aprobado tras corrección P0 | Customer crea/abre chat, envía con `body`, lista y marca lectura con `200/201` |
| Housing: búsqueda y ficha | Aprobado | `/search-hosting` y `/get-hosting-host` responden `200` con disponibilidad |
| Housing: reserva | Aprobado tras corrección P0 | JWT Customer crea `201`, lista `200` y cancela `200`; el backend infiere la identidad Customer |
| Wallet, compras y notificaciones Customer | Aprobado | Consultas autenticadas `200` |
| Finanzas, documentos y reputación Provider | Aprobado | Balance, rendimiento, payouts, movimientos, bancos, impuestos, documentos y reseñas `200` |
| Seguridad sin sesión | Aprobado | Customer y Provider rechazan recursos privados con `401` |
| Páginas legales | Aprobado | Privacidad, términos y eliminación responden `200` |

La recertificación posterior a la centralización obtuvo **38/38 comprobaciones**: Discovery con foto principal, match y chat, comunidad, reservas normales y Housing funcionan de extremo a extremo. Ambos tipos de reserva crean, abren chat, envían/listan mensajes y cancelan correctamente en Provider API. El backend exige subir la foto social mediante `/pets/:id/social-profile/photos`, `customer_id` en la query de `/get-customer-bookings` y el campo `body` en `/send-chat-message`; la app y la suite usan esos contratos efectivos.

La regresión autenticada Customer → Provider también confirmó creación, visibilidad inmediata, aceptación, inicio, tracking, pausa, reanudación, finalización y consulta posterior sobre el mismo `booking_id`. El export Android de producción local terminó correctamente. La ruta documentada `/pets/:id/social-discovery` no está publicada; Mobile usa el contrato real `GET /discovery/candidates`.

### Limitaciones actuales del backend

- Todas las reservas usan Provider API como fuente única: `/create-booking-request`, `/get-customer-bookings` y `/cancel-booking`; Housing agrega `/search-hosting` y `/get-hosting-host`.
- El proveedor `pabloxp@gmail.com` tiene un perfil residencial activo en Provider API (`NOD Residencial QA`, Providencia, $25.000 por noche).
- Housing y chat de reservas ya aceptan conjuntamente `x-api-key` y JWT Customer. La identidad del cliente se obtiene del token y la app no envía `customer_id` al crear la reserva.
- Customer API retiró `GET/POST /bookings` y `/bookings/:id/cancel`; la app ya no depende de esas rutas.
- FCM/APNs, pagos, payouts y eliminación definitiva de proveedores requieren certificación en entornos productivos o sandbox.

## TO-DO

### P0 — Bloqueos de backend

- [x] Migrar búsqueda, ficha, creación y listado Housing directamente a Provider API.
- [x] Certificar el ciclo backend Housing: búsqueda, detalle, disponibilidad, creación, listado, confirmación y cancelación.
- [x] Validar JWT Customer en `/create-booking-request` y `/cancel-booking` sin confiar en `customer_id` del body.
- [x] Habilitar chat de reservas para Customer: crear, enviar, listar y marcar lectura.
- [x] Crear y operar reservas normales directamente en Provider, conservando un único `booking_id`.
- [ ] Validar cobertura, disponibilidad, servicio y propiedad de recursos al crear/aceptar reservas.
- [ ] Publicar eliminación y anonimización de cuentas proveedor.

### P1 — Integraciones y pruebas

- [ ] Configurar los Client IDs OAuth definitivos y probar Google Login en dispositivos Android/iOS reales.
- [ ] Vincular el proyecto EAS definitivo y configurar FCM para Android y APNs para iOS.
- [ ] Probar notificaciones push externas en teléfonos físicos.
- [ ] Certificar Mercado Pago, reembolsos, Créditos NOD y payouts en sandbox.
- [ ] Ejecutar regresión E2E en dispositivos físicos: permisos, cámara, GPS, mapas, teclado y red intermitente.
- [ ] Probar moderación comunitaria con un usuario que tenga `admin:moderation`.
- [ ] Probar el flujo definitivo de eliminación y anonimización de clientes.
- [ ] Repetir Google Login, push, pagos y permisos en dispositivos físicos con credenciales de producción/sandbox; no son certificables únicamente por HTTP.

### P2 — Producto y publicación

- [ ] Persistir puntos, niveles y medallas comunitarias en backend.
- [ ] Agregar ranking comunitario global, por comuna y período.
- [ ] Incorporar disponibilidad horaria avanzada al filtro de proveedores.
- [ ] Completar accesibilidad y pruebas con lector de pantalla y texto ampliado.
- [ ] Configurar firma Android de producción y generar el AAB de Google Play.
- [ ] Configurar certificados y perfiles de distribución iOS.
- [ ] Completar revisión jurídica y publicar privacidad, términos y eliminación de cuenta.
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

Build remoto con EAS:

```bash
npm run build:android
```

Para publicación se deben configurar `EAS_PROJECT_ID`, Firebase/Google Services y una firma Android de producción en el entorno seguro correspondiente.

## Build iOS

La configuración iOS actual usa:

- Bundle identifier: `com.nod.mobile`.
- Versión: `1.0.26`.
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
