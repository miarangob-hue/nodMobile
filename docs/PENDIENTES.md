# Pendientes de NOD Mobile

Última actualización: 23 de octubre de 2026. Código actual: `1.0.32` (`versionCode 32`).

## Resumen ejecutivo

La funcionalidad principal está operativa: registro y login, mascotas, comunidad, match y chat, reservas normales, Housing y chat de reservas aprobaron las pruebas automatizadas y E2E disponibles. El 23 de octubre pasaron validación local **39/39**, registro Provider **10/10**, E2E de dos clientes **38/38** y contratos **74/74**. La regresión autenticada histórica **15/15** no pudo repetirse porque faltan credenciales E2E; tampoco arrancaron los E2E residenciales/dating específicos por falta de configuración. Android `1.0.32` fue recompilado después de corregir el falso rechazo de cobertura, con R8, `mapping.txt` y el Web Client ID de Google embebido en APK/AAB. El flujo visual Customer llegó al checkout Mercado Pago sandbox sin confirmar pago. El trabajo pendiente se concentra en publicación, integraciones externas, un `400 database_error` de perfil Provider y validación en dispositivos reales.

Orden recomendado:

1. **P0 — Antes de entregar una nueva versión:** proteger credenciales, generar Android `1.0.32 (32)` y completar la configuración mínima de Google Play.
2. **P1 — Antes de abrir la app al público:** terminar pagos, Google OAuth, push, documentos legales y pruebas físicas Android.
3. **P1 iOS — Antes de publicar en App Store:** certificados, IPA, OAuth/APNs y pruebas físicas iPhone.
4. **P2 — Después de estabilizar el lanzamiento:** accesibilidad avanzada, moderación, disponibilidad horaria y pruebas destructivas controladas.

## P0 — Bloqueantes de la próxima entrega Android

### 1. Proteger y rotar credenciales

**Qué falta:** sustituir claves de desarrollo por secretos productivos y rotar cualquier clave que haya sido compartida durante QA.

**Por qué es prioritario:** una compilación pública no debe contener credenciales reutilizables o expuestas.

**Terminado cuando:** las claves productivas se carguen desde el mecanismo seguro del build, las anteriores estén revocadas y ningún secreto aparezca en Git o documentación pública.

### 2. Subir y probar Android `1.0.32 (32)`

**Estado actual:** el APK y AAB `1.0.32 (32)` fueron recompilados después de la corrección de cobertura y verificados con R8; `mapping.txt` coincide con el mapa incluido en el AAB. Los artefactos están en `dist/`. El APK declara `minSdk 24` y `targetSdk 36`. Esta verificación local usa la clave debug; el build publicable debe regenerarse con la upload key de producción.

**Qué falta:** cargar el AAB v32 en la pista interna de Google Play y repetir la certificación en un dispositivo físico.

**Terminado cuando:** el APK v32 se instale y abra correctamente y el AAB v32 quede aceptado en una pista interna de Google Play.

### 3. Completar la ficha técnica mínima de Google Play

**Qué falta:** habilitar Play App Signing, crear o terminar la ficha, cargar ícono/capturas, descripción, clasificación de contenido, Data Safety, correo de soporte y URLs legales.

**Terminado cuando:** Google Play permita publicar una release en prueba interna sin advertencias bloqueantes.

## P1 — Antes de producción pública

### 4. Certificar pagos de extremo a extremo

**Estado actual:** la consulta devuelve `unpaid`, Checkout Pro crea la preferencia con `201` y luego queda `pending`; Android abrió el checkout sandbox y el formulario de tarjeta por el flujo real de la app. La recarga de Créditos NOD también crea una preferencia.

**Qué falta:** completar un pago con tarjeta sandbox, recibir el webhook válido, comprobar la transición a `paid` y verificar que no se duplique el cobro. Para Créditos NOD falta acreditar saldo de prueba y validar débito, idempotencia, reembolso y payout.

**Dependencia:** credenciales y usuarios sandbox de Mercado Pago, webhook accesible y saldo de prueba.

La auditoría adicional también detectó un `400 database_error` en actualización de perfil Provider (`Cannot coerce the result to a single JSON object`); debe corregirse y repetirse antes de marcar ese flujo como aprobado.

