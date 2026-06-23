# Cronmanager MCP-Server – Projektplan & Architektur-Referenz

## ABSOLUTE RULES (never violate, no exceptions)

- **Never** add "Co-Authored-By" or any AI/Claude/Anthropic attribution to commit messages
- **Never** mention Claude, Anthropic, or AI tools in source code, comments, documentation, or changelogs

## Workflow Rules (non-negotiable)

1. **Analysis before action**: Always present findings and wait for explicit approval before writing any code or making any change.
2. **Ask before implementing**: After analysis is approved, ask "Should I implement this?" before touching any file.
3. **Ask before committing or pushing**: Never run `git commit` or `git push` without explicit per-action approval in the current message. A prior "commit and push" instruction does not carry forward to subsequent changes.
4. **Ask before creating branches**: State the intended branch name and ask before running `git checkout -b`.

---

## Projektziel

Ein eigenständiger MCP-Server (Model Context Protocol), der die bestehende HTTP-API des "Cronmanager Agent" (PHP-Projekt unter `/opt/dev/cronmanager/agent`) als MCP-Tools für LLM-Clients (Claude Code/Desktop o.ä.) zugänglich macht. Beispiel-Use-Cases: "zeig mir alle fehlgeschlagenen Jobs der letzten Woche", "deaktiviere Job 42", "lege ein Maintenance Window für Samstagnacht an" — direkt per Konversation.

Der MCP-Server ist ein **reiner HTTP-Client** der bestehenden Agent-API — architektonisch analog zum bestehenden `HostAgentClient.php` im Cronmanager-Web-Container. Er bekommt **keinen** eigenen DB- oder Crontab-Zugriff; alle fachliche Logik (Validierung, Singleton-Mode, Maintenance-Windows, etc.) bleibt im Agent.

### Bindende Architektur-Entscheidungen

