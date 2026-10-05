# NOD Mobile

Aplicación móvil de NOD para clientes y proveedores de servicios de mascotas. Está construida con React Native y Expo y reúne en una sola aplicación los flujos de cliente, proveedor, comunidad, matches entre mascotas y alojamiento residencial.

**Versión actual:** `1.0.26` (`versionCode 28`)<br>
**Rama de desarrollo:** `dev`

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

La última prueba E2E con dos perfiles cliente confirmó login, creación de mascotas, perfiles sociales, match mutuo, entrega de mensajes, publicación comunitaria, reacciones, comentarios y creación/cancelación de una reserva de servicio. La validación local actual ejecuta **26 pruebas**.

### Limitaciones actuales del backend

- `GET /hosting/search` funciona, pero actualmente no devuelve anfitriones activos. Por esto todavía no se puede certificar una reserva residencial completa.
- El perfil proveedor `pabloxxp@gmail.com` aún debe publicarse/sincronizarse como anfitrión residencial. Esta operación requiere una sesión Provider válida o credenciales E2E configuradas localmente.
- El chat de reservas de servicios rechaza el JWT del cliente con `401 Invalid or expired session`. El chat de matches entre mascotas sí funciona.
- La identidad Provider y la identidad Customer viven en proyectos separados; el backend debe permitir que ambos roles operen sobre la misma reserva residencial.
- FCM/APNs, pagos, payouts y eliminación definitiva de proveedores requieren certificación en entornos productivos o sandbox.

## TO-DO

### P0 — Bloqueos de backend

- [ ] Publicar y sincronizar un `hosting_profile` activo para `pabloxxp@gmail.com`.
- [ ] Certificar Housing E2E: búsqueda, detalle, reserva, listado, confirmación y cancelación.
- [ ] Vincular la identidad del proveedor entre Provider API y Customer API para operar alojamientos.
- [ ] Permitir que el chat de reservas valide tanto JWT de cliente como JWT de proveedor, o publicar rutas equivalentes en `nod-api`.
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
