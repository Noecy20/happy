// Données de l'espace célébrant, partagées entre ses onglets.
// Sources (filtrées par les règles RLS de PostgreSQL) :
// - events          : SON anniversaire,
// - get_my_gifts()  : ses cadeaux avec `claimed` ; friend_name / friend_message seulement
//                     à partir du lendemain de l'anniversaire (anonymat garanti en SQL),
// - access_requests : une demande est-elle en attente ?
// - rsvps           : réponses à l'invitation.
import 'package:flutter/foundation.dart';

import '../../core/api.dart';
import '../../core/session.dart';
import '../../core/utils.dart';

class CelebrantStore extends ChangeNotifier {
  bool loading = true;
  Map<String, dynamic>? event;
  List<Map<String, dynamic>> gifts = [];
  bool revealed = false;
  bool pending = false;
  List<Map<String, dynamic>> rsvps = [];
  String? error;

  Map<String, dynamic> get profile => session.profile ?? const {};
  String? get expires => profile['access_expires_at'] as String?;
  bool get hasAccess => expires != null && DateTime.parse(expires!).isAfter(DateTime.now());
  int get daysLeft => expires == null ? 0 : daysUntil(expires!);
  int get taken => gifts.where((g) => g['claimed'] == true).length;
  int get age => event == null
      ? 0
      : int.parse(event!['birthday_date'].toString().substring(0, 4)) - int.parse(event!['birth_date'].toString().substring(0, 4));

  /// Recharge tout (profil, anniversaire, demande en cours, réponses, cadeaux).
  Future<void> load() async {
    try {
      await session.refresh();
      final uid = session.userId;
      event = await api.selectOne('events', filters: [Filter('owner_id', 'eq', uid)]);
      final reqs = await api.select('access_requests', select: 'id', filters: [Filter('user_id', 'eq', uid), const Filter('status', 'eq', 'en_attente')]);
      pending = reqs.isNotEmpty;
      rsvps = event == null
          ? []
          : await api.select('rsvps', filters: [Filter('event_id', 'eq', event!['id'])], orderBy: 'created_at', desc: true);
      await loadGifts(notify: false);
      error = null;
    } on ApiException catch (e) {
      error = e.message;
    }
    loading = false;
    notifyListeners();
  }

  Future<void> loadGifts({bool notify = true}) async {
    final r = await api.rpc('get_my_gifts');
    final m = Map<String, dynamic>.from(r as Map);
    gifts = (m['gifts'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    revealed = m['revealed'] == true;
    if (notify) notifyListeners();
  }

  void setEvent(Map<String, dynamic>? e) {
    event = e;
    notifyListeners();
  }

  void setPending(bool v) {
    pending = v;
    notifyListeners();
  }
}
