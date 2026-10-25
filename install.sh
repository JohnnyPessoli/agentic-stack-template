#!/bin/sh
set -eu

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20.12 ou superior é necessário. Instale-o antes de continuar." >&2
  exit 1
fi

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec node "$script_dir/scripts/install.mjs" "$@"
