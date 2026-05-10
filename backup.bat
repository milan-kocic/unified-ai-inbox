@echo off
set TIMESTAMP=%date:~7,2%-%date:~4,2%-%date:~10,4%-%time:~0,2%-%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%
set FILENAME=backups\backup-%TIMESTAMP%.sql
echo Pravljenje backup-a: %FILENAME%
docker exec unified-inbox-postgres pg_dump -U inbox inbox > %FILENAME%
echo Backup sačuvan: %FILENAME%
forfiles /p backups /s /m backup-*.sql /d -30 /c "cmd /c del @path"
echo Obrisani backup-ovi stariji od 30 dana.
