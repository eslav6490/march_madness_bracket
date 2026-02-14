# Server Runbook (Manual Testing)

This is a pragmatic runbook for running the app on a Linux server so it can be hit from another machine.

## 1) Postgres

Confirm Postgres is running and reachable locally:

```bash
pg_isready
```

Create a database/user or reuse existing. Example using a local `postgres` superuser:

```bash
su - postgres -c "psql -c \"create role mmapp login password 'mmapp_dev';\""
su - postgres -c "psql -c \"create database march_madness owner mmapp;\""
```

## 2) App Env

Create a local env file that Next.js will load automatically:

```bash
cat > /root/march_madness_bracket/.env.local <<'EOF'
DATABASE_URL=postgres://mmapp:mmapp_dev@127.0.0.1:5432/march_madness
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
ADMIN_SESSION_SECRET=replace-with-a-long-random-secret
# Optional legacy fallback for local/testing only:
# ADMIN_TOKEN=dev-admin
EOF
```

## 3) Migrations

```bash
cd /root/march_madness_bracket
npm ci
npm run db:migrate
```

## 4) Run the Server

Foreground (quick test):

```bash
cd /root/march_madness_bracket
npm run dev -- --hostname 0.0.0.0 --port 3000
```

## 5) Keep It Running (systemd)

Create a service file:

```bash
cat > /etc/systemd/system/march-madness-bracket.service <<'EOF'
[Unit]
Description=March Madness Bracket (Next.js dev server)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
WorkingDirectory=/root/march_madness_bracket
EnvironmentFile=/root/march_madness_bracket/.env.local
Environment=NODE_ENV=development
ExecStart=/usr/bin/npm run dev -- --hostname 0.0.0.0 --port 3000
Restart=on-failure
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF
```

Enable + start:

```bash
systemctl daemon-reload
systemctl enable --now march-madness-bracket
systemctl status --no-pager --full march-madness-bracket
```

Logs:

```bash
journalctl -u march-madness-bracket -n 200 --no-pager
```

## 6) Connect From Another Machine

Use the server's LAN/VPN IP:

```text
http://<server-ip>:3000/
```

If you can ping the server but TCP connect fails, verify:

- The process is listening: `ss -lntp | grep :3000`
- Your network route to that subnet is correct.
- Any upstream security group / router ACL allows inbound TCP/3000.

Fallback: SSH port-forward:

```bash
ssh -L 3000:127.0.0.1:3000 root@<server>
```

Then browse:

```text
http://localhost:3000/
```

## 7) Verify Admin Login/Logout (Cookie Session)

1. Open `http://<server-ip>:3000/admin/login`.
2. Sign in with a Supabase admin user.
3. Confirm redirect to `/admin` and that admin actions work without manual token entry.
4. Click `Logout` on an admin page, then verify you are sent back to `/admin/login`.
5. Re-open `/admin`; you should be redirected to `/admin/login` until signing in again.
