# Cloudflare Tunnel Setup

This repo keeps the chat server local on `127.0.0.1:8787` and publishes it through Cloudflare at `chat.novatec.casa`.

## One-time setup

1. Install `cloudflared` on Windows if needed:

```powershell
winget install --id Cloudflare.cloudflared
```

If `cloudflared` is not on PATH yet, the installer usually lands at:

- `C:\Program Files (x86)\cloudflared\cloudflared.exe`

2. Authenticate Cloudflare on this PC:

```powershell
cloudflared tunnel login
```

3. Create a tunnel named `chat-novatec`:

```powershell
cloudflared tunnel create chat-novatec
```

4. Route the hostname to the tunnel:

```powershell
cloudflared tunnel route dns chat-novatec chat.novatec.casa
```

5. Start the local chat stack:

```bat
start-chat-tunnel.bat
```

## Notes

- The tunnel only exposes the chat backend. The website can stay on GitHub Pages.
- GitHub Pages builds should use `https://chat.novatec.casa/api/assistant-chat` and `https://chat.novatec.casa/api/chat-log`.
- The launcher fetches the tunnel token at runtime, so you do not need to keep a local tunnel credentials JSON in the repo.
