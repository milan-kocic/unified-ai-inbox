#!/bin/bash
TIMESTAMP=$(date +%Y-%m-%d-%H-%M)
FILENAME="backups/backup-${TIMESTAMP}.sql"
echo "Pravljenje backup-a: $FILENAME"
docker exec unified-inbox-postgres pg_dump -U inbox inbox > "$FILENAME"
echo "✅ Backup sačuvan: $FILENAME"
# Obriši stare od 30 dana
find backups -name "backup-*.sql" -mtime +30 -delete
echo "🧹 Obrisani backup-ovi stariji od 30 dana."
