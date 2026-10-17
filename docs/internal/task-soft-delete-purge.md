# Task soft-delete purge (follow-up)

Deleted tasks set `deletedAt` and stay hidden from `/team/tasks`. Undo restores the row (`POST /api/tasks/[id]/restore`).

Permanent purge after a retention window is **not shipped**. Decide the number of days, then add a cron that hard-deletes rows where `deletedAt` is older than that window.
