# NOD Mobile

Aplicación móvil de NOD para clientes y proveedores de servicios de mascotas. Está construida con React Native y Expo, y comparte una sola aplicación con flujos diferenciados según el tipo de cuenta.

## Funcionalidades principales

- Registro e inicio de sesión de clientes y proveedores.
- Validación de RUT chileno mediante módulo 11.
- Onboarding y gestión de zonas de cobertura para proveedores.
- Búsqueda y ranking de paseadores por comuna, cercanía y evaluación.
- Reservas, seguimiento de servicios, chat, evidencias y soporte.
- Gestión de mascotas, ficha médica y búsqueda de razas.
- Descubrimiento y matches entre mascotas.
- Ubicación, búsqueda de direcciones y visualización en OpenStreetMap.

## Requisitos

- Node.js compatible con `package.json`.
- npm.
- Android Studio/Android SDK para compilación local Android.
- Xcode para compilación local iOS.
- Cuenta de Expo/EAS para builds remotos.

## Configuración

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar las variables de ejemplo:

   ```bash
   cp .env.example .env
   ```

3. Reemplazar las claves de ejemplo por las credenciales correspondientes. El archivo `.env` está excluido de Git.

## Ejecución

```bash
npm start
npm run android
npm run ios
```

Verificación de TypeScript:

```bash
npm run typecheck
```

## Build Android

Build local release:

```bash
cd android
ANDROID_HOME=/ruta/al/android-sdk ./gradlew assembleRelease
```

Al terminar, Gradle copia automáticamente el APK versionado a `dist/`. Esa carpeta no se publica en Git.

Build con EAS:

```bash
npm run build:android
```

## Estructura

- `src/api`: clientes y contratos de API.
- `src/screens`: pantallas de clientes, proveedores, registro y onboarding.
- `src/components`: componentes visuales compartidos.
- `src/services`: notificaciones y servicios del dispositivo.
- `src/storage`: persistencia local y sesión.
- `docs`: contratos, brechas de API y lista de publicación.
- `android`: proyecto Android nativo generado/configurado.

## Estado de backend

La app consume servicios desplegados en proyectos separados para clientes y proveedores. Las brechas conocidas están documentadas en [`docs/apis-faltantes-nod.txt`](docs/apis-faltantes-nod.txt) y resumidas en [`TODO.md`](TODO.md).

## Seguridad

- No subir `.env`, llaves privadas, tokens, APKs ni credenciales.
- Usar `.env.example` únicamente como plantilla.
- Las claves públicas utilizadas por la aplicación deben tener permisos mínimos en el backend.

