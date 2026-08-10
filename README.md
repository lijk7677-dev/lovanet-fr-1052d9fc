# Here are your Instructions

## Sauvegardes rapides LOVABLE

Deux scripts de sauvegarde/restauration sont fournis pour l'app LOVABLE :

- `create-lovable-backup.sh` : crée un répertoire `backups/lovable-YYYYMMDD-HHMMSS/` contenant `lovable.tar.gz`, `git-head.txt` et `git-status.txt`.
- `restore-lovable-backup.sh` : restaure une archive produite par le script de création.

Exemples :

```bash
# sauvegarde (par défaut utilise /app/lovable, ou passez un chemin)
./create-lovable-backup.sh /app/lovable

# restauration
./restore-lovable-backup.sh backups/lovable-20260810-123456/lovable.tar.gz /app
```

Le script `git-update-stabilizer.sh` appelle désormais `create-lovable-backup.sh` en début d'exécution (best-effort) pour garantir qu'une sauvegarde est prise avant la stabilisation/déploiement.

Si tu veux que la sauvegarde soit obligatoire (bloquante) avant toute mise à jour, dis-le moi et je modifie le comportement.
