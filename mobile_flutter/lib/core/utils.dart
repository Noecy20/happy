// Fonctions utilitaires — copie fidèle de lib/utils.ts du site web :
// mêmes règles pour les prix (FCFA), l'identifiant téléphone, le prochain anniversaire, les couleurs.
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/* ------------------------------------------------------------------ */
/* Identifiant technique quand l'utilisateur n'a pas d'email           */
/* ------------------------------------------------------------------ */

/// « 07 08 09 10 11 » → « 0708091011@tel.happy.app ». Jamais affiché ni stocké dans profiles.email.
String phoneToEmail(String phone) => '${phone.replaceAll(RegExp(r'\D'), '')}@tel.happy.app';

/// Vrai si la saisie ressemble à un numéro (pas de @ et au moins 8 chiffres).
bool isPhone(String v) => !v.contains('@') && v.replaceAll(RegExp(r'\D'), '').length >= 8;

/* ------------------------------------------------------------------ */
/* Dates et montants (français, FCFA)                                   */
/* ------------------------------------------------------------------ */

/// "2026-12-20" → DateTime à midi (évite les décalages de fuseau).
DateTime parseDay(String iso) {
  final p = iso.substring(0, 10).split('-').map(int.parse).toList();
  return DateTime(p[0], p[1], p[2], 12);
}

