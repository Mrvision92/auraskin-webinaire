/* ==========================================================
   Inscriptions au webinaire AuraSkin -> ce Google Sheets
   À coller dans Extensions > Apps Script du Google Sheets,
   puis à déployer en « Application Web » (voir README.md).
   ========================================================== */

// Lien de connexion au direct (Zoom, Google Meet…). Laisser vide tant qu'il n'est pas connu :
// l'email de confirmation annonce alors que le lien arrivera avant le début.
const LIEN_DIRECT = '';

// Envoyer un email de confirmation à chaque inscrit, depuis ce compte Google.
const ENVOYER_CONFIRMATION = true;

// Adresse qui reçoit une alerte à chaque nouvelle inscription. Vide = aucune alerte.
const EMAIL_ALERTE = '';

const ONGLET = 'Inscriptions';
const STATUTS = ['À contacter', 'Contacté', 'Démo planifiée', 'Gagné', 'Pas intéressé'];

// Ordre des colonnes du tableau : [champ envoyé par la page, titre de la colonne].
const COLONNES = [
  ['date_inscription', "Date d'inscription"],
  ['prenom', 'Prénom'],
  ['nom', 'Nom'],
  ['email', 'Email'],
  ['telephone', 'Téléphone'],
  ['societe', 'Société'],
  ['tva', 'Numéro de TVA'],
  ['delai_lancement', 'Délai de lancement'],
  ['question', 'Question'],
  ['statut', 'Statut'],
  ['notes', 'Notes'],
  ['lien_envoye', 'Lien envoyé'],
  ['consentement', 'Consentement'],
  ['utm_source', 'utm_source'],
  ['utm_medium', 'utm_medium'],
  ['utm_campaign', 'utm_campaign'],
  ['utm_content', 'utm_content'],
  ['utm_term', 'utm_term'],
  ['fbclid', 'fbclid'],
  ['gclid', 'gclid'],
  ['page', 'Page'],
];

/* ---------- Réception d'une inscription ---------- */
function doPost(e) {
  const p = (e && e.parameter) || {};

  // Robot (champ piège rempli) : on répond comme si tout allait bien, sans rien écrire.
  if (p.website) return reponse({ ok: true });
  if (!p.prenom || !p.nom || !p.email) return reponse({ ok: false, erreur: 'champs_manquants' });

  const verrou = LockService.getScriptLock();
  verrou.waitLock(15000);
  try {
    const onglet = ongletInscriptions();
    const ligne = COLONNES.map(function (colonne) {
      const cle = colonne[0];
      if (cle === 'date_inscription') return new Date();
      if (cle === 'statut') return STATUTS[0];
      return nettoyer(p[cle]);
    });
    onglet.appendRow(ligne);
  } finally {
    verrou.releaseLock();
  }

  // Un email qui échoue (quota Gmail atteint…) ne doit pas faire échouer l'inscription.
  try {
    if (ENVOYER_CONFIRMATION) envoyerConfirmation(p);
    if (EMAIL_ALERTE) envoyerAlerte(p);
  } catch (err) {
    console.warn('Email non envoyé : ' + err);
  }

  return reponse({ ok: true });
}

// Ouvrir l'URL de l'application Web dans un navigateur affiche ce message : utile pour tester.
function doGet() {
  return ContentService.createTextOutput('Réception des inscriptions AuraSkin : active.');
}

/* ---------- Envoi du lien à tous les inscrits ---------- */
// Le jour du webinaire : renseigner LIEN_DIRECT ci-dessus, enregistrer,
// puis choisir cette fonction dans la barre du haut et cliquer sur « Exécuter ».
// Chaque inscrit ne reçoit le lien qu'une fois (colonne « Lien envoyé »).
function envoyerLeLienATous() {
  if (!LIEN_DIRECT) throw new Error('Renseignez LIEN_DIRECT en haut du script avant d\'envoyer le lien.');

  const onglet = ongletInscriptions();
  const donnees = onglet.getDataRange().getValues();
  const col = indexColonnes();
  let envoyes = 0;

  for (let i = 1; i < donnees.length; i++) {
    const ligne = donnees[i];
    const email = String(ligne[col.email] || '').trim();
    if (!email || ligne[col.lien_envoye]) continue;
    if (MailApp.getRemainingDailyQuota() < 1) {
      console.warn('Quota d\'emails du jour atteint : relancez la fonction demain.');
      break;
    }
    MailApp.sendEmail({
      to: email,
      name: 'AuraSkin',
      subject: 'C\'est ce soir à 20h : votre lien pour le webinaire AuraSkin',
      htmlBody: gabarit(
        'Bonjour ' + echapper(ligne[col.prenom]) + ',',
        '<p>Le webinaire commence ce soir, dimanche 1<sup>er</sup> novembre, à 20h00 (heure de Bruxelles).</p>' +
        bouton(LIEN_DIRECT, 'Rejoindre le direct') +
        '<p>Connectez-vous quelques minutes avant le début. À tout à l\'heure !</p>'
      ),
    });
    onglet.getRange(i + 1, col.lien_envoye + 1).setValue(new Date());
    envoyes++;
  }
  console.log(envoyes + ' lien(s) envoyé(s).');
}

