# Production deployment (Ubuntu VPS)

Stack: FastAPI on **127.0.0.1:9000**, React build under **nginx** on port 80. CI/CD deploys via SSH (see `.github/workflows/deploy.yml`).

## 1. One-time server layout

- Repository clone: `/var/www/yourapp`
- Virtualenv: `/var/www/yourapp/venv`
- Backend: `/var/www/yourapp/backend`
- Frontend build output: `/var/www/yourapp/frontend/build`

Create secrets on the server only:

```bash
sudo cp /var/www/yourapp/deploy/backend.env.example /var/www/yourapp/backend/.env
sudo nano /var/www/yourapp/backend/.env   # set DATABASE_URL
sudo chmod 600 /var/www/yourapp/backend/.env
```

## 2. systemd (`yourapp`)

```bash
sudo cp /var/www/yourapp/deploy/systemd/yourapp.service /etc/systemd/system/yourapp.service
sudo systemctl daemon-reload
sudo systemctl enable yourapp
sudo systemctl start yourapp
sudo systemctl status yourapp
```

Expected: `active (running)`. Process listens on **9000** only on loopback.

**Note:** The committed unit uses `EnvironmentFile=/var/www/yourapp/backend/.env` instead of embedding `DATABASE_URL` in the unit file. To match the old inline style, you can add `Environment=` lines in the unit, but that is easier to leak via backups; prefer `.env` with `chmod 600`.

## 3. nginx

```bash
sudo cp /var/www/yourapp/deploy/nginx/yourapp.conf /etc/nginx/sites-available/yourapp
# Edit server_name to your domain
sudo nano /etc/nginx/sites-available/yourapp
sudo ln -sf /etc/nginx/sites-available/yourapp /etc/nginx/sites-enabled/yourapp
sudo nginx -t
sudo systemctl restart nginx
```

`proxy_pass` is intentionally **without** a path suffix so `/api/...` is forwarded to FastAPI unchanged.

## 4. Health check

On the server:

```bash
curl -sS http://127.0.0.1:9000/health
# {"status":"ok"}
```

Through nginx (after DNS points to the server):

```bash
curl -sS http://your-domain/health
```

## 5. CI/CD alignment

On push to `main`, Actions runs `git fetch` / `reset --hard`, installs deps, `alembic upgrade head`, `npm run build`, then `systemctl restart yourapp`, `nginx`, and `curl -f http://localhost:9000/health`.

Ensure the GitHub deploy user can run those `systemctl` commands (e.g. passwordless sudo for the service, or run as root — not recommended for production; prefer a dedicated user + sudoers).

## 6. Full verification after `git push origin main`

1. **GitHub** → Actions → workflow green (backend-ci, frontend-ci, deploy).
2. **Server:** `systemctl status yourapp` → active.
3. **API health:** `curl http://127.0.0.1:9000/health`
4. **Browser:** open `http://your-domain` (or HTTPS once TLS is configured).

## 7. CORS and production origin

The frontend uses a same-origin `/api` base URL when not on localhost (see `src/services/api.js`). For a separate API hostname, set `REACT_APP_API_BASE_URL` when building (e.g. in `frontend/.env.production` on the build host).
