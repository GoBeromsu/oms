#!/usr/bin/env bash
# Lexa installer — installs the package and registers host adapters.
# Usage: curl -fsSL https://raw.githubusercontent.com/GoBeromsu/lexa/main/scripts/install.sh | bash
set -euo pipefail

PACKAGE_SPEC="${LEXA_PACKAGE_SPEC:-https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz}"
RUNTIME="${LEXA_INSTALL_RUNTIME:-auto}"
VAULT="${LEXA_VAULT:-$PWD}"
EXECUTE="${LEXA_EXECUTE_EXTERNAL:-0}"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --runtime) RUNTIME="${2:-}"; shift 2 ;;
    --runtime=*) RUNTIME="${1#--runtime=}"; shift ;;
    --vault) VAULT="${2:-}"; shift 2 ;;
    --vault=*) VAULT="${1#--vault=}"; shift ;;
    --package) PACKAGE_SPEC="${2:-}"; shift 2 ;;
    --package=*) PACKAGE_SPEC="${1#--package=}"; shift ;;
    --execute) EXECUTE=1; shift ;;
    *) shift ;;
  esac
done

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required to install Lexa." >&2
  exit 1
fi

echo "Lexa Installer"
echo "  package: $PACKAGE_SPEC"
echo "  runtime: $RUNTIME"
echo "  vault:   $VAULT"
echo

npm install -g "$PACKAGE_SPEC"

ARGS=(install --runtime "$RUNTIME" --vault "$VAULT" --yes)
if [ "$EXECUTE" = "1" ]; then
  ARGS+=(--execute)
fi

lexa "${ARGS[@]}"

echo
echo "Lexa install complete. Run: lexa doctor --vault \"$VAULT\""