**Terminado cuando:** un pago completo cambie de `unpaid` a `pending` y finalmente a `paid`, y un reintento conserve un solo cobro.

### 5. Configurar Google Login real

**Estado actual:** el botón y el flujo móvil existen. `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` ya está configurado localmente y verificado dentro del APK/AAB `1.0.32`.

**Qué falta:** configurar los clientes Android e iOS definitivos, registrar SHA-1/SHA-256 de la firma de producción y validar login y registro en builds firmados; el backend debe aceptar el mismo Client ID como audiencia (`aud`).

**Prueba realizada el 23-10:** el APK v32 configuró el Web Client ID y abrió Google Play Services hasta la pantalla nativa `Sign in`. No se completó el registro porque el emulador no tiene una cuenta Google. La huella observada pertenece al certificado debug local: SHA-1 `5e8f16062ea3cd2c4a0d547876baa6f38cabf625`, SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`; aún no se verificó la huella de producción ni el cliente OAuth Android en Google Cloud/Firebase.

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

**Prueba realizada:** el APK v32 se instaló y abrió en `NOD_Pixel`; se verificó onboarding, login Customer QA y dashboard. No se considera prueba física ni certifica cámara, GPS, push, pago completo o red intermitente.

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

## Evidencia reproducible

| Área | Evidencia concreta | Resultado |
|---|---|---|
| Validación local | `npm run validate` ejecutado el 23-10 | TypeScript correcto; Vitest **39/39** |
| Registro Provider | `node --env-file=.env scripts/e2e-provider-registration.mjs` | **10/10**; cuenta QA creada y onboarding persistido |
| E2E dos clientes | `node --env-file=.env scripts/e2e-two-customers.mjs` | **38/38**; match `204ab2c8-399e-4339-9456-b6bb4f1d14de`, Housing `4fc53b18-6a14-4cdd-aa4f-931d2994f019`, servicio `e96fba32-d83a-4f7e-970c-93296dc120b9` |
| Contratos | `node --env-file=.env scripts/audit-backend-contracts.mjs` | **74/74** endpoints respondiendo |
| Smoke API | `npm run test:api` con red autorizada | Endpoints válidos respondieron; respuestas `401/403/404` corresponden a sesiones o IDs inválidos de prueba |
| APK Android | `dist/NOD-1.0.32-android-v32.apk`, `aapt dump badging` | `com.nod.mobile`, `versionCode 32`, `versionName 1.0.32`, `minSdk 24`, `targetSdk 36` |
| AAB y mapping | `dist/NOD-1.0.32-android-v32-play.aab` y `dist/NOD-1.0.32-android-v32-mapping.txt` | Build R8 generado; mapping versionado en `dist/` |
| Android smoke | Instalación con `adb install -r`, apertura de `MainActivity` en `NOD_Pixel` | APK instalado; onboarding, login Customer QA y dashboard visibles |
| Google Android | Botón Google del APK v32 | Google Play Services abrió `Sign in`; no se completó porque el emulador no tenía cuenta Google |
| SHA del APK local | `apksigner verify --print-certs dist/NOD-1.0.32-android-v32.apk` | SHA-1 `5e8f16062ea3cd2c4a0d547876baa6f38cabf625`; SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c` |
| Mercado Pago | Reserva QA `1bb95a03-c828-4de8-830d-d0341bea14c0`; checkout sandbox `x.mercadopago.cl` | `unpaid`/`pending`; formulario de tarjeta visible; sin cobro ni webhook `paid` |

La evidencia de build y mapping queda en `dist/` local; el APK/AAB están ignorados por Git y el mapping está permitido/versionado. La evidencia de ejecución E2E queda además resumida en los JSON de salida de cada script durante la ejecución; las cuentas y tokens QA no se documentan para no exponer credenciales.

