// Adresse du serveur API Happy (dossier server/).
// - Émulateur Android : 10.0.2.2 désigne l'ordinateur qui le fait tourner.
// - Téléphone réel sur le même Wi-Fi : lancer avec
//     flutter run --dart-define=API_URL=http://192.168.X.X:4000
const String apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:4000');

// Adresse publique du site, utilisée dans les liens de partage envoyés aux amis.
const String siteUrl = String.fromEnvironment('SITE_URL', defaultValue: 'https://happy.ci');