/* ---------- Emails ---------- */
function envoyerConfirmation(p) {
  const acces = LIEN_DIRECT
    ? bouton(LIEN_DIRECT, 'Rejoindre le direct') + '<p>Gardez cet email : ce lien vous servira le jour J.</p>'
    : '<p>Vous recevrez le lien de connexion par email avant le début du direct.</p>';

  MailApp.sendEmail({
    to: p.email,
    name: 'AuraSkin',
    subject: 'Votre place est réservée : webinaire AuraSkin du 1er novembre à 20h',
    htmlBody: gabarit(
      'Bonjour ' + echapper(p.prenom) + ',',
      '<p>Votre place est réservée pour notre webinaire gratuit : <strong>faites le bon choix avant d\'investir dans une machine laser</strong>.</p>' +
      '<p style="margin:24px 0;padding:16px 20px;background:#f7f0e2;border-radius:12px;color:#14110d;">' +
      '<strong>Dimanche 1<sup>er</sup> novembre 2026, 20h00</strong><br>Heure de Bruxelles. En ligne, depuis chez vous.</p>' +
      acces +
      '<p>Une question à préparer ? Répondez simplement à cet email.</p>'
    ),
  });
}

function envoyerAlerte(p) {
  const lignes = COLONNES
    .filter(function (c) { return p[c[0]]; })
    .map(function (c) { return c[1] + ' : ' + p[c[0]]; });
  MailApp.sendEmail(
    EMAIL_ALERTE,
    'Nouvelle inscription au webinaire : ' + p.prenom + ' ' + p.nom,
    lignes.join('\n') + '\n\n' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  );
}

function gabarit(salutation, corps) {
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#423d36;max-width:520px;">' +
    '<p style="font-size:20px;letter-spacing:4px;color:#14110d;margin:0 0 28px;">AURASKIN</p>' +
    '<p>' + salutation + '</p>' + corps +
    '<p style="margin-top:28px;">À très vite,<br>L\'équipe AuraSkin</p>' +
    '</div>';
}

function bouton(url, texte) {
  return '<p style="margin:24px 0;"><a href="' + echapper(url) + '" style="display:inline-block;padding:14px 26px;' +
    'background:#14110d;color:#ffffff;border-radius:999px;text-decoration:none;font-weight:bold;">' + texte + '</a></p>';
}

/* ---------- Tableau ---------- */
function ongletInscriptions() {
  const classeur = SpreadsheetApp.getActiveSpreadsheet();
  const onglet = classeur.getSheetByName(ONGLET) || classeur.getSheets()[0];
  if (PropertiesService.getDocumentProperties().getProperty('mise_en_forme') !== '1') {
    mettreEnForme(classeur, onglet);
  }
  return onglet;
}

// Mise en forme, faite une seule fois : titres, ligne figée, largeurs, format des dates, liste des statuts.
function mettreEnForme(classeur, onglet) {
  classeur.setSpreadsheetTimeZone('Europe/Brussels');
  onglet.setName(ONGLET);
  // Un tableau importé peut n'avoir qu'une ligne : on prépare 1 000 lignes mises en forme.
  if (onglet.getMaxRows() < 1000) onglet.insertRowsAfter(onglet.getMaxRows(), 1000 - onglet.getMaxRows());

  const titres = COLONNES.map(function (c) { return c[1]; });
  onglet.getRange(1, 1, 1, titres.length)
    .setValues([titres])
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#14110d')
    .setVerticalAlignment('middle');
  onglet.setRowHeight(1, 34);
  onglet.setFrozenRows(1);
  onglet.setFrozenColumns(3);

  const col = indexColonnes();
  onglet.getRange(2, col.date_inscription + 1, onglet.getMaxRows() - 1, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  onglet.getRange(2, col.lien_envoye + 1, onglet.getMaxRows() - 1, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  onglet.getRange(2, col.statut + 1, onglet.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUTS, true).setAllowInvalid(true).build()
  );

  const largeurs = { date_inscription: 140, email: 230, telephone: 140, societe: 170, delai_lancement: 190, question: 280, statut: 140, notes: 240 };
  Object.keys(largeurs).forEach(function (cle) { onglet.setColumnWidth(col[cle] + 1, largeurs[cle]); });

  PropertiesService.getDocumentProperties().setProperty('mise_en_forme', '1');
}

function indexColonnes() {
  const index = {};
  COLONNES.forEach(function (c, i) { index[c[0]] = i; });
  return index;
}

/* ---------- Outils ---------- */
// Un texte qui commence par = + - @ serait lu comme une formule : on le garde en texte.
function nettoyer(valeur) {
  const texte = String(valeur == null ? '' : valeur).trim().slice(0, 2000);
  return /^[=+\-@]/.test(texte) ? "'" + texte : texte;
}

function echapper(texte) {
  return String(texte == null ? '' : texte)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function reponse(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet)).setMimeType(ContentService.MimeType.JSON);
}
