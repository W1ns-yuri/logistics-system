#!/bin/sh
# Полный бэкап базы (данные, файлы, пользователи): первый — через минуту после запуска, дальше раз в сутки.
# Храним KEEP_DAYS последних дней. Восстановление: см. deploy/README.md
set -u
sleep 60
while true; do
  file="/backups/omniroute-$(date +%Y-%m-%d_%H%M).dump"
  if pg_dump -h db -U omni -d omniroute -Fc -f "$file.tmp"; then
    mv "$file.tmp" "$file"
    echo "backup ok: $file ($(du -h "$file" | cut -f1))"
  else
    rm -f "$file.tmp"
    echo "backup FAILED" >&2
  fi
  find /backups -name 'omniroute-*.dump' -mtime +"$KEEP_DAYS" -delete
  sleep 86400
done
