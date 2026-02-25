# README-dispatcher.md

## Overview

This dispatcher runs every 60 seconds, pulls unassigned `TO_DO` tasks from Mission Control, marks them `IN_PROGRESS`, and forwards each task to the appropriate OpenClaw session via Gateway Sessions Send API.

## Files

- `dispatch-tasks.sh` — main dispatcher script
- `crontab-entry.txt` — cron schedule entry (`*/1 * * * *`)
- `install-dispatcher.sh` — installs cron entry for the current user
- `dispatcher.log` — runtime action log

## Endpoints

- Mission Control list: `GET http://mission-control:3000/api/tasks?status=TO_DO&limit=100`
- Mission Control status update: `POST http://mission-control:3000/api/tasks/{taskId}`
- OpenClaw dispatch: `POST http://72.60.194.93:53964/sessions/send`

## Dispatcher Logic

1. Poll tasks from Mission Control.
2. Filter tasks where:
   - `status == "TO_DO"`
   - `assigneeId` is null/missing/empty
3. For each matching task:
   - Update task status to `IN_PROGRESS`
   - Choose target session label from task tags
   - Send task description to OpenClaw Sessions Send API
4. Log every action to:
   - `/data/.openclaw/workspace/devops/sprint5/dispatcher.log`

## Tag-to-Session Routing

Current mapping in `dispatch-tasks.sh`:

- `devops` → `devops`
- `ops` → `ops`
- `architect` → `architect`
- `frontend` → `frontend`
- `backend` → `backend`
- default → `devops`

## Install

```bash
cd /data/.openclaw/workspace/devops/sprint5
./install-dispatcher.sh
```

## Verify

```bash
# Show installed cron
crontab -l | grep sprint5-dispatcher.lock

# Run once manually
/data/.openclaw/workspace/devops/sprint5/dispatch-tasks.sh

# Watch logs
tail -f /data/.openclaw/workspace/devops/sprint5/dispatcher.log
```

## Notes

- Cron uses `flock` (`/tmp/sprint5-dispatcher.lock`) to prevent overlapping runs.
- If no eligible tasks are found, the run exits after logging poll start/complete.
- Ensure Mission Control and Gateway endpoints are reachable from the host running cron.
