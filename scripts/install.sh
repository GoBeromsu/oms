#!/usr/bin/env bash
# OMS installer — installs the package and registers host adapters.
# Usage: curl -fsSL https://raw.githubusercontent.com/GoBeromsu/oms/main/scripts/install.sh | bash
set -euo pipefail

PACKAGE_SPEC="${OMS_PACKAGE_SPEC:-https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz}"
RUNTIME="${OMS_INSTALL_RUNTIME:-auto}"
VAULT="${OMS_VAULT:-$PWD}"
EXECUTE="${OMS_EXECUTE_EXTERNAL:-0}"

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
  echo "Error: npm is required to install OMS." >&2
  exit 1
fi

echo "OMS Installer"
echo "  package: $PACKAGE_SPEC"
echo "  runtime: $RUNTIME"
echo "  vault:   $VAULT"
echo

npm install -g "$PACKAGE_SPEC"

ARGS=(install --runtime "$RUNTIME" --vault "$VAULT" --yes)
if [ "$EXECUTE" = "1" ]; then
  ARGS+=(--execute)
fi

if command -v oms >/dev/null 2>&1; then
  oms "${ARGS[@]}"
else
  oms "${ARGS[@]}"
fi

echo
echo "OMS install complete. Run: oms doctor --vault \"$VAULT\""
