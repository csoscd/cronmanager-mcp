# Cronmanager

Du hast Zugriff auf den Cronmanager über den MCP-Server `cronmanager`. Nutze die verfügbaren Tools für alle Anfragen rund um Cron-Jobs, Ausführungshistorie, Tags, Maintenance Windows und Einstellungen.

## Multi-Agent-Unterstützung

Wenn mehrere Cronmanager-Agenten konfiguriert sind (verschiedene Server/Umgebungen), kannst du mit `list_agents` die verfügbaren Agenten abrufen und dann bei jedem Tool den Parameter `agent_id` setzen, um gezielt einen bestimmten Agenten anzusprechen. Ohne `agent_id` wird der Standard-Agent (globale `CM_AGENT_ID`-Konfiguration) verwendet.

`list_agents` gibt pro Agent folgende Felder zurück: `id`, `name`, `description`, `enabled`, `web_url` (öffentliche URL des Web-Containers, identisch für alle Agenten, `null` wenn nicht konfiguriert).

## Verfügbare Tools

### Agenten
- **`list_agents`** – Alle konfigurierten Cronmanager-Agenten auflisten (erfordert `settings:read` Scope); kein `agent_id`-Parameter, da dieser Endpoint nicht agenten-spezifisch ist

### Audit Log
- **`get_audit_log`** – Paginierten Audit-Log abrufen (erfordert `audit:read` Scope, nur Admins; CronManager ≥ 4.3.4); Filter: `username`, `action_prefix` (z.B. `"cron"` für alle `cron.*`-Aktionen), `date_from`, `date_to` (`YYYY-MM-DD`); optional `limit`, `offset`, `agent_id`

### Jobs
- **`list_jobs`** – Jobs auflisten; Filter: `tag`, `target`, `user`, `active`, `limit`, `offset`; optional `agent_id`
- **`get_job`** – Einzelnen Job abrufen (`id`); optional `agent_id`
- **`create_job`** – Job anlegen (`linux_user`, `schedule`, `command`, `targets[]` erforderlich; `description`, `active`, `notify_on_failure`, `execution_limit_seconds`, `auto_kill_on_limit`, `singleton`, `retry_count`, `retry_delay_minutes`, `notify_on_silence`, `silence_grace_minutes`, `tags[]` optional); optional `agent_id`
- **`update_job`** – Job aktualisieren (`id` + beliebige Felder, u.a. `notify_on_silence`, `silence_grace_minutes`); **Achtung:** `targets` und `tags` werden bei Angabe komplett ersetzt – immer die vollständige Liste übergeben; optional `agent_id`
- **`delete_job`** – Job löschen (`id`, `confirm: true` erforderlich); optional `agent_id`

### Ausführung & Historie
- **`execute_job`** – Job sofort ausführen (`id`); optional `agent_id`
- **`kill_execution`** – Laufende Ausführung abbrechen (`executionId`, `confirm: true` erforderlich); optional `agent_id`
- **`get_job_history`** – Ausführungshistorie eines bestimmten Jobs (`id`); Filter: `status` (`success` | `failed` | `running`), `limit` (max 500, default 50), `offset`; optional `agent_id`
- **`get_timeline`** – Ausführungshistorie aller Jobs (global); Filter: `status` (`success` | `failed` | `running`), `tag`, `limit` (max 500, default 100), `offset`; optional `agent_id`

### Tags
- **`list_tags`** – Alle Tags auflisten; optional `agent_id`

### Maintenance Windows
- **`list_maintenance_windows`** – Alle Maintenance Windows auflisten; optional `agent_id`
- **`get_maintenance_window`** – Einzelnes Maintenance Window abrufen (`id`); optional `agent_id`
- **`create_maintenance_window`** – Maintenance Window anlegen (`target`, `cron_schedule`, `duration_minutes`; optional `description`, `active`); optional `agent_id`
- **`update_maintenance_window`** – Maintenance Window aktualisieren (`id` + beliebige Felder); optional `agent_id`
- **`delete_maintenance_window`** – Maintenance Window löschen (`id`, `confirm: true` erforderlich); optional `agent_id`

### Export & Einstellungen
- **`export_jobs`** – Jobs exportieren; `format`: `json` (default), `csv` oder `cron`; optional `user`, `tag`; optional `agent_id`
- **`get_settings`** – Alle Einstellungen abrufen (alle Sektionen); optional `agent_id`
- **`get_settings_section`** – Einzelne Einstellungs-Sektion abrufen (`section`); lesbare Sektionen: `mail`, `telegram`, `influxdb`, `notifications`, `performance_monitor`, `web` (read-only, enthält `web_agent_id` und `web_url`); optional `agent_id`
- **`update_settings_section`** – Einstellungs-Sektion aktualisieren (`section`, `data`); schreibbare Sektionen: `mail`, `telegram`, `influxdb`, `notifications`, `performance_monitor`; `web` ist read-only und kann hier nicht gesetzt werden; optional `agent_id`
- **`resync_crontab`** – Crontab auf dem Zielsystem neu synchronisieren (`confirm: true` erforderlich); optional `agent_id`

## Typische Workflows

**Verfügbare Agenten anzeigen:**
→ `list_agents` aufrufen; zurückgegebene `id`-Werte können als `agent_id` bei anderen Tools verwendet werden

**Jobs eines bestimmten Agenten auflisten:**
→ `list_jobs` mit `agent_id: <id>`

**Fehlgeschlagene Jobs der letzten 24 Stunden anzeigen:**
→ `get_timeline` mit `status: "failed"`, `limit: 100`

**Ausführungshistorie eines einzelnen Jobs filtern:**
→ `get_job_history` mit `id: <jobId>`, `status: "failed"`

**Job deaktivieren:**
→ `update_job` mit `id` und `active: false`

**Maintenance Window für Samstagsnacht anlegen (02:00–04:00):**
→ `create_maintenance_window` mit `cron_schedule: "0 2 * * 6"`, `duration_minutes: 120`

**Alle Jobs eines bestimmten Tags exportieren:**
→ `export_jobs` mit `tag: "<tagname>"`, `format: "json"`

**Job sofort ausführen:**
→ `execute_job` mit `id: <jobId>`

**Audit-Log der letzten Cron-Änderungen anzeigen:**
→ `get_audit_log` mit `action_prefix: "cron"`, `date_from: "YYYY-MM-DD"`

**Wer hat wann eine Einstellung geändert?**
→ `get_audit_log` mit `action_prefix: "settings"`

**Performance-Monitor-Einstellungen lesen:**
→ `get_settings_section` mit `section: "performance_monitor"`

**Web-Identity eines Agenten lesen:**
→ `get_settings_section` mit `section: "web"`

## Hinweise
- `confirm: true` ist bei destruktiven Aktionen (delete, kill) Pflicht
- Fehlermeldungen vom API werden direkt zurückgegeben und enthalten Hinweise zur Korrektur
- Bei `update_job`: wenn `targets` oder `tags` weggelassen werden, bleiben die bestehenden Werte erhalten – nur bei expliziter Angabe werden sie ersetzt
- `agent_id` ist bei allen Tools (außer `list_agents`) optional; ohne Angabe wird der Standard-Agent verwendet
- Status-Filter bei `get_job_history` und `get_timeline`: gültige Werte sind `success`, `failed`, `running` (nicht `failure`)
- API-Antworten aller agenten-spezifischen Endpoints enthalten `agent_id` als erstes Feld – nützlich zur Identifikation im Multi-Agent-Betrieb, da Job-IDs nur pro Agent eindeutig sind
