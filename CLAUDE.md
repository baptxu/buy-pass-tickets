# Projet : Buy Pass Tickets

Ce document sert de guide de référence pour comprendre la structure, les enjeux techniques et les conventions du projet **Buy Pass Tickets**.

## 🚀 Vue d'ensemble
**Buy Pass Tickets** est une application web moderne permettant la gestion et l'achat de tickets, avec des interfaces dédiées pour les clients et les administrateurs.

## 🛠 Tech Stack
- **Frontend :** [React 19](https://react.dev/) (Vite comme build tool)
- **Styling :** [Tailwind CSS](https://tailwindcss.com/)
- **Backend/Base de données :** [Supabase](https://supabase.com/) (Authentification et stockage de données)
- **Linting :** ESLint

## 📁 Structure du Projet
```text
/
├── public/                 # Assets statiques (logos, etc.)
├── src/
│   ├── assets/             # Images et icônes
│   ├── lib/                # Configurations de bibliothèques tierces
│   │   └── supabase.js     # Client Supabase (URL & Clé Anon)
│   ├── pages/              # Pages principales de l'application
│   │   ├── Login.jsx       # Interface d'authentification
│   │   ├── ClientDashboard.jsx # Interface pour les utilisateurs finaux
│   │   └── AdminDashboard.jsx  # Interface de gestion pour les admins
│   ├── App.jsx             # Racine du routing et de la structure logicielle
│   ├── main.jsx            # Point d'entrée de l'application
│   └── index.css           # Directives Tailwind et styles globaux
├── .gitignore              # Fichiers et dossiers exclus du suivi Git (Sécurité)
├── package.json            # Dépendances et scripts de build
├── tailwind.config.js      # Configuration Tailwind
└── vite.config.js          # Configuration Vite
```

## 🔐 Enjeux de Sécurité & Configuration
1. **Variables d'environnement :** Le projet utilise un fichier `.env` (non versionné) pour stocker les clés Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
2. **Hygiène Git :** Le fichier `.gitignore` a été renforcé pour éviter de committer des fichiers sensibles (`.env`, dossiers d'IDE, logs, etc.).
3. **Authentification :** Gérée via Supabase Auth. Les rôles (Client vs Admin) déterminent l'accès aux dashboards spécifiques.

## ⌨️ Commandes Utiles
- `npm run dev` : Lance le serveur de développement local.
- `npm run build` : Génère les fichiers pour la production dans le dossier `dist/`.
- `npm run lint` : Vérifie la qualité du code.
- `npm run preview` : Visualise le build de production localement.

## 📝 Conventions de Développement
- **Composants :** Utilisation de composants fonctionnels React avec Hooks.
- **Styling :** Priorité aux classes utilitaires Tailwind CSS.
- **Données :** Appels asynchrones via le client Supabase exporté depuis `src/lib/supabase.js`.
