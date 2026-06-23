# Cronmanager

Du hast Zugriff auf den Cronmanager über den MCP-Server `cronmanager`. Nutze die verfügbaren Tools für alle Anfragen rund um Cron-Jobs, Ausführungshistorie, Tags, Maintenance Windows und Einstellungen.

## Multi-Agent-Unterstützung

Wenn mehrere Cronmanager-Agenten konfiguriert sind (verschiedene Server/Umgebungen), kannst du mit `list_agents` die verfügbaren Agenten abrufen und dann bei jedem Tool den Parameter `agent_id` setzen, um gezielt einen bestimmten Agenten anzusprechen. Ohne `agent_id` wird der Standard-Agent (globale `CM_AGENT_ID`-Konfiguration) verwendet.

## Verfügbare Tools

### Agenten
- **`list_agents`** – Alle konfigurierten Cronmanager-Agenten auflisten (erfordert `settings:read` Scope)

### Jobs
- **`list_jobs`** – Jobs auflisten; Filter: `tag`, `target`, `user`, `active`, `limit`, `offset`; optional `agent_id`
- **`get_job`** – Einzelnen Job abrufen (`id`); optional `agent_id`
- **`create_job`** – Job anlegen (`linux_user`, `schedule`, `command`, `targets[]` erforderlich; `description`, `active`, `notify_on_failure`, `execution_limit_seconds`, `auto_kill_on_limit`, `singleton`, `retry_count`, `retry_delay_minutes`, `tags[]` optional); optional `agent_id`
- **`update_job`** – Job aktualisieren (`id` + beliebige Felder); **Achtung:** `targets` und `tags` werden bei Angabe komplett ersetzt – immer die vollständige Liste übergeben; optional `agent_id`
- **`delete_job`** – Job löschen (`id`, `confirm: true` erforderlich); optional `agent_id`

### Ausführung & Historie
- **`execute_job`** – Job sofort ausführen (`id`; optional `targets[]`); optional `agent_id`
- **`kill_execution`** – Laufende Ausführung abbrechen (`executionId`, `confirm: true` erforderlich); optional `agent_id`
- **`get_job_history`** – Ausführungshistorie abrufen; Filter: `job_id`, `tag`, `user`, `target`, `status`, `search`, `from`, `to`, `limit` (max 500, default 50), `offset`; optional `agent_id`
- **`get_timeline`** – Monitoring-Daten und Statistiken für einen Job (`id`; `period`: `1h`|`6h`|`12h`|`24h`|`7d`|`30d`|`3m`|`6m`|`1y`, default `30d`; optional `target`); optional `agent_id`

### Tags
- **`list_tags`** – Alle Tags auflisten; optional `agent_id`

### Maintenance Windows
- **`list_maintenance_windows`** – Alle Maintenance Windows auflisten (optional `target`); optional `agent_id`
- **`get_maintenance_window`** – Einzelnes Maintenance Window abrufen (`id`); optional `agent_id`
- **`create_maintenance_window`** – Maintenance Window anlegen (`target`, `cron_schedule`, `duration_minutes`; optional `description`, `active`); optional `agent_id`
- **`update_maintenance_window`** – Maintenance Window aktualisieren (`id` + beliebige Felder); optional `agent_id`
- **`delete_maintenance_window`** – Maintenance Window löschen (`id`, `confirm: true` erforderlich); optional `agent_id`

### Export & Einstellungen
- **`export_jobs`** – Jobs exportieren; `format`: `json` (default) oder `crontab`; optional `user`, `tag`; optional `agent_id`
- **`get_settings`** – Alle Einstellungen abrufen; optional `agent_id`
- **`get_settings_section`** – Einzelne Einstellungs-Sektion abrufen (`section`); optional `agent_id`
- **`update_settings_section`** – Einstellungs-Sektion aktualisieren (`section`, `data`); optional `agent_id`
- **`resync_crontab`** – Crontab auf dem Zielsystem neu synchronisieren (`confirm: true` erforderlich); optional `agent_id`

## Typische Workflows

**Verfügbare Agenten anzeigen:**
→ `list_agents` aufrufen; zurückgegebene `id`-Werte können als `agent_id` bei anderen Tools verwendet werden

**Jobs eines bestimmten Agenten auflisten:**
→ `list_jobs` mit `agent_id: <id>`

**Fehlgeschlagene Jobs der letzten 24 Stunden anzeigen:**
→ `get_job_history` mit `status: "failed"`, `from: "<24h-ago>"`, `limit: 100`

**Job deaktivieren:**
→ `update_job` mit `id` und `active: false`

**Maintenance Window für Samstagsnacht anlegen (02:00–04:00):**
→ `create_maintenance_window` mit `cron_schedule: "0 2 * * 6"`, `duration_minutes: 120`

**Alle Jobs eines bestimmten Tags exportieren:**
→ `export_jobs` mit `tag: "<tagname>"`, `format: "json"`

**Job sofort auf einem bestimmten Target ausführen:**
→ `execute_job` mit `id` und `targets: ["<target>"]`

## Hinweise
- `confirm: true` ist bei destruktiven Aktionen (delete, kill) Pflicht
- Fehlermeldungen vom API werden direkt zurückgegeben und enthalten Hinweise zur Korrektur
- Bei `update_job`: wenn `targets` oder `tags` weggelassen werden, bleiben die bestehenden Werte erhalten – nur bei expliziter Angabe werden sie ersetzt
- `agent_id` ist bei allen Tools optional; ohne Angabe wird der Standard-Agent verwendet