/// DateTime → "AAAA-MM-JJ".
String toIso(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

String todayIso() => toIso(DateTime.now());

/// Première lettre en majuscule.
String capitalize(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);

/// « 20 décembre 2026 ».
String formatDate(String? iso) {
  if (iso == null || iso.isEmpty) return '';
  final d = iso.length > 10 ? DateTime.parse(iso).toLocal() : parseDay(iso);
  return DateFormat('d MMMM y', 'fr_FR').format(d);
}

/// « Samedi 20 décembre 2026 ».
String formatLongDate(String iso) => capitalize(DateFormat('EEEE d MMMM y', 'fr_FR').format(parseDay(iso)));

/// « samedi 20 décembre ».
String formatDayMonth(String iso) => DateFormat('EEEE d MMMM', 'fr_FR').format(parseDay(iso));

/// Date et heure courtes : « 09/10/2026 19:30 ».
String formatDateTime(String iso) => DateFormat('dd/MM/y HH:mm', 'fr_FR').format(DateTime.parse(iso).toLocal());

/// 45000 → « 45 000 FCFA » (espaces simples).
String formatPrice(num? n) {
  if (n == null) return '';
  return '${NumberFormat.decimalPattern('fr_FR').format(n).replaceAll(' ', ' ').replaceAll(' ', ' ')} FCFA';
}

/// Convertit un montant venant de l'API (nombre ou texte) en num.
num? toNum(dynamic v) => v == null ? null : (v is num ? v : num.tryParse(v.toString()));

/// Jours entre aujourd'hui et une date (négatif si passée).
int daysUntil(String iso) {
  final target = iso.length > 10 ? DateTime.parse(iso).toLocal() : parseDay(iso);
  final now = DateTime.now();
  final a = DateTime(now.year, now.month, now.day);
  final b = DateTime(target.year, target.month, target.day);
  return b.difference(a).inDays;
}

/* ------------------------------------------------------------------ */
/* Anniversaire                                                         */
/* ------------------------------------------------------------------ */

/// Prochain anniversaire et âge atteint (29 février → 28 février), comme next_birthday en SQL.
({String date, int age}) nextBirthday(String birth) {
  final b = parseDay(birth);
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  DateTime make(int y) {
    final d = DateTime(y, b.month, b.day);
    return d.month != b.month ? DateTime(y, 2, 28) : d;
  }

  var next = make(today.year);
  if (next.isBefore(today)) next = make(today.year + 1);
  return (date: toIso(next), age: next.year - b.year);
}

/* ------------------------------------------------------------------ */
/* Couleurs de thème et dress code                                      */
/* ------------------------------------------------------------------ */

const themeColors = <({String name, String hex})>[
  (name: 'Rose', hex: '#E0456B'),
  (name: 'Rose poudré', hex: '#F2B8C6'),
  (name: 'Rouge', hex: '#D62F3A'),
  (name: 'Bordeaux', hex: '#7A1033'),
  (name: 'Orange', hex: '#F27A1A'),
  (name: 'Or', hex: '#C9A044'),
  (name: 'Blanc', hex: '#F7F5F2'),
  (name: 'Noir', hex: '#1A1A1A'),
  (name: 'Bleu roi', hex: '#2F4BD8'),
  (name: 'Vert émeraude', hex: '#0F8F65'),
  (name: 'Lilas', hex: '#A98BE0'),
];

bool isHex(String v) => RegExp(r'^#[0-9a-fA-F]{6}$').hasMatch(v);

List<int> _rgb(String hex) {
  final h = hex.replaceAll('#', '');
  return [0, 2, 4].map((i) => int.parse(h.substring(i, i + 2), radix: 16)).toList();
}

/// "#E0456B" → Color.
Color hexColor(String? hex, [Color fallback = const Color(0xFFE0456B)]) {
  if (hex == null || !isHex(hex)) return fallback;
  return Color(int.parse('FF${hex.substring(1)}', radix: 16));
}

/// Couleur avec transparence (0 = transparent, 1 = opaque).
Color fade(Color c, double opacity) => c.withAlpha((opacity.clamp(0, 1) * 255).round());

/// Texte lisible (nuit ou blanc) sur une couleur de fond — même formule que le web.
Color readableOn(String? hex) {
  if (hex == null || !isHex(hex)) return Colors.white;
  final c = _rgb(hex);
  return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 > 150 ? const Color(0xFF1E1428) : Colors.white;
}

/// Couleur d'accent utilisable comme texte sur fond clair.
Color textAccentOf(String? hex) =>
    readableOn(hex) == Colors.white ? hexColor(hex) : const Color(0xFF1E1428);

const _named = <(String, List<int>)>[
  ('rose', [224, 69, 107]), ('rose poudré', [242, 184, 198]), ('fuchsia', [214, 40, 160]), ('rouge', [214, 47, 58]),
  ('bordeaux', [122, 16, 51]), ('orange', [242, 122, 26]), ('jaune', [245, 205, 50]), ('or', [201, 160, 68]),
  ('beige', [225, 205, 170]), ('marron', [120, 72, 40]), ('blanc', [247, 245, 242]), ('gris', [140, 140, 145]),
  ('noir', [26, 26, 26]), ('bleu ciel', [120, 185, 235]), ('bleu roi', [47, 75, 216]), ('bleu marine', [20, 35, 90]),
  ('turquoise', [40, 190, 185]), ('vert', [60, 170, 80]), ('vert émeraude', [15, 143, 101]), ('vert olive', [110, 120, 50]),
  ('violet', [110, 50, 160]), ('lilas', [169, 139, 224]),
];

/// Nom français le plus proche d'une couleur (pour le dress code « Tout en … »).
String colorName(String hex) {
  final c = _rgb(hex);
  var best = _named.first.$1;
  var d = double.infinity;
  for (final (n, v) in _named) {
    final dd = ((c[0] - v[0]) * (c[0] - v[0]) + (c[1] - v[1]) * (c[1] - v[1]) + (c[2] - v[2]) * (c[2] - v[2])).toDouble();
    if (dd < d) {
      d = dd;
      best = n;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Erreurs                                                              */
/* ------------------------------------------------------------------ */

/// Messages d'erreur d'authentification lisibles (reprise de authError du web).
String authError(String msg) {
  final m = msg.toLowerCase();
  if (m.contains('connexion') || m.contains('socket') || m.contains('failed host')) {
    return 'Serveur injoignable : vérifiez que le serveur Happy est lancé (npm start).';
  }
  if (m.contains('already registered')) return 'Ce compte existe déjà. Connectez-vous.';
  if (m.contains('invalid login credentials')) return 'Identifiant ou mot de passe incorrect.';
  if (m.contains('password')) return 'Mot de passe trop court : 6 caractères minimum.';
  return msg.isEmpty ? 'Une erreur est survenue.' : msg;
}

/// Lien WhatsApp vers un numéro.
String waLink(String phone, [String? text]) =>
    'https://wa.me/${phone.replaceAll(RegExp(r'\D'), '')}${text != null ? '?text=${Uri.encodeComponent(text)}' : ''}';

/// Moyens de paiement réellement configurés par l'admin dans `settings`.
List<({String name, String number})> paymentMethods(Map<String, dynamic>? cfg) {
  if (cfg == null) return [];
  final all = [
    ('Wave', cfg['wave_number']),
    ('Orange Money', cfg['orange_number']),
    ('MTN MoMo', cfg['mtn_number']),
    ('Moov Money', cfg['moov_number']),
  ];
  return [
    for (final (n, v) in all)
      if (v != null && v.toString().trim().isNotEmpty) (name: n, number: v.toString()),
  ];
}