1. **Transport:** Der MCP-Server läuft als eigener Docker-Container im selben internen Docker-Netzwerk wie der Cronmanager-Agent, erreichbar per **Streamable HTTP** (aktueller MCP-Standard, nicht das veraltete SSE). Begründung: Der Agent bleibt intern/nie öffentlich erreichbar; der MCP-Server kann bei Bedarf selektiv per Reverse-Proxy nach außen exponiert werden.
2. **Tool-Umfang:** Voller Lese- **und** Schreibzugriff von Anfang an (alle ~26 Agent-Endpoints als Tools), keine Beschränkung auf read-only.
3. **Zukunftsoffen (NICHT Teil dieses Projekts, betrifft den Agent):** Der Cronmanager-Agent wird *später* mehrere benannte HMAC-Secrets mit Rollen (readonly/readwrite) unterstützen, durchgesetzt grob nach HTTP-Methode (GET = readonly-fähig, alles andere erfordert readwrite). Der MCP-Server muss dafür **heute schon kompatibel** gebaut werden: austauschbarer Secret-Wert per Env-Var, keine Hardcodierung von Rollenannahmen, Signier-Logik isoliert in einer einzigen Funktion (damit z.B. ein künftiger `X-Agent-Key-Id`-Header ergänzt werden kann, ohne den Signierpfad zu berühren).
4. **CI/CD:** Docker-Images werden ausschließlich per GitHub Actions gebaut und nach Docker Hub gepusht (kein lokaler `docker push`). Image-Name: `cs1711/cronmanager-mcp`. Zwei Workflows analog zum Hauptprojekt (Referenz: `/opt/dev/cronmanager/.github/workflows/`):
   - `docker-release.yml`: Trigger `release: published` (+ `workflow_dispatch` mit optionalem Tag-Override), validiert den Release-Tag gegen `vMAJOR.MINOR.PATCH(-suffix)`, Tags via `docker/metadata-action` (`{version}`, `{major}.{minor}`, `{major}`, `latest` auf Default-Branch), `platforms: linux/amd64,linux/arm64`.
   - `docker-dev.yml`: Trigger bei jedem Push auf einen Branch außer `main` (+ `workflow_dispatch`), Tag `:dev` (wird immer überschrieben), `build-args: APP_VERSION=dev-<branch>@<short-sha>`, gleiche Multi-Arch-Plattformen.
   Benötigte Repository-Secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` (vom Nutzer in den GitHub-Repo-Settings anzulegen). Kein Äquivalent zu `auto-patch-release.yml` — kein Base-Image-Update-Szenario in diesem Projekt.

---

## Referenz: Bestehende Agent-Architektur (Cronmanager-Hauptprojekt, NICHT Teil dieses Repos)

### Security-Modell (HMAC)

- Jeder Request an den Agent (außer `GET /health`) muss den Header tragen:
  ```
  X-Agent-Signature: hex(hmac_sha256(secret, METHOD.toUpperCase() + path_ohne_querystring + raw_json_body))
  ```
- Server akzeptiert auch ein `sha256=`-Präfix im Header, prüft mit `hash_equals` (constant-time).
- Referenz-Implementierung Client-Seite (PHP): `/opt/dev/cronmanager/web/src/Agent/HostAgentClient.php` (`sign()`-Methode, Guzzle-Client mit `base_uri`/`timeout`/`http_errors: false`, eigene `AgentHttpException` für 4xx/5xx, `RuntimeException` für Transport-Fehler).
- Server-seitige Validierung: `/opt/dev/cronmanager/agent/src/Security/HmacValidator.php`.

**Kritische Signatur-Edge-Cases** (Quelle für stille 401-Fehler, beim Nachbau in TypeScript beachten):
- Body wird **einmal** serialisiert und genau dieser String sowohl für die HMAC-Berechnung als auch als tatsächlicher Request-Body verwendet — nie zweimal serialisieren (Drift-Risiko durch Key-Reihenfolge/Whitespace).
- Pfad für die Signatur (ohne Query-String) und Pfad für die tatsächliche Request-URL müssen aus derselben Quelle stammen, sonst Drift bei URL-Encoding (z.B. Leerzeichen in Tag-Namen).
- Leerer Body bei GET/DELETE wird als `''` signiert, nicht als `'{}'` oder `undefined`.

### Agent-API (alle Endpoints registriert in `/opt/dev/cronmanager/agent/agent.php`, Handler in `/opt/dev/cronmanager/agent/src/Endpoints/`)

| Endpoint | Methode/Pfad | Request | Response |
|---|---|---|---|
| CronList | GET /crons | Query: `user?, tag?, target?` | `{data: Job[], count}` |
| CronGet | GET /crons/{id} | — | `Job` |
| CronCreate | POST /crons | `linux_user, schedule, command` (required) + viele optionale Felder (s.u.) | `Job` (201) |
| CronUpdate | PUT /crons/{id} | wie Create, PATCH-Semantik auf Skalarfeldern | `Job` |
| CronDelete | DELETE /crons/{id} | — | `{message, id}` |
| CronBulkStatus | POST /crons/bulk/status | `{ids[], active}` | `{updated}` |
| CronBulkDelete | POST /crons/bulk/delete | `{ids[]}` | `{deleted}` |
| CronBulkTag | POST /crons/bulk/tag | `{ids[], tag, action: add\|remove}` | `{updated}` |
| ExecuteNow | POST /crons/{id}/execute | `{targets[]?}` | `{message, job_id, scheduled_at, schedule, targets}` |
| ExecutionKill | POST /execution/{id}/kill | — | `{execution_id, killed}` |
| Monitor | GET /crons/{id}/monitor | Query: `period (1h\|6h\|12h\|24h\|7d\|30d\|3m\|6m\|1y, default 30d), target?` | `{job, stats, duration_series, bar_buckets, recent, period, from, to}` |
| History | GET /history | Query: `job_id?, tag?, user?, target?, status?, search?, from?, to?, limit?(1-500,default 50), offset?` | `{data, count, total, limit, offset}` |
| TagList | GET /tags | — | `{data: Tag[], count}` |
| TagCreate | POST /tags | `{name}` | `Tag` (201) |
| TagDelete | DELETE /tags/{id} | — | `{message, id, name}` |
| MaintenanceWindowList | GET /maintenance/windows | Query: `target?` | `Window[]` |
| MaintenanceWindowGet | GET /maintenance/windows/{id} | — | `Window` |
| MaintenanceWindowCreate | POST /maintenance/windows | `{target, cron_schedule, duration_minutes, description?, active?}` | `Window` (201) |
| MaintenanceWindowUpdate | PUT /maintenance/windows/{id} | wie Create | `Window` |
| MaintenanceWindowDelete | DELETE /maintenance/windows/{id} | — | `{deleted, id}` |
| MaintenanceWindowConflict | GET /maintenance/windows/conflict | Query: `schedule, target, look_ahead?` | `{has_conflict, conflicts[]}` |
| SshHosts | GET /ssh-hosts | Query: `user` | `{user, data[], count}` |
| SshTest | POST /ssh/test | `{host}` | `{success, output}` |
| Export | GET /export | Query: `user?, tag?, format: crontab\|json (default crontab)` | Crontab-Text oder JSON |
| CronUsers | GET /crons/users | Query: `target?` | `{data[], count}` |
| CronUnmanaged | GET /crons/unmanaged | Query: `user, target?` | `{user, data[], count}` |

CronCreate/CronUpdate-Felder: `description?, active?, notify_on_failure?, execution_limit_seconds?, auto_kill_on_limit?, singleton?, run_in_maintenance?, targets[], tags[], retention_days?, retry_count?, retry_delay_minutes?, restart_on_exitcodes?, notify_after_failures?, notify_after_limit_exceeded?, notify_on_recovery?`.

**Wichtige Falle bei `update_cron`** (verifiziert in `CronUpdateEndpoint.php:308-309`, `:219-226`, `:365`): Wenn `targets` oder `tags` im PUT-Body vorhanden ist, wird die komplette Liste **ersetzt** (DELETE aller bestehenden Zuordnungen + Neuanlage), **kein Merge auf Element-Ebene**. Das Tool-Schema/die Beschreibung für `update_cron` muss das LLM explizit davor warnen, sonst drohen versehentliche Datenverluste (z.B. wenn ein LLM nur "Tag X hinzufügen" meint, aber `tags: ["X"]` sendet und damit alle anderen Tags löscht).

---

## Tech-Stack

- **Node.js + TypeScript**, `tsconfig`: `strict: true`, `noUncheckedIndexedAccess: true`, `module: NodeNext`
- **`@modelcontextprotocol/sdk`** mit `StreamableHTTPServerTransport`
- **`zod`** für Tool-Input-Schemas
- **natives `fetch`** + `AbortController` für Timeout-Handling (kein HTTP-Client-Package nötig, fetch hat keinen eingebauten Timeout)
- **`vitest`** für Unit-Tests, minimal gehaltenes ESLint (`@typescript-eslint`, kein Airbnb-Regelwerk)
- Eigener **Bearer-Token** (`MCP_AUTH_TOKEN`) schützt den MCP-HTTP-Endpoint, getrennt vom Agent-HMAC-Secret
- Konfiguration **ausschließlich über Env-Vars** (kein JSON-Config-File — passt zur Docker-Container-Konvention des Hauptprojekts)

---

## Projektstruktur

```
cronmanager-mcp/
├── package.json / tsconfig.json / .eslintrc / vitest.config.ts
├── .env.example
├── README.md
├── CHANGELOG.md
├── Dockerfile
├── docker-compose.snippet.yml      # Beispiel-Service für Integration in den bestehenden Cronmanager-Stack
├── .github/
│   └── workflows/
│       ├── docker-release.yml      # Build + Push nach Docker Hub bei GitHub Release (semver + latest, multi-arch)
│       └── docker-dev.yml          # Build + Push :dev-Tag bei Push auf Nicht-main-Branches (multi-arch)
└── src/
    ├── index.ts                    # HTTP-Server, StreamableHTTPServerTransport, Bearer-Auth-Middleware, /healthz, /readyz
    ├── config.ts                   # Env-Var-Parsing/Validierung (AGENT_URL, AGENT_HMAC_SECRET, MCP_AUTH_TOKEN, PORT, TIMEOUT_MS, LOG_LEVEL, MCP_READONLY_MODE)
    ├── agentClient.ts              # sign(), get/post/put/delete(), AgentHttpError, AgentUnreachableError
    ├── logger.ts                   # minimaler strukturierter Logger
    ├── tools/
    │   ├── index.ts                # registriert alle Tools am McpServer
    │   ├── crons.ts                # list_crons, get_cron, create_cron, update_cron, delete_cron
    │   ├── cronsBulk.ts            # bulk_update_cron_status, bulk_delete_crons, bulk_tag_crons
    │   ├── execution.ts            # execute_cron_now, kill_execution, get_cron_monitor, get_history
    │   ├── tags.ts                 # list_tags, create_tag, delete_tag
    │   ├── maintenanceWindows.ts   # list/get/create/update/delete_maintenance_window, check_maintenance_conflict
    │   └── misc.ts                 # list_ssh_hosts, test_ssh_connection, export_crons, list_cron_users, list_unmanaged_crons
    └── schemas/                    # zod-Schemas, getrennt von Handlern (Wiederverwendung in Tests)
