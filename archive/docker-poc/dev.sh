#!/usr/bin/env bash
set -euo pipefail

# Always run from the docker/ directory regardless of where the script is called from
cd "$(dirname "$0")"

# Export UID/GID so docker compose can use them for the build args
# UID is readonly in bash, so use a .env file for docker compose
echo "UID=$(id -u)" > .env
echo "GID=$(id -g)" >> .env
echo "HOME=${HOME}" >> .env

COMPOSE_FILE="docker-compose.claude.yml"

usage() {
  echo "Usage: ./dev.sh <command>"
  echo ""
  echo "Commands:"
  echo "  up        Build (if needed) and start the claude-code-sandbox container"
  echo "  down      Stop and remove the container"
  echo "  shell     Open a bash login shell inside the running container"
  echo "  rebuild   Force rebuild the image (no cache) and start"
  echo "  logs      Tail container logs"
  echo "  attach    Attach to the running claude session"
  echo "  status    Show container status"
  echo ""
}

cmd=${1:-}

case "$cmd" in
  up)
    docker compose -f "$COMPOSE_FILE" up -d --build
    echo "Container started. Run './dev.sh shell' to enter."
    ;;
  down)
    docker compose -f "$COMPOSE_FILE" down
    ;;
  attach)
    docker attach claude-code-sandbox
    ;;
  shell)
    docker exec -it claude-code-sandbox bash -l
    ;;
  rebuild)
    docker compose -f "$COMPOSE_FILE" build --no-cache
    docker compose -f "$COMPOSE_FILE" up -d
    echo "Container rebuilt and started. Run './dev.sh shell' to enter."
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" logs -f
    ;;
  status)
    docker compose -f "$COMPOSE_FILE" ps
    ;;
  *)
    usage
    exit 1
    ;;
esac
