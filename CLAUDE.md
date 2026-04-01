# Buy Pass Tickets

Ce fichier sert de contexte global rapide pour travailler sur le projet sans devoir relire tout le code ni tous les documents. Il doit permettre de comprendre :

- la pipeline applicative
- les points d'entree du front
- le role de chaque dossier et de chaque fichier important
- ce qui depend du code GitHub et ce qui depend aussi de Supabase

## Vue d'ensemble

Buy Pass Tickets est une application React/Vite avec deux espaces principaux :

- un espace `client` pour creer et suivre des demandes de billets
- un espace `admin` pour gerer les commandes, les clients et les evenements

Le backend repose sur Supabase pour :

- l'authentification
- les tables metier
- le stockage des avatars
- les policies RLS
- certaines fonctions SQL metier

## Pipeline Produit

Le flux principal du projet est le suivant :

1. un utilisateur arrive sur la page `Login`
2. il se connecte ou cree un compte via Supabase Auth
3. un enregistrement `profiles` est cree ou lu pour connaitre son role
4. `App.jsx` decide quoi afficher :
   - `AdminDashboard` si `role = admin`
   - `ClientDashboard` sinon
5. le client peut :
   - creer une demande `orders`
   - suivre son statut
   - discuter avec l'admin via `messages`
   - gerer son profil
   - acceder a l'espace communaute
6. l'admin peut :
   - lire toutes les commandes
   - modifier leur statut
   - repondre aux clients
   - gerer les evenements
   - consulter les profils clients

## Pipeline Technique

### Frontend

- Vite lance l'application
- `src/main.jsx` monte React
- `src/App.jsx` gere l'etat de session et l'aiguillage principal
- il n'y a pas de React Router ; la navigation repose sur des `useState` locaux et quelques query params

### Auth

- `supabase.auth.getSession()` restaure la session
- `supabase.auth.onAuthStateChange()` met a jour l'etat en temps reel
- `profiles.role` determine l'ecran affiche

### Base de donnees

Le projet depend fortement de la table `profiles` et, selon les fonctionnalites, de :

- `orders`
- `messages`
- `events`
- `reviews`
- `chat_groups`
- `chat_group_members`
- `chat_messages`
- `chat_group_invites`

Important :

- merger une PR ne suffit pas pour les changements SQL
- les migrations dans `supabase/migrations/` doivent aussi etre executees dans le projet Supabase cible
- sans cela, le front peut etre a jour mais certaines features restent cassees

### Preview locale

Le projet contient un mode preview pour l'espace communaute :

- `?preview=community`
- `?preview=community&section=profile`
- `?preview=community&section=reviews`
- `?preview=community&section=chat`

Ce mode sert uniquement a visualiser l'UI sans authentification reelle.

## Regles de travail importantes

- les changements applicatifs passent par Git / PR
- les changements RLS / tables / fonctions / storage passent par Supabase aussi
- `AGENTS.md` et `CLAUDE.md` servent de contexte de travail pour les agents
- ne pas supposer qu'une migration SQL a ete executee juste parce qu'elle existe dans le repo
- le projet est sensible aux policies RLS sur `profiles` et `chat_group_members`

## Arborescence Commentee

```text
/
├── .github/
│   ├── commands/
│   │   ├── gemini-invoke.toml
│   │   ├── gemini-plan-execute.toml
│   │   ├── gemini-review.toml
│   │   ├── gemini-scheduled-triage.toml
│   │   └── gemini-triage.toml
│   └── workflows/
│       ├── gemini-dispatch.yml
│       ├── gemini-invoke.yml
│       ├── gemini-plan-execute.yml
│       ├── gemini-review.yml
│       ├── gemini-scheduled-triage.yml
│       └── gemini-triage.yml
├── public/
│   ├── buypasslogo.png
│   └── porsche-911-gt3.jpg
├── src/
│   ├── assets/
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   ├── components/
│   │   ├── AvatarBadge.jsx
│   │   ├── ClientProfile.jsx
│   │   ├── CommunityHub.jsx
│   │   └── StarRating.jsx
│   ├── lib/
│   │   └── supabase.js
│   ├── pages/
│   │   ├── AdminDashboard.jsx
│   │   ├── ClientDashboard.jsx
│   │   ├── CommunityPreview.jsx
│   │   └── Login.jsx
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── supabase/
│   └── migrations/
│       ├── 20260401_community_features.sql
│       ├── 20260401_group_invites.sql
│       ├── 20260401_profile_policies.sql
│       └── 20260402_chat_policy_fix.sql
├── .env
├── .gitignore
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── postcss.config.cjs
├── tailwind.config.js
└── vite.config.js
```

## Explication Fichier Par Fichier

### Racine

#### `.env`
Variables d'environnement locales. Contient notamment :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Ce fichier ne doit pas etre commit.

