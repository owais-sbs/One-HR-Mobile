# One-HR-Mobile

## API base URL in development

The app resolves its API base URL in this order:

1. `EXPO_PUBLIC_API_BASE_URL` if you set it.
2. The Expo packager host with port `8080` when running on LAN.
3. Emulator/simulator loopback fallback:
   - Android emulator: `http://10.0.2.2:8080/api`
   - iOS simulator: `http://localhost:8080/api`

For real phones on the same Wi-Fi, do not use `localhost`. Use your backend
machine's LAN address, for example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.33:8080/api npm start
```