- **Customer E2E del 23-10: 38/38.** Dos cuentas nuevas completaron registro, login, mascotas, perfiles sociales, Discovery, match/chat, comunidad, Housing/chat y reserva normal/chat. Las reservas de prueba fueron canceladas.
- **Provider nuevo del 23-10: 10/10.** Registro, login, 13 pasos activos, progreso, rechazos, guardado de categoría/paseador y persistencia.
- **Lecturas autenticadas del 21-10: 15/15.** Las cuentas QA Customer y Provider accedieron correctamente a sus recursos; Pablo devolvió dos tarifas consolidadas.
- **Contratos activos del 23-10: 74/74.** Las cinco rutas `/hosting/*` antiguas de Customer API quedaron fuera porque están deprecadas; Mobile usa Provider API.
- **Cobertura pendiente de configuración:** `e2e-customer-community-hosting.mjs` y `e2e-residential-dating.mjs` no corrieron porque faltan secretos E2E específicos en este checkout; no se consideran fallos del backend.
- **Regresión autenticada pendiente de repetición:** `e2e-authenticated.mjs` tampoco arrancó porque faltan las credenciales E2E Customer/Provider; el resultado histórico 15/15 se conserva como referencia, no como ejecución actual.
- **Tarifas unificadas:** los dos endpoints Provider devolvieron las mismas dos tarifas, con su fuente efectiva y el perfil Housing correspondiente.
- **Validación local: 39/39.** TypeScript y pruebas automatizadas sin errores.
- **Housing:** búsqueda, detalle, creación `201`, listado, metadata residencial, chat, lectura y cancelación aprobados. Mobile envía `hosting_profile_id` y `pet_ids`.
- **Reservas normales:** creación, listado, chat y cancelación aprobados sobre Provider API.
- **Ciclo Provider:** aceptar, iniciar, registrar GPS, pausar, reanudar, completar y consultar detalle, timeline, ETA, ruta y fotos.
- **Comunidad:** publicaciones, likes, comentarios, estadísticas, diez medallas y rankings global, mensual, semanal y por comuna.
- **Seguridad funcional:** servicio inexistente `404`, fuera de cobertura `422`, fecha pasada `400`, conflicto horario `409` y cancelación ajena `403`.
- **Android v32:** APK recompilado, instalado y ejecutado en el emulador `NOD_Pixel`; se verificaron onboarding, login Customer QA y dashboard. El checkout Mercado Pago se había alcanzado en un recorrido manual anterior, pero no se repitió completo con este APK v32 y no reemplaza las pruebas en dispositivo físico.
- **Cobertura normal:** se corrigió el falso rechazo local causado por `provider.zones` conteniendo una dirección en lugar de una comuna; Mobile delega ahora la validación al endpoint de creación.
- **Pendiente técnico:** `audit-backend-extra.mjs` devolvió `400 database_error` al actualizar un perfil Provider; el resto de respuestas negativas del barrido correspondió a falta de JWT o IDs de prueba inválidos.
- **Pendientes no ejecutados:** `e2e-authenticated.mjs` requiere `NOD_E2E_CUSTOMER_EMAIL`, `NOD_E2E_PROVIDER_EMAIL` y `NOD_E2E_PASSWORD`; `e2e-customer-community-hosting.mjs` requiere cuentas y `NOD_E2E_HOSTING_PROFILE_ID`; `e2e-residential-dating.mjs` requiere `NOD_E2E_PROVIDER_PROJECT_URL`, `NOD_E2E_PROVIDER_ANON_KEY` y `NOD_E2E_TEST_EMAIL_BASE`.
- **Google Android:** prueba parcial; falta una cuenta Google QA en el emulador y la configuración/verificación de la huella de producción.
- **Google iOS:** no probado; falta `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, certificados, provisioning profile y dispositivo.
- **Push externo:** no probado; faltan proyecto EAS, FCM, APNs, worker y tokens reales.

## Próxima secuencia de trabajo recomendada

1. Rotar/configurar secretos productivos.
2. Configurar las cuentas/IDs E2E faltantes y repetir las tres suites bloqueadas.
3. Subir el AAB v32 a prueba interna de Google Play.
4. Completar Google OAuth Android con cuenta QA, SHA de producción y cliente OAuth Android.
5. Ejecutar la matriz física Android.
6. Completar pago sandbox, webhook y Créditos NOD.
7. Corregir `database_error` de perfil Provider y repetir auditoría.
8. Cerrar ficha, Data Safety y documentos legales.
9. Preparar certificados, APNs, IPA y TestFlight para iOS.
