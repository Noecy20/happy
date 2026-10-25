// Design system Happy : mêmes couleurs et polices que le site web.
// Titres : Cormorant Garamond 600. Texte : Manrope. Cartes arrondies, boutons en pilule.
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class HappyColors {
  static const ink = Color(0xFF1E1428);    // nuit : texte, fonds sombres
  static const plum = Color(0xFF3A2150);   // prune
  static const candy = Color(0xFFE0456B);  // rose Happy : action principale
  static const mango = Color(0xFFC8A26A);  // champagne : rubans, accents
  static const lilac = Color(0xFFF6E7EA);  // blush : surfaces douces
  static const paper = Color(0xFFFCFAFB);  // porcelaine : fond
  static const mint = Color(0xFF4E9C80);   // sauge : succès
  static const gold = Color(0xFF8A6A35);   // texte sur fond champagne
  static const muted = Color(0x8C1E1428);  // texte secondaire (55 %)
  static const line = Color(0x141E1428);   // bordures très légères (8 %)
}

/// Titre élégant en Cormorant Garamond.
TextStyle display(double size, {Color color = HappyColors.ink, double height = 1.05}) =>
    GoogleFonts.cormorantGaramond(fontSize: size, fontWeight: FontWeight.w600, color: color, height: height);

/// Texte courant en Manrope.
TextStyle body(double size, {Color color = HappyColors.ink, FontWeight weight = FontWeight.w400, double? height}) =>
    GoogleFonts.manrope(fontSize: size, color: color, fontWeight: weight, height: height);

/// Ombre douce (équivalent shadow-popsm du web).
const softShadow = [BoxShadow(color: Color(0x261E1428), blurRadius: 24, offset: Offset(0, 10), spreadRadius: -12)];

ThemeData happyTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: HappyColors.candy, primary: HappyColors.candy, surface: HappyColors.paper),
    scaffoldBackgroundColor: HappyColors.paper,
  );
  return base.copyWith(
    textTheme: GoogleFonts.manropeTextTheme(base.textTheme).apply(bodyColor: HappyColors.ink, displayColor: HappyColors.ink),
    appBarTheme: const AppBarTheme(backgroundColor: HappyColors.paper, foregroundColor: HappyColors.ink, elevation: 0, scrolledUnderElevation: 0),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating, backgroundColor: HappyColors.ink),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      hintStyle: const TextStyle(color: Color(0x591E1428)),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0x1A1E1428))),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0x1A1E1428))),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: HappyColors.candy, width: 1.5)),
    ),
  );
}
