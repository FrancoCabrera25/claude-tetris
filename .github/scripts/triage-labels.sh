#!/usr/bin/env bash
#
# Edita labels en el issue que disparó el workflow de triage.
# Uso: ./.github/scripts/triage-labels.sh --add-label bug --add-label prioridad-alta --remove-label necesita-info
#
# El número de issue se lee del payload del evento, nunca de un argumento: así Claude no puede
# etiquetar un issue distinto al que disparó el análisis.
#
# Adaptado de scripts/edit-issue-labels.sh en anthropics/claude-code-action.

set -euo pipefail

ISSUE=$(jq -r '.issue.number // empty' "${GITHUB_EVENT_PATH:?GITHUB_EVENT_PATH no está seteado}")
if ! [[ "$ISSUE" =~ ^[0-9]+$ ]]; then
  echo "Error: no hay número de issue en el payload del evento" >&2
  exit 1
fi

ADD_LABELS=()
REMOVE_LABELS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --add-label)
      ADD_LABELS+=("$2")
      shift 2
      ;;
    --remove-label)
      REMOVE_LABELS+=("$2")
      shift 2
      ;;
    *)
      echo "Error: argumento desconocido (solo se aceptan --add-label y --remove-label)" >&2
      exit 1
      ;;
  esac
done

if [[ ${#ADD_LABELS[@]} -eq 0 && ${#REMOVE_LABELS[@]} -eq 0 ]]; then
  exit 1
fi

# Solo se permiten labels que ya existen en el repo (evita que una alucinación rompa el run)
VALID_LABELS=$(gh label list --limit 500 --json name --jq '.[].name')

FILTERED_ADD=()
for label in "${ADD_LABELS[@]}"; do
  if echo "$VALID_LABELS" | grep -qxF "$label"; then
    FILTERED_ADD+=("$label")
  else
    echo "Aviso: label '$label' no existe en el repo, se ignora" >&2
  fi
done

FILTERED_REMOVE=()
for label in "${REMOVE_LABELS[@]}"; do
  if echo "$VALID_LABELS" | grep -qxF "$label"; then
    FILTERED_REMOVE+=("$label")
  else
    echo "Aviso: label '$label' no existe en el repo, se ignora" >&2
  fi
done

if [[ ${#FILTERED_ADD[@]} -eq 0 && ${#FILTERED_REMOVE[@]} -eq 0 ]]; then
  exit 0
fi

GH_ARGS=("issue" "edit" "$ISSUE")

for label in "${FILTERED_ADD[@]}"; do
  GH_ARGS+=("--add-label" "$label")
done

for label in "${FILTERED_REMOVE[@]}"; do
  GH_ARGS+=("--remove-label" "$label")
done

gh "${GH_ARGS[@]}"

if [[ ${#FILTERED_ADD[@]} -gt 0 ]]; then
  echo "Agregadas: ${FILTERED_ADD[*]}"
fi
if [[ ${#FILTERED_REMOVE[@]} -gt 0 ]]; then
  echo "Quitadas: ${FILTERED_REMOVE[*]}"
fi
