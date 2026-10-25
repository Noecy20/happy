# Happy, serveur API (PostgreSQL local)

```bash
npm install
npm run setup -- MOT_DE_PASSE_POSTGRES     # crée .env, la base « happy » et toutes les tables
npm run admin -- 0700000000 admin123 "Nom"  # crée un administrateur
npm start                                   # http://localhost:4000 (émulateur : http://10.0.2.2:4000)
npm test                                    # 21 vérifications de bout en bout (serveur lancé)
```

Voir `../GUIDE-FLUTTER.md`.
