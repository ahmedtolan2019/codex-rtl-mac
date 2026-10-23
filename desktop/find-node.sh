#!/bin/bash
# Sourced by the Lite launcher. Never source user shell profiles or evaluate paths.
codex_node_is_usable() {
  [[ "$1" = /* && -x "$1" ]] || return 1
  "$1" -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)' >/dev/null 2>&1
}
codex_find_node() {
  local configured_file="${1:-}" candidate="" from_path=""
  if [[ -n "$configured_file" && -f "$configured_file" ]]; then
    IFS= read -r candidate < "$configured_file" || [[ -n "$candidate" ]]
    codex_node_is_usable "$candidate" || return 1
    printf '%s\n' "$candidate"
    return 0
  fi
  from_path="$(command -v node 2>/dev/null || true)"
  for candidate in "$from_path" /opt/homebrew/bin/node /usr/local/bin/node \
    "$HOME/.volta/bin/node" "$HOME/.local/share/fnm/aliases/default/bin/node" \
    "$HOME/.nvm/current/bin/node"; do
    if codex_node_is_usable "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}
