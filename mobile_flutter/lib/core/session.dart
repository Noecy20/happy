// Session : qui est connecté et avec quel rôle (célébrant, boutique, admin).
// ChangeNotifier : les écrans qui l'écoutent se redessinent à la connexion / déconnexion.
import 'package:flutter/foundation.dart';

import 'api.dart';

class Session extends ChangeNotifier {
  Session._();
  static final Session instance = Session._();

  Map<String, dynamic>? profile;
  bool ready = false;

  String? get role => profile?['role'] as String?;
  String get userId => profile?['id'] as String? ?? '';

  /// Au lancement : relit le jeton et le profil. Compte supprimé → déconnexion propre.
  Future<void> restore() async {
    await api.init();
    try {
      profile = await api.me();
    } catch (_) {
      // Serveur injoignable ou session refusée (le client efface déjà un jeton refusé).
      profile = null;
    }
    ready = true;
    notifyListeners();
  }

  Future<void> refresh() async {
    profile = await api.me();
    notifyListeners();
  }

  Future<void> signOut() async {
    await api.signOut();
    profile = null;
    notifyListeners();
  }
}

final session = Session.instance;
