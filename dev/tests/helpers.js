// Shared helpers for the unit tests.
const path = require('node:path');
const fs = require('node:fs');
const APP = path.join(__dirname, '..', '..', 'QuestionnaireJDR');
const core = require(path.join(APP, 'app/js/core.js'));
const charts = require(path.join(APP, 'app/js/charts.js'));
const reports = require(path.join(APP, 'app/js/reports.js'));
const configIO = require(path.join(APP, 'app/js/config-io.js'));
const xlsx = require(path.join(APP, 'app/js/xlsx.js'));
const JSZip = require(path.join(APP, 'app/vendor/jszip.min.js'));

function readRealConfig() {
  const dir = path.join(APP, 'configuration');
  const map = {};
  for (const f of ['questionnaire.yaml', 'rapport.yaml']) map[f] = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const f of fs.readdirSync(path.join(dir, 'attentes'))) map['attentes/' + f] = fs.readFileSync(path.join(dir, 'attentes', f), 'utf8');
  return configIO.configFromPathMap(map);
}

/** Small synthetic configuration (3 attentes, 3 questions). */
function miniConfig() {
  return {
    titre: 'Test', colonne_identifiant: '', colonne_horodatage: 'Horodateur',
    attentes: [
      { id: 'a', nom: 'Alpha', couleur: '#111111', titre: 'A ?', description: '', niveaux: [
        { a_partir_de: 0, titre: 'A1', texte: '' }, { a_partir_de: 50, titre: 'A2', texte: '' }] },
      { id: 'b', nom: 'Bêta', couleur: '#222222', titre: 'B ?', description: '', niveaux: [
        { a_partir_de: 0, titre: 'B1', texte: '' }, { a_partir_de: 25, titre: 'B2', texte: '' },
        { a_partir_de: 50, titre: 'B3', texte: '' }, { a_partir_de: 75, titre: 'B4', texte: '' }, { a_partir_de: 100, titre: 'B5', texte: '' }] },
      { id: 'c', nom: 'Gamma', couleur: '#333333', titre: 'C ?', description: '', niveaux: [
        { a_partir_de: 0, titre: 'C1', texte: '' }] }
    ],
    questions: [
      { id: 'q1', texte: 'Question l’une ?', reponses: [
        { texte: '... Réponse un.', poids: { a: 2 } },
        { texte: 'Réponse deux', poids: { b: 2, a: 1 } }] },
      { id: 'q2', texte: 'Question « deux »', reponses: [
        { texte: 'Oui', poids: { a: 1, b: 1 } },
        { texte: 'Non', poids: { b: 2 } }] },
      { id: 'q3', texte: 'Troisième', reponses: [
        { texte: 'X', poids: { a: 2 } },
        { texte: 'Y', poids: {} }] }
    ],
    rapport: {
      titre_rapport_individuel: 'Profil de {joueur}', introduction: 'Intro', titre_profil_dominant: 'Dominant',
      texte_profil_mixte: 'Mixte', conclusion: 'Fin', pied_de_page: 'Pied', titre_rapport_global: 'Global',
      introduction_rapport_global: 'Intro globale'
    }
  };
}

module.exports = { APP, core, charts, reports, configIO, xlsx, JSZip, readRealConfig, miniConfig };
