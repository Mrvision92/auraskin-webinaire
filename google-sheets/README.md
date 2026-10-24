# Inscriptions au webinaire dans Google Sheets

Chaque inscription faite sur la page arrive dans le Google Sheets
« Inscriptions webinaire AuraSkin, 1er novembre 2026 », et l'inscrit reçoit un email de
confirmation envoyé depuis votre compte Google.

## Mise en place (une seule fois, 5 minutes)

1. Ouvrez le Google Sheets, puis **Extensions → Apps Script**.
2. Effacez tout le code présent, collez le contenu de `Code.gs`, puis cliquez sur l'icône
   **Enregistrer**.
3. Cliquez sur **Déployer → Nouveau déploiement**. Avec la roue dentée, choisissez le type
   **Application Web**, puis réglez :
   - **Exécuter en tant que :** Moi
   - **Qui a accès :** Tout le monde
4. Cliquez sur **Déployer**, puis **Autoriser l'accès**. Choisissez votre compte. Si Google affiche
   « Google n'a pas validé cette application », cliquez sur **Paramètres avancés**, puis
   **Accéder au projet (non sécurisé)**, puis **Autoriser**. C'est normal pour un script
   personnel.
5. Copiez l'**URL de l'application Web** (elle se termine par `/exec`) et collez-la dans
   `CONFIG.endpoint`, en haut de `app.js`.

## Le jour du webinaire

1. Dans Apps Script, mettez le lien Zoom ou Google Meet dans `LIEN_DIRECT`, en haut du script, puis
   enregistrez.
2. Dans la barre du haut, choisissez la fonction `envoyerLeLienATous`, puis cliquez sur
   **Exécuter**. Chaque inscrit reçoit le lien une seule fois, et la colonne « Lien envoyé » se
   remplit.

Un compte Gmail gratuit peut envoyer environ 100 emails par jour depuis un script, et un compte
Google Workspace environ 1 500. Si le quota est atteint, l'inscription est quand même enregistrée.
Pour le lien, relancez simplement la fonction le lendemain : elle reprend où elle s'était arrêtée.

## Après une modification du script

Faites **Déployer → Gérer les déploiements → Modifier (crayon) → Version : Nouvelle version →
Déployer**. L'URL reste la même.
