# FlareDDNS

Self-hosted dyndns2-to-Cloudflare DNS bridge. Your router sends standard dynamic DNS updates, FlareDDNS translates them into Cloudflare API calls.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your credentials
docker compose up -d
```

Open `http://localhost:8080` to run the setup wizard.

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_USER` | Yes | — | Admin panel username |
| `ADMIN_PASSWORD` | Yes | — | Admin panel password |
| `DDNS_USERS` | Yes | — | DDNS credentials, format: `user1:pass1,user2:pass2` |
| `CF_API_TOKEN` | No | — | Cloudflare API token (can be set via UI instead) |
| `PORT` | No | `8080` | Server port |
| `SESSION_SECRET` | No | auto-generated | Session cookie secret |

### Cloudflare API Token

Create a token at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) with:

- **Zone / Zone / Read** — list your domains
- **Zone / DNS / Edit** — create and update DNS records

## Router Setup

### MikroTik RouterOS

```
/ip cloud set ddns-enabled=no
/tool fetch url="http://YOUR_SERVER:8080/nic/update\
?hostname=YOUR_HOSTNAME&myip=$(ip/address/get \
[find interface=ether1] address)" \
user=ddns password=secret123 mode=http
```

### Huawei / ZTE ONT

```
Service provider: Custom / DynDNS
Server: YOUR_SERVER:8080
Hostname: your.domain.com
Username: ddns
Password: secret123
```

### ddclient

```
protocol=dyndns2
server=YOUR_SERVER:8080
login=ddns
password=secret123
your.domain.com
```

### curl

```bash
curl "http://ddns:secret123@YOUR_SERVER:8080/nic/update?hostname=your.domain.com&myip=1.2.3.4"
```

## dyndns2 API

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/nic/update` | Primary dyndns2 endpoint |
| GET | `/v3/update` | Alias for compatibility |

### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `hostname` | Yes | FQDN to update (comma-separated for multiple) |
| `myip` | No | IP address (auto-detected from request if omitted; comma-separated for IPv4+IPv6) |

Authentication: HTTP Basic Auth using credentials from `DDNS_USERS`.

### Response Codes

| Code | Meaning |
|------|---------|
| `good <ip>` | Update successful |
| `nochg <ip>` | IP unchanged, no update needed |
| `badauth` | Invalid credentials |
| `notfqdn` | Missing or invalid hostname |
| `nohost` | Hostname not in any managed zone |
| `abuse` | Rate limit exceeded |
| `dnserr` | Cloudflare API error |
| `911` | Server configuration error |

## Development

```bash
npm install

# Start backend (auto-reloads)
ADMIN_USER=admin ADMIN_PASSWORD=test DDNS_USERS=ddns:secret123 npm run dev

# Start frontend (separate terminal)
npm run dev:client

# Run tests
npm test
```

## Architecture

- **Backend:** Node.js + Express, SQLite via better-sqlite3
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Auth:** Session cookies (admin panel), HTTP Basic Auth (dyndns2)
- **Zone matching:** Longest-match-first against actual Cloudflare zones (handles multi-part TLDs like `.co.id`)
