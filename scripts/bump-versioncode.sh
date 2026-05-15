#!/usr/bin/env bash
# Incrementa expo.android.versionCode em +1, preservando indent JSON.
# Uso: ./scripts/bump-versioncode.sh
# Saida: linha "versionCode: X -> Y".
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

node -e "
const fs = require('fs');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const cur = app.expo.android.versionCode;
app.expo.android.versionCode = cur + 1;
fs.writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n');
console.log('versionCode: ' + cur + ' -> ' + (cur + 1));
"