#### `.gitignore`
Liste les fichiers a exclure du versioning :

- `.env`
- fichiers generes
- fichiers IDE
- logs

#### `AGENTS.md`
Contexte de travail pour les agents et assistants. Resume le projet, les conventions et le cadre technique.

#### `CLAUDE.md`
Ce document. Il doit rester un point d'entree synthétique pour comprendre rapidement le projet et sa pipeline.

#### `README.md`
Documentation generale du projet. Peut servir a l'onboarding humain, mais n'est pas aussi cible pipeline que `CLAUDE.md`.

#### `package.json`
Declare :

- les scripts npm
- les dependances front
- les dependances de dev

Scripts actuellement utilises :

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

#### `package-lock.json`
Verrouille les versions exactes installees par npm. Fichier standard de reproductibilite.

#### `index.html`
Template HTML Vite. Point d'ancrage du front React.

#### `vite.config.js`
Configuration Vite. Gere le build et le serveur de dev.

#### `tailwind.config.js`
Configuration Tailwind CSS.

#### `postcss.config.cjs`
Configuration PostCSS, utilisee avec Tailwind.

#### `eslint.config.js`
Configuration ESLint. Sert a maintenir un code front propre et coherent.

### `.github/`

Cette zone contient les automatisations GitHub orientees assistants / workflows.

#### `.github/commands/*.toml`
Definitions de commandes GitHub/agent pour des usages comme :

- invoke
- review
- triage
- plan/execute

Ces fichiers ne pilotent pas l'application utilisateur finale, mais la couche d'automatisation autour du repo.

#### `.github/workflows/*.yml`
Workflows GitHub Actions relies aux commandes ci-dessus. Ils servent aux executions automatisees de type review, triage, dispatch, etc.

### `public/`

Assets servis tels quels par Vite.

#### `public/buypasslogo.png`
Logo principal de Buy Pass utilise dans les interfaces.

#### `public/porsche-911-gt3.jpg`
Image statique poussee dans le repo. N'a pas de role metier central dans la pipeline actuelle.

### `src/`

Code applicatif principal.

#### `src/main.jsx`
Point d'entree React. Monte l'application dans le DOM.

#### `src/App.jsx`
Fichier central de bootstrap applicatif. Gere :

- la restauration de session Supabase
- l'ecoute des changements d'auth
- la resolution du role utilisateur
- le reset mot de passe
- le mode preview communautaire
- le choix entre `Login`, `AdminDashboard` et `ClientDashboard`

En pratique, c'est le vrai routeur logique de l'application.

#### `src/App.css`
Fichier CSS present dans le projet mais peu central dans la pipeline actuelle. La majorite du styling passe par Tailwind et `src/index.css`.

#### `src/index.css`
Styles globaux et integration Tailwind.

### `src/lib/`

#### `src/lib/supabase.js`
Initialise le client Supabase a partir des variables d'environnement Vite.
Tous les appels base/auth/storage passent ensuite par cet export.

### `src/assets/`

#### `src/assets/hero.png`
Asset graphique local pouvant etre reutilise pour des zones marketing ou de presentation.

#### `src/assets/react.svg`
Asset par defaut de l'ecosysteme Vite/React. Pas strategique pour le produit.

#### `src/assets/vite.svg`
Asset par defaut de l'ecosysteme Vite. Pas strategique pour le produit.

### `src/components/`

#### `src/components/AvatarBadge.jsx`
Composant d'avatar reutilisable.

Responsabilites :

- afficher une image de profil si `avatar_url` existe
- sinon afficher une pastille avec initiale
- gerer plusieurs tailles (`sm`, `md`, `lg`)

Ce composant est critique pour l'uniformite visuelle du profil et de la communaute.

#### `src/components/StarRating.jsx`
Composant de notation par etoiles.

Utilise pour :

- la saisie d'avis
- l'affichage des notes moyennes
- la lecture des avis publics

#### `src/components/ClientProfile.jsx`
Ecran profil du client.

Responsabilites :

- lecture du profil Supabase
- modification `full_name` et `phone`
- upload de photo de profil vers le bucket `avatars`
- reset du mot de passe
- affichage d'un historique synthetique d'achat

Depend de :

- `profiles`
- `storage.objects` bucket `avatars`
- policies RLS sur `profiles`

#### `src/components/CommunityHub.jsx`
Composant principal de l'espace communaute.

Responsabilites :

- lecture des profils publics utiles a l'UI communautaire
- lecture et publication des avis
- initialisation et lecture des salons
- affichage des messages
- creation de groupes evenement
- generation de liens d'invitation

Depend fortement de :

- `reviews`
- `chat_groups`
- `chat_group_members`
- `chat_messages`
- `chat_group_invites`
- fonctions SQL `create_event_chat_group` et `create_group_invite`

