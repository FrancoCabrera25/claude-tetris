#!/usr/bin/env bash
#
# Bootstrap de labels para el triage automático de issues con Claude (ver
# .github/workflows/claude-issue-triage.yml y .claude/commands/triage-issue.md).
#
# Ejecutar una sola vez, con `gh` autenticado sobre este repo:
#   bash .github/labels.sh
#
# Usa --force así es seguro volver a correrlo (actualiza descripción/color si ya existen).

set -euo pipefail

create_label() {
  local name="$1" color="$2" description="$3"
  gh label create "$name" --color "$color" --description "$description" --force
}

# Prioridad
create_label "prioridad-alta"  "b60205" "Requiere atención inmediata"
create_label "prioridad-media" "fbca04" "Importante pero no urgente"
create_label "prioridad-baja"  "0e8a16" "Puede esperar"

# Área afectada del código
create_label "area-motor"      "5319e7" "Lógica de juego: colisiones, rotación, líneas, scoring"
create_label "area-render"     "1d76db" "Dibujado en canvas: draw(), ghost, drawNext()"
create_label "area-controles"  "1d76db" "Entrada de teclado, pausa, reinicio"
create_label "area-hud"        "1d76db" "Marcador, nivel, líneas, overlay"
create_label "area-estilos"    "1d76db" "style.css e index.html"

# Estado del diagnóstico
create_label "necesita-info"          "d4c5f9" "Falta información para reproducir o implementar"
create_label "listo-para-implementar" "0e8a16" "Diagnóstico completo, se puede abrir un PR"

echo "Labels creadas/actualizadas."