test/
├── agentClient.spec.ts             # HMAC-Signatur gegen feste, mit dem PHP-Code erzeugte Vektoren
└── tools/*.spec.ts                 # Input-Validierung + HTTP-Mapping gegen Mock-Agent
```

---

## Kernentscheidungen aus Architektur-Review

1. **Signatur-Identität wahren** (siehe Edge-Cases oben) — eine zentrale `sign()`-Funktion, niemals Body zweimal serialisieren.
2. **`update_cron`-Warnung** in der Tool-Beschreibung wegen Full-Replace-Semantik bei `targets`/`tags` (s.o.).
3. **Health-Checks getrennt halten:** `/healthz` (Liveness, unabhängig vom Agent) und `/readyz` (Readiness, pingt Agent `/health`) getrennt implementieren — ein Agent-Ausfall darf den MCP-Container nicht fälschlich als "unhealthy" markieren.
4. **Fehler-Mapping:** Agent-4xx-Antworten (`{error, message, code}` bzw. `{error, fields}` bei 422) werden als MCP-Tool-Result mit `isError: true` und durchgereichtem `message`/`fields` zurückgegeben, damit das LLM Validierungsfehler lesen und korrigieren kann. Transport-Fehler (Agent nicht erreichbar) werden separat als "Agent unreachable" gekennzeichnet statt als generischer 500.
5. **`confirm: true`-Pflichtfeld** bei destruktiven Tools (`delete_cron`, `bulk_delete_crons`, `delete_tag`, `delete_maintenance_window`, `kill_execution`) als Schutz gegen versehentliche/halluzinierte Aufrufe — kein Ersatz für echte Autorisierung, aber sinnvolle zusätzliche Hürde.
6. **`MCP_READONLY_MODE`-Env-Var** (optional, default `false`): wenn `true`, werden schreibende/destruktive Tools zur Startzeit gar nicht erst registriert (nicht nur zur Laufzeit abgelehnt). Bereitet die spätere Rollentrennung im Agent vor und ist die robustere Variante für vorsichtige Deployments.
7. **`export_crons`:** Default `format: json` (abweichend vom Agent-Default `crontab`), da ein LLM mit JSON sauberer weiterarbeiten kann; `crontab`-Text bleibt wählbar.
8. **Docker-Build:** Multi-Stage analog zum PHP-Agent-Dockerfile (Builder mit `npm ci` + `tsc`, Runtime nur `dist/` + `node_modules --omit=dev`, non-root User). `tini` als PID 1 ist hier weniger kritisch als beim PHP-Wrapper (kein `exec &`-Pattern), aber unschädlich.

---

## Tool-Liste (vollständig, ~26 Tools)

| Tool | Agent-Call | Zod-Eckpunkte |
|---|---|---|
| `list_crons` | GET /crons | `{ user?, tag?, target? }` |
| `get_cron` | GET /crons/{id} | `{ id: number }` |
| `create_cron` | POST /crons | volles Job-Schema, `targets: string[].min(1)`, `schedule: string`, Rest optional |
| `update_cron` | PUT /crons/{id} | `{ id, ...alle Felder optional }`, Beschreibung warnt vor Full-Replace bei targets/tags |
| `delete_cron` | DELETE /crons/{id} | `{ id, confirm: literal(true) }` |
| `bulk_update_cron_status` | POST /crons/bulk/status | `{ ids: number[].min(1), active: boolean }` |
| `bulk_delete_crons` | POST /crons/bulk/delete | `{ ids: number[].min(1), confirm: literal(true) }` |
| `bulk_tag_crons` | POST /crons/bulk/tag | `{ ids: number[].min(1), tag, action: 'add'\|'remove' }` |
| `execute_cron_now` | POST /crons/{id}/execute | `{ id, targets?: string[] }` |
| `kill_execution` | POST /execution/{id}/kill | `{ executionId, confirm: literal(true) }` |
| `get_cron_monitor` | GET /crons/{id}/monitor | `{ id, period: enum(...).default('30d'), target? }` |
| `get_history` | GET /history | alle Filter aus `HistoryEndpoint`, `limit: 1-500 default 50` |
| `list_tags` | GET /tags | `{}` |
| `create_tag` | POST /tags | `{ name: string.min(1) }` |
| `delete_tag` | DELETE /tags/{id} | `{ id, confirm: literal(true) }` |
| `list_maintenance_windows` | GET /maintenance/windows | `{ target? }` |
| `get_maintenance_window` | GET /maintenance/windows/{id} | `{ id }` |
| `create_maintenance_window` | POST /maintenance/windows | `{ target, cron_schedule, duration_minutes, description?, active? }` |
| `update_maintenance_window` | PUT /maintenance/windows/{id} | wie create, alle optional |
| `delete_maintenance_window` | DELETE /maintenance/windows/{id} | `{ id, confirm: literal(true) }` |
| `check_maintenance_conflict` | GET /maintenance/windows/conflict | `{ schedule, target, look_ahead? }` |
| `list_ssh_hosts` | GET /ssh-hosts | `{ user }` |
| `test_ssh_connection` | POST /ssh/test | `{ host }` |
| `export_crons` | GET /export | `{ user?, tag?, format: enum('json','crontab').default('json') }` |
| `list_cron_users` | GET /crons/users | `{ target? }` |
| `list_unmanaged_crons` | GET /crons/unmanaged | `{ user, target? }` |

---

## Implementierungsreihenfolge

1. Projekt-Setup: `package.json`, `tsconfig` (strict), ESLint, Vitest — keine MCP-Logik.
2. `config.ts` + `agentClient.ts` inkl. `sign()`; Unit-Tests gegen feste HMAC-Vektoren (einen Vektor per `php -r` aus der `HmacValidator`-Logik erzeugen, in Test hardcoden, um Kompatibilität zu garantieren).
3. Mock-Agent für isolierte Tool-Tests (kleiner lokaler HTTP-Server oder `msw`).
4. Read-Tools zuerst implementieren (geringeres Risiko, validiert Grundgerüst): `list_crons`, `get_cron`, `list_tags`, `get_history`, `get_cron_monitor`, `list_ssh_hosts`, `list_cron_users`, `list_unmanaged_crons`, `list/get_maintenance_window`, `check_maintenance_conflict`, `export_crons`.
5. Write-Tools: `create/update/delete_cron`, `bulk_*`, `execute_cron_now`, `kill_execution`, `create/delete_tag`, `create/update/delete_maintenance_window`, `test_ssh_connection` — inkl. `confirm`-Pflichtfeld bei destruktiven Tools.
6. `index.ts`: McpServer + StreamableHTTPServerTransport + Bearer-Middleware + `/healthz` + `/readyz`.
7. `Dockerfile` (Multi-Stage: Builder mit `npm ci`+`tsc`, Runtime mit nur `dist/`+`node_modules --omit=dev`, non-root User) + `docker-compose.snippet.yml` für den bestehenden Stack + `.github/workflows/docker-release.yml` und `docker-dev.yml` (Build/Push nach Docker Hub, Image `cs1711/cronmanager-mcp`, Multi-Arch amd64/arm64, analog zum Hauptprojekt).
8. `README.md` (Tool-Liste, Env-Vars, Sicherheitsmodell) + `CHANGELOG.md` (Keep-a-Changelog-Format, Initial-Release-Eintrag).

---

## Verifikation

- **Unit-Tests (ohne echten Agenten):** `vitest` — Signatur-Berechnung gegen feste Vektoren, Request-Mapping pro Tool gegen Mock-Agent, Fehler-Mapping (4xx/5xx/Transport-Fehler).
- **MCP Inspector lokal:** `npx @modelcontextprotocol/inspector` gegen den laufenden Streamable-HTTP-Endpoint (Mock-Agent im Hintergrund) — mind. ein Tool pro Kategorie durchklicken.
- **End-to-End gegen echten Agent:** MCP-Container im selben Docker-Netzwerk wie ein laufender Test-Agent, Smoke-Test je mind. ein Read- und ein Write-Tool sowie ein destruktives Tool mit und ohne `confirm`.
- **Negativ-Tests:** falscher `MCP_AUTH_TOKEN` → 401 vom MCP-Server; falsches `AGENT_HMAC_SECRET` → korrekt als "Agent unreachable/401" durchgereicht, nicht als 500 verschluckt.

---

## Offene Punkte für die Umsetzung (vor Implementierungsstart zu klären)

- Author/License-Header in Quelldateien analog zu den PHP-Konventionen des Hauptprojekts (`@author Christian Schulz <technik@meinetechnikwelt.rocks>`, `@license GNU General Public License version 3 or later`)? Vorschlag: übernehmen, sofern nicht widersprochen.
- Keine Claude-/Anthropic-Referenzen in Code, Doku, Commit-Messages, Changelog (projektübergreifende Regel, siehe ABSOLUTE RULES oben).
- Deployment-Integration in `deploy.sh` des Hauptprojekts ist bewusst **nicht** Teil dieses Plans (separates Repo) — ggf. später als eigener Schritt nachziehen, wenn der MCP-Server stabil läuft.

---

## Status

Stand: Architektur und Plan vollständig ausgearbeitet und mit dem Nutzer abgestimmt (Transport, Tool-Umfang, Sicherheitsmodell). **Es wurde noch kein Code geschrieben.** Nächster Schritt: Implementierung gemäß obiger Reihenfolge, nach explizitem Startsignal des Nutzers (siehe Workflow Rules oben — Analyse/Plan ist abgeschlossen, Implementierung erfordert weiterhin separate Zustimmung pro Schritt).
