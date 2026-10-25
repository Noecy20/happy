# Prépare le dossier Android de l'application Happy (à lancer UNE fois, dans ce dossier) :
#   powershell -ExecutionPolicy Bypass -File setup_android.ps1
# 1. Génère les fichiers Android (flutter create ne touche pas à lib/ ni à pubspec.yaml).
# 2. Autorise les appels HTTP vers le serveur local (http://10.0.2.2:4000) et l'accès Internet.
# 3. Télécharge les dépendances.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

flutter create --org com.progistack --project-name happy --platforms android .

$m = "android\app\src\main\AndroidManifest.xml"
$x = [IO.File]::ReadAllText((Resolve-Path $m))
if ($x -notmatch 'usesCleartextTraffic') {
  $x = $x -replace '<application', '<application android:usesCleartextTraffic="true"'
}
if ($x -notmatch 'android.permission.INTERNET') {
  $x = $x -replace '(<manifest[^>]*>)', "`$1`r`n    <uses-permission android:name=`"android.permission.INTERNET`" />"
}
$x = $x -replace 'android:label="happy"', 'android:label="Happy"'
[IO.File]::WriteAllText((Resolve-Path $m), $x)
Write-Host "AndroidManifest.xml : HTTP local et Internet autorisés."

flutter pub get
Write-Host ""
Write-Host "Prêt. Démarrez l'émulateur puis : flutter run"
