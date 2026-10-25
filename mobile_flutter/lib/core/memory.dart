// Mémoire locale du téléphone pour les visiteurs SANS compte (équivalent du localStorage du web) :
// codes de suivi des cadeaux réservés, réponse déjà envoyée à une invitation.
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class Memory {
  static const _gifts = 'happy-mes-cadeaux';

  /// Cadeaux réservés depuis ce téléphone : { idCadeau: codeDeSuivi }.
  static Future<Map<String, String>> myGifts() async {
    final p = await SharedPreferences.getInstance();
    try {
      return Map<String, String>.from(jsonDecode(p.getString(_gifts) ?? '{}') as Map);
    } catch (_) {
      return {};
    }
  }

  static Future<Map<String, String>> saveGift(String giftId, String code) async {
    final m = await myGifts();
    m[giftId] = code;
    final p = await SharedPreferences.getInstance();
    await p.setString(_gifts, jsonEncode(m));
    return m;
  }

  static Future<String?> rsvp(String token) async => (await SharedPreferences.getInstance()).getString('happy-rsvp-$token');
  static Future<void> saveRsvp(String token, String label) async =>
      (await SharedPreferences.getInstance()).setString('happy-rsvp-$token', label);
}