C'est aujourd'hui le composant le plus sensible aux erreurs RLS / migration manquante.

### `src/pages/`

#### `src/pages/Login.jsx`
Page d'authentification publique.

Gere trois modes :

- connexion
- creation de compte
- mot de passe oublie

Au signup, il cree aussi une ligne dans `profiles` avec :

- `full_name`
- `phone`
- `role = client`

#### `src/pages/ClientDashboard.jsx`
Espace principal client.

Responsabilites :

- lire les commandes du client
- lire les evenements actifs
- creer une nouvelle demande
- ouvrir le detail d'une commande
- envoyer des messages a l'admin
- afficher CGU
- ouvrir `ClientProfile`
- ouvrir `CommunityHub`
- accepter un lien d'invitation groupe via `groupInvite` dans l'URL

Ce fichier orchestre une grande partie de l'experience client.

#### `src/pages/AdminDashboard.jsx`
Espace principal admin.

Responsabilites :

- lire toutes les commandes
- lire les profils clients
- modifier prix, statut, ticket, cout
- archiver / desarchiver les commandes
- envoyer des messages aux clients
- gerer les evenements actifs
- consulter les clients
- afficher quelques stats de pilotage

Depend fortement d'un acces admin de lecture sur `profiles`.

#### `src/pages/CommunityPreview.jsx`
Page de preview locale de l'espace communaute.

Elle sert a :

- montrer des maquettes fonctionnelles sans login
- visualiser separement profil / avis / chat
- iterer sur l'UI avant validation

Ce n'est pas une page metier de production au sens parcours utilisateur standard.

### `supabase/`

#### `supabase/migrations/20260401_community_features.sql`
Migration principale des fonctionnalites communautaires.

Ajoute ou cree :

- `avatar_url` sur `profiles`
- `reviews`
- `chat_groups`
- `chat_group_members`
- `chat_messages`
- policies RLS associees
- bucket `avatars`
- fonction `create_event_chat_group`

Cette migration est fondamentale pour la communaute.

#### `supabase/migrations/20260401_group_invites.sql`
Ajoute le systeme d'invitation de groupe.

Cree :

- `chat_group_invites`
- fonction `create_group_invite`
- fonction `accept_group_invite`
- policies associees

#### `supabase/migrations/20260401_profile_policies.sql`
Migration de securisation et de fonctionnement du profil.

Ajoute ou renforce :

- `avatar_url` sur `profiles`
- policies lecture / creation / update sur `profiles`

Tres sensible, car une policy trop restrictive peut casser :

- le profil utilisateur
- la lecture admin des clients

#### `supabase/migrations/20260402_chat_policy_fix.sql`
Patch RLS pour eviter certaines boucles ou blocages sur les salons communautaires.

Ajoute notamment :

- `user_is_chat_group_member(...)`

et revoit les policies sur :

- `chat_groups`
- `chat_group_members`
- `chat_messages`
- `chat_group_invites`

## Fichiers Generes ou Non Strategiques

Certains fichiers existent mais ne doivent pas prendre trop de place mentale :

- `.DS_Store`
- `dist/` apres build
- `node_modules/`

Ils ne font pas partie de la logique produit.

## Points de Vigilance

### 1. Pas de vrai routeur front

Le projet ne repose pas sur React Router. Beaucoup de navigation depend d'etats locaux. Toute nouvelle page doit tenir compte de cette architecture.

### 2. Couplage fort avec Supabase

Une grande partie des regressions recentes provenait de ce point :

- code front correct
- mais SQL non execute ou policies inadaptées

Toujours verifier si le bug vient :

- du composant React
- d'une migration manquante
- d'une policy RLS

### 3. Table `profiles` critique

`profiles` alimente :

- le role utilisateur
- le nom / telephone en admin
- les avatars
- l'affichage communautaire

Toute modification sur `profiles` a un impact large.

### 4. Communaute = surface fragile

L'espace communautaire depend de plusieurs couches en meme temps :

- UI React
- RLS
- fonctions SQL
- storage avatars
- synchro profils

Il faut le considerer comme une zone a forte sensibilité.

## Commandes Utiles

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

Build de verification utilise frequemment :

```bash
npx -y node@22.12.0 ./node_modules/vite/bin/vite.js build
```

## Resume Ultra Court

Si tu ne dois retenir que l'essentiel :

- `App.jsx` decide qui voit quoi
- `Login.jsx` cree la session et le `profile`
- `ClientDashboard.jsx` orchestre l'espace client
- `AdminDashboard.jsx` orchestre l'espace admin
- `ClientProfile.jsx` gere infos perso + avatar
- `CommunityHub.jsx` gere avis + salons + groupes + invites
- `supabase/migrations/` est indispensable pour que les features communautaires marchent vraiment
- un merge Git sans execution SQL peut laisser l'application dans un etat partiellement casse
