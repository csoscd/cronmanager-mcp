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
- **`create_job`** – Job anlegen (`linux_user`, `schedule`, `command`, `targets[]` erforderlich; optionale Felder siehe unten); optional `agent_id`
- **`update_job`** – Job aktualisieren (`id` + beliebige Felder); **Achtung:** `targets` und `tags` werden bei Angabe komplett ersetzt – immer die vollständige Liste übergeben; optional `agent_id`
- **`delete_job`** – Job löschen (`id`, `confirm: true` erforderlich); optional `agent_id`

**Optionale Felder für `create_job` / `update_job`:**

| Feld | Typ | Beschreibung |
|---|---|---|
| `description` | string | Beschreibung / Label |
| `active` | bool | Job aktiv (default: true) |
| `tags` | string[] | Tag-Namen |
| `notify_on_failure` | bool | Benachrichtigung bei Fehler |
| `notify_on_recovery` | bool | Benachrichtigung bei Wiederherstellung |
| `notify_after_failures` | int | Erst nach N aufeinanderfolgenden Fehlern benachrichtigen |
| `notify_after_limit_exceeded` | bool | Benachrichtigung wenn Zeitlimit überschritten |
| `notify_on_silence` | bool | Benachrichtigung wenn Job in der Gnadenfrist still bleibt |
| `silence_grace_minutes` | int\|null | Minuten Stille vor Silence-Alert (`null` = Server-Default) |
| `execution_limit_seconds` | int | Max. Laufzeit in Sekunden (0 = unbegrenzt) |
| `auto_kill_on_limit` | bool | Job bei Zeitlimit-Überschreitung abbrechen |
| `singleton` | bool | Parallele Ausführungen verhindern |
| `run_in_maintenance` | bool | Ausführung auch während Maintenance-Windows erlauben |
| `retention_days` | int | Ausführungshistorie für N Tage behalten (0 = immer) |
| `retry_count` | int | Anzahl Wiederholungsversuche bei Fehler |
| `retry_delay_minutes` | int | Verzögerung zwischen Wiederholungsversuchen |
| `restart_on_exitcodes` | int[] | Exit-Codes, die einen Retry auslösen |
| `dependency` | object\|null | Job-Abhängigkeit (CronManager ≥ 7.0.0); `null` in `update_job` entfernt eine bestehende Abhängigkeit |

**Abhängigkeitsfeld `dependency` (CronManager ≥ 7.0.0):**

| Unterfeld | Typ | Beschreibung |
|---|---|---|
| `type` | `"requires"` \| `"triggered_by"` | **requires**: Job behält seinen Schedule, prüft aber vor jeder Ausführung, ob der Vorgänger die Bedingung erfüllt. **triggered_by**: Kein Schedule — Job wird event-driven gestartet, wenn der Vorgänger abschließt. |
| `predecessor_id` | int | ID des Vorgänger-Jobs |
| `exit_codes` | string | Komma-separierte Exit-Codes, die die Bedingung erfüllen, z.B. `"0"` oder `"0,1"`. Leer = beliebiger Exit-Code. |
| `max_age_minutes` | int | Nur `requires`: Wie viele Minuten zurück nach einer qualifizierenden Vorgänger-Ausführung gesucht wird (0 = kein Alterslimit). |
| `trigger_delay_minutes` | int | Nur `triggered_by`: Minuten Wartezeit nach Abschluss des Vorgängers, bevor der abhängige Job eingeplant wird (0 = nächste Cron-Minute). |

**Hinweis `create_job`:** `schedule` ist für normale Jobs und `requires`-Abhängigkeiten Pflichtfeld. Für `triggered_by`-Jobs muss `schedule` weggelassen oder `null` gesetzt werden.

**Hinweise zu read-only Feldern auf Job-Objekten:**
- `last_silence_alert_at` (string|null) – Zeitpunkt des letzten Silence-Alerts, nicht setzbar.
- `dependency` im Response enthält zusätzlich alle gespeicherten Felder inkl. `trigger_delay_minutes`.

### Ausführung & Historie
- **`execute_job`** – Job sofort ausführen (`id`); optional `agent_id`
- **`kill_execution`** – Laufende Ausführung abbrechen (`executionId`, `confirm: true` erforderlich); optional `agent_id`
- **`get_job_history`** – Ausführungshistorie eines bestimmten Jobs (`id`); Filter: `status` (`success` | `failed` | `running` | `skipped`), `unacknowledged_only` (bool), `limit` (max 500, default 50), `offset`; optional `agent_id`
- **`get_timeline`** – Ausführungshistorie aller Jobs (global); Filter: `status` (`success` | `failed` | `running` | `skipped`), `tag`, `limit` (max 500, default 100), `offset`; optional `agent_id`
- **`check_job_dependency`** – Abhängigkeit eines Jobs prüfen: gibt `{satisfied: bool, reason: string}` zurück; nützlich für Debugging wenn ein `requires`-Job übersprungen wird; erfordert `jobs:read` Scope; CronManager ≥ 7.0.0; optional `agent_id`

### Fehler-Bestätigung (CronManager ≥ 6.0.0, Scope `executions:acknowledge`)
- **`acknowledge_execution`** – Fehlgeschlagene Ausführung als bestätigt markieren (`executionId`); unterdrückt den Eintrag im Dashboard, der Verlauf bleibt erhalten; optional `agent_id`
- **`unacknowledge_execution`** – Bestätigung einer Ausführung zurücknehmen (`executionId`); macht den Eintrag im Dashboard wieder sichtbar; optional `agent_id`
- **`acknowledge_all_job_executions`** – Alle unbestätigten Fehler eines Jobs in einem Schritt bestätigen (`id`); gibt `acknowledged_count` zurück; CronManager ≥ 7.0.0; optional `agent_id`

