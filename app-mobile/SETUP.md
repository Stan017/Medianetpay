# MediaNetPay Mobile — Setup con Expo Go

## Requisitos

- Node.js 18+
- App **Expo Go** instalada en el celular (Play Store)
- Backend corriendo en la misma red Wi-Fi

## Instalación

```bash
cd app-mobile
npm install
```

## Correr con Expo Go

```bash
npm start
# Escanear el QR con la app Expo Go (Android) o la cámara (iOS)
```

**Importante:** el celular y el PC deben estar en la misma red Wi-Fi.

## Configurar la IP del backend

En `app.json`, cambiar `apiBaseUrl` por la IP local del PC:

```json
"extra": {
  "apiBaseUrl": "http://192.168.1.XX:8000",
  "googleWebClientId": "..."
}
```

Para saber tu IP local:
```bash
# Windows
ipconfig
# Buscar IPv4 Address en tu adaptador Wi-Fi
```

## Configurar Google Sign-In (opcional para testing inicial)

El login por email/contraseña funciona sin configuración de Google.
Para activar Google Sign-In:

1. Ir a https://console.cloud.google.com
2. Crear proyecto → APIs & Services → Credentials → Create OAuth Client ID
3. Tipo: **Web application**
   - Authorized redirect URIs: `https://auth.expo.io/@TU_USUARIO/medianetpay-mobile`
4. Copiar el **Web Client ID**
5. En `app.json` → `extra.googleWebClientId`: pegar el ID
6. En el backend `.env`: `GOOGLE_CLIENT_ID=<Web Client ID>`

> El redirect URI de Expo Go tiene el formato:
> `https://auth.expo.io/@TU_USUARIO_EXPO/medianetpay-mobile`
> Tu usuario de Expo lo ves en https://expo.dev

## Build APK (cuando esté listo para producción)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```
