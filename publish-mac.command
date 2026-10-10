#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
node scripts/publish-github.mjs
read -r -p "按 Enter 关闭。"
