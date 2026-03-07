# User Workflows

## 1. Create and Start First Sandbox

```
User: cd /my/project && claude-code-sandbox start

  1. Resolve workspace → /my/project (cwd)
  2. Load config → no file yet, create ~/.claude-code-sandbox/config.json
  3. Sync Docker state → nothing to sync (empty config)
  4. Find container for /my/project → none
  5. Validate Docker is running (dockerode ping)
  6. Pull image spiriyu/claude-code-sandbox:latest (spinner)
  7. Resolve auth → ANTHROPIC_API_KEY found in env
  8. Generate UUID: "a1b2c3d4-e5f6-..."
  9. Create Docker container:
       name: "claude-code-sandbox-a1b2c3d4"
       image: "spiriyu/claude-code-sandbox:latest"
       Binds: ["/my/project:/workspace"]
       Env: ["ANTHROPIC_API_KEY=sk-ant-..."]
  10. Add ContainerRecord to config, save
  11. Start container
  12. Attach stdout/stderr to terminal (or detach with -d)

✓ Container a1b2c3d4 started
  Workspace:  /my/project
  Image:      spiriyu/claude-code-sandbox:latest
  (Ctrl+C to detach — container will keep running)
```

---

## 2. Resume an Existing Sandbox

```
User: cd /my/project && claude-code-sandbox start

  1. Resolve workspace → /my/project
  2. Load config → found container a1b2c3d4
  3. Sync Docker state → lastStatus = "exited"
  4. Container exists but stopped → container.start()
  5. Attach or show detached status

✓ Container a1b2c3d4 resumed
  Workspace:  /my/project
  Uptime:     just started
```

---

## 3. Idempotent Start (Already Running)

```
User: claude-code-sandbox start (container is already running)

  1. Find container a1b2c3d4 for cwd
  2. Sync Docker state → lastStatus = "running"
  3. Already running → no action, print status and exit 0

  Container a1b2c3d4 is already running
  Workspace:  /my/project
  Uptime:     42 minutes
```

---

## 4. List All Containers

```
User: claude-code-sandbox ls

  1. Load config
  2. Sync all container states with Docker
  3. Filter removedAt === null
  4. Display table:

  ID        WORKSPACE                 STATUS    IMAGE:TAG                   CREATED
  a1b2c3d4  /home/user/proj1          running   claude-code-sandbox:latest  2h ago
  b2c3d4e5  /home/user/proj2          exited    claude-code-sandbox:latest  1d ago
  c3d4e5f6  /home/user/work/api       created   claude-code-sandbox:latest  3d ago
```

---

## 5. Stop All Running Containers

```
User: claude-code-sandbox stop-all

  1. Load config
  2. Sync Docker states → a1b2c3d4 = running, others = exited/created
  3. Stop each running container:
       a1b2c3d4 (proj1) ···················· ✓
  4. Update config

  Stopped 1/1 containers
```

---

## 6. Attach to a Running Container

```
User: claude-code-sandbox attach

  1. Resolve workspace → cwd → find container a1b2c3d4
  2. Sync Docker state → running ✓
  3. Set process.stdin to raw mode
  4. container.attach({ stream: true, stdin: true, stdout: true, stderr: true })
  5. Pipe streams to process.stdin/stdout

[Attached to claude-code-sandbox-a1b2c3d4]
[Press Ctrl+C to detach — container will keep running]

> [Claude Code output appears here...]
```

---

## 7. Remove a Container

```
User: claude-code-sandbox remove

  1. Resolve workspace → cwd → find container a1b2c3d4
  2. Prompt: "Remove container a1b2c3d4 (/my/project)? [y/N]"
  3. User confirms: y
  4. Container is running → container.stop()
  5. container.remove()
  6. Set removedAt in config, save

  ✓ Container a1b2c3d4 removed
    Run `claude-code-sandbox history` to view removed containers.
    Run `claude-code-sandbox start` to create a new one for this workspace.
```

---

## 8. View History

```
User: claude-code-sandbox history

  ID        WORKSPACE                 STATUS    CREATED    REMOVED
  a1b2c3d4  /home/user/proj1          running   2h ago     —
  b2c3d4e5  /home/user/otherapp       removed   5d ago     1d ago
  c3d4e5f6  /home/user/work/api       removed   10d ago    3d ago
```

---

## 9. Ambiguous Selection (Interactive Prompt)

When workspace cwd has no container and `--id` is not provided, the user is prompted:

```
User: claude-code-sandbox stop
(multiple containers, none matching cwd)

  ? Which container? (Use arrow keys)
  ❯ a1b2c3d4  /home/user/proj1   running   2h ago
    b2c3d4e5  /home/user/proj2   exited    1d ago
```

---

## 10. First Run — No Docker

```
User: claude-code-sandbox start

  Error: Docker is not running or not accessible.

  Make sure Docker Desktop (or the Docker daemon) is running.
  On Linux: sudo systemctl start docker
  On Mac/Windows: open Docker Desktop
```

---

## 11. No Auth Configured

```
User: claude-code-sandbox start

  Error: No authentication credentials found.

  Set one of:
    ANTHROPIC_API_KEY=sk-ant-api03-...
    CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...

  Or run: claude-code-sandbox auth setup
```

---

## 12. Start All

```
User: claude-code-sandbox start-all

  1. Load all non-removed containers (3 found)
  2. Sync Docker states
  3. Start each stopped one:
       a1b2c3d4  /proj1   already running     —
       b2c3d4e5  /proj2   starting ·········  ✓
       c3d4e5f6  /work    starting ·········  ✓

  Started 2/3 containers (1 was already running)
```
