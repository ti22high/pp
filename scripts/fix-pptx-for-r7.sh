#!/usr/bin/env bash
# Чинит «битый для Р7» .pptx, прогоняя его через LibreOffice (normalize).
#
# Идея: большие PowerPoint-файлы, сделанные на Windows, часто ломаются в Р7
# Офис (OnlyOffice) — пропадают слайды, контент в мусор. LibreOffice открывает
# PowerPoint-файлы лучше и при пересохранении переписывает OOXML в чистую
# стандартную форму. Полученный .pptx Р7 открывает заметно надёжнее.
#
# Использование:
#   scripts/fix-pptx-for-r7.sh "/путь/broken.pptx" [выходная_папка]
#
# По умолчанию результат кладётся рядом, в подпапку ./fixed/.
#
# Требует установленного LibreOffice:
#   macOS:  brew install --cask libreoffice
#   Linux:  apt install libreoffice  (или штатный пакет дистрибутива)
set -euo pipefail

INPUT="${1:-}"
OUTDIR="${2:-./fixed}"

if [[ -z "$INPUT" || ! -f "$INPUT" ]]; then
  echo "Использование: $0 <broken.pptx> [выходная_папка]" >&2
  exit 1
fi

# Ищем soffice в типовых местах (macOS-бандл, затем PATH).
SOFFICE=""
for cand in \
  "/Applications/LibreOffice.app/Contents/MacOS/soffice" \
  "$(command -v soffice 2>/dev/null || true)" \
  "$(command -v libreoffice 2>/dev/null || true)"; do
  if [[ -n "$cand" && -x "$cand" ]]; then SOFFICE="$cand"; break; fi
done

if [[ -z "$SOFFICE" ]]; then
  echo "❌ LibreOffice не найден. Установи:  brew install --cask libreoffice" >&2
  exit 1
fi
echo "🔧 LibreOffice: $SOFFICE"

mkdir -p "$OUTDIR"
# Изолированный профиль — чтобы не конфликтовать с запущенным LibreOffice GUI.
PROFILE="$(mktemp -d)"
ABS_INPUT="$(cd "$(dirname "$INPUT")" && pwd)/$(basename "$INPUT")"

echo "📂 Вход:  $ABS_INPUT"
before=$(unzip -l "$ABS_INPUT" 2>/dev/null | grep -c 'ppt/slides/slide[0-9]*\.xml$' || echo "?")
echo "   слайдов в исходнике: $before"

echo "♻️  Пересохраняем через LibreOffice…"
"$SOFFICE" --headless --norestore \
  "-env:UserInstallation=file://$PROFILE" \
  --convert-to pptx --outdir "$OUTDIR" "$ABS_INPUT"

OUT_FILE="$OUTDIR/$(basename "${INPUT%.*}").pptx"
if [[ -f "$OUT_FILE" ]]; then
  after=$(unzip -l "$OUT_FILE" 2>/dev/null | grep -c 'ppt/slides/slide[0-9]*\.xml$' || echo "?")
  echo "✅ Готово: $OUT_FILE"
  echo "   слайдов в результате: $after  (было: $before)"
  echo ""
  echo "👉 Теперь открой '$OUT_FILE' в Р7 — проверь, на месте ли слайды/контент."
else
  echo "❌ LibreOffice не создал выходной файл — см. ошибки выше." >&2
  exit 1
fi
rm -rf "$PROFILE"