### Tags & Targets
- **`list_tags`** – Alle Tags auflisten; optional `agent_id`
- **`list_linux_users`** – Alle Linux-User auflisten, die auf dem Agent für Cron-Jobs verwendet werden können; enthält `docker_mode`-Flag (true = nur `root` gültig); erfordert `jobs:read` Scope; CronManager ≥ 4.8.0; optional `agent_id`
- **`list_targets`** – Alle distinct Execution-Targets auflisten, mit Anzahl der Jobs je Target; Filter: `active` (true = nur aktive Jobs, false = nur inaktive); erfordert `jobs:read` Scope; CronManager ≥ 4.8.0; optional `agent_id`

### Maintenance Windows
- **`list_maintenance_windows`** – Alle Maintenance Windows auflisten; optional `agent_id`
- **`get_maintenance_window`** – Einzelnes Maintenance Window abrufen (`id`); optional `agent_id`
- **`create_maintenance_window`** – Maintenance Window anlegen (`target`, `cron_schedule`, `duration_minutes`; optional `description`, `active`); optional `agent_id`
- **`update_maintenance_window`** – Maintenance Window aktualisieren (`id` + beliebige Felder); optional `agent_id`
- **`delete_maintenance_window`** – Maintenance Window löschen (`id`, `confirm: true` erforderlich); optional `agent_id`

### Maintenance Operationen (CronManager ≥ 4.8.0)
- **`purge_logs`** – Abgeschlossene Ausführungs-Logs sofort löschen, die die Retention-Policy überschreiten (`confirm: true`); erfordert `maintenance:write` Scope; optional `agent_id`
- **`cleanup_history`** – Alle abgeschlossenen Ausführungs-Logs älter als N Tage dauerhaft löschen (`older_than_days`, default 90, min 1; `confirm: true`); erfordert `maintenance:write` Scope; optional `agent_id`
- **`cleanup_once_entries`** – Verwaiste Run-Now-Crontab-Einträge entfernen, deren automatische Selbstbereinigung fehlgeschlagen ist (`confirm: true`); erfordert `maintenance:write` Scope; optional `agent_id`

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

**Welche Linux-User und Targets gibt es auf Agent 2?**
→ `list_linux_users` mit `agent_id: 2`; `list_targets` mit `agent_id: 2`

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

**Logs gem. Retention-Policy sofort bereinigen:**
→ `purge_logs` mit `confirm: true`

**Alle Logs älter als 30 Tage löschen:**
→ `cleanup_history` mit `older_than_days: 30`, `confirm: true`

**Verwaiste Run-Now-Einträge aufräumen:**
→ `cleanup_once_entries` mit `confirm: true`

**Alle unbestätigten Fehler eines Jobs quittieren:**
→ `acknowledge_all_job_executions` mit `id: <jobId>`

**Einzelne Ausführung als bestätigt markieren:**
→ `acknowledge_execution` mit `executionId: <id>`

**Nur unbestätigte Fehler eines Jobs anzeigen:**
→ `get_job_history` mit `id: <jobId>`, `unacknowledged_only: true`

**Nur Maintenance-Skip-Einträge (exit_code -4) anzeigen:**
→ `get_timeline` mit `status: "skipped"`

**Job als triggered_by-Abhängigkeit anlegen (startet nach Job 5):**
→ `create_job` mit `linux_user`, `command`, `targets`, `dependency: {type: "triggered_by", predecessor_id: 5, exit_codes: "0"}`; `schedule` weglassen

**Job mit requires-Abhängigkeit anlegen (läuft nach eigenem Schedule, prüft Vorgänger):**
→ `create_job` mit `schedule`, `linux_user`, `command`, `targets`, `dependency: {type: "requires", predecessor_id: 5, exit_codes: "0", max_age_minutes: 60}`

**Abhängigkeit eines Jobs debuggen (warum wird er übersprungen?):**
→ `check_job_dependency` mit `id: <jobId>`

**Abhängigkeit entfernen:**
→ `update_job` mit `id` und `dependency: null`

## Hinweise
- `confirm: true` ist bei destruktiven Aktionen (delete, kill, purge, cleanup) Pflicht
- Fehlermeldungen vom API werden direkt zurückgegeben und enthalten Hinweise zur Korrektur
- Bei `update_job`: wenn `targets` oder `tags` weggelassen werden, bleiben die bestehenden Werte erhalten – nur bei expliziter Angabe werden sie ersetzt
- `agent_id` ist bei allen Tools (außer `list_agents`) optional; ohne Angabe wird der Standard-Agent verwendet
- Status-Filter bei `get_job_history` und `get_timeline`: gültige Werte sind `success`, `failed`, `running`, `skipped` (nicht `failure`); `failed` schließt Maintenance-Sentinels (exit_code -4) aus, `skipped` zeigt ausschließlich diese
- API-Antworten aller agenten-spezifischen Endpoints enthalten `agent_id` als erstes Feld – nützlich zur Identifikation im Multi-Agent-Betrieb, da Job-IDs nur pro Agent eindeutig sind
- `purge_logs`, `cleanup_history`, `cleanup_once_entries`, `list_linux_users` und `list_targets` erfordern CronManager ≥ 4.8.0
- `acknowledge_execution`, `unacknowledge_execution` erfordern CronManager ≥ 6.0.0 und Scope `executions:acknowledge`
- `acknowledge_all_job_executions`, `check_job_dependency` und Job-Abhängigkeitsfelder erfordern CronManager ≥ 7.0.0
- Zyklen im Dependency-Graphen werden beim Anlegen/Bearbeiten vom Server erkannt und mit HTTP 422 abgewiesen
