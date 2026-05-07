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

## Recommended LAN setup for teammates

When someone else clones the project, the most reliable setup is:

1. Start the backend on the machine that will host it.
2. Make sure that machine is reachable on the LAN at `http://<that-machine-ip>:8080`.
3. In `One-HR-Mobile`, create `.env` from `.env.example`.
4. Set `EXPO_PUBLIC_API_BASE_URL=http://<that-machine-ip>:8080/api`.
5. Start Expo in LAN mode:

```bash
npm run start:lan
```

Example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.33:8080/api
```

If a teammate runs Expo in tunnel mode or localhost mode on a physical phone,
they should set `EXPO_PUBLIC_API_BASE_URL` explicitly so the app does not fall
back to an unreachable loopback address.
