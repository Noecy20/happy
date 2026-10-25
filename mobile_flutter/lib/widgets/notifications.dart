// Notifications in-app (table `notifications`).
// Remplace le temps réel de Supabase : l'app interroge le serveur toutes les 15 secondes.
// À chaque nouvelle notification : message à l'écran + rechargement des données concernées.
import 'dart:async';

import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import 'ui.dart';

/// Icône par type de notification.
IconData notifIcon(String? kind) => switch (kind) {
      'claim' => Icons.card_giftcard_rounded,
      'access' => Icons.verified_user_rounded,
      'order' => Icons.shopping_bag_rounded,
      'vendor' => Icons.storefront_rounded,
      'birthday' => Icons.cake_rounded,
      'reveal' => Icons.auto_awesome_rounded,
      'rsvp' => Icons.people_rounded,
      'expiry' => Icons.schedule_rounded,
      _ => Icons.notifications_rounded,
    };

/// Interroge régulièrement le serveur et prévient quand une notification arrive.
class NotificationPoller extends ChangeNotifier {
  NotificationPoller(this.userId, {this.onNew});
  final String userId;
  final void Function(Map<String, dynamic> n)? onNew;

  List<Map<String, dynamic>> items = [];
  Timer? _timer;
  bool _first = true;

  int get unread => items.where((n) => n['read'] != true).length;

  void start() {
    load();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => load());
  }

  Future<void> load() async {
    try {
      final rows = await api.select('notifications',
          filters: [Filter('user_id', 'eq', userId)], orderBy: 'created_at', desc: true, limit: 50);
      if (!_first) {
        final known = items.map((e) => e['id']).toSet();
        for (final n in rows.where((r) => !known.contains(r['id']))) {
          onNew?.call(n);
        }
      }
      _first = false;
      items = rows;
      notifyListeners();
    } catch (_) {
      // serveur momentanément injoignable : on réessaiera
    }
  }

  Future<void> markAllRead() async {
    await api.update('notifications', {'read': true}, [Filter('user_id', 'eq', userId), const Filter('read', 'eq', false)]);
    items = [for (final n in items) {...n, 'read': true}];
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}

/// Écran « Notifications ».
class NotificationsView extends StatelessWidget {
  const NotificationsView({super.key, required this.poller});
  final NotificationPoller poller;
  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: poller,
      builder: (context, _) => RefreshIndicator(
        color: HappyColors.candy,
        onRefresh: poller.load,
        child: ListView(padding: const EdgeInsets.fromLTRB(20, 16, 20, 40), children: [
          const Title2('Notifications'),
          const SizedBox(height: 12),
          if (poller.unread > 0)
            Align(
              alignment: Alignment.centerLeft,
              child: PillButton(
                label: 'Tout marquer comme lu (${poller.unread})',
                variant: BtnVariant.ghost,
                small: true,
                expand: false,
                onPressed: poller.markAllRead,
              ),
            ),
          const SizedBox(height: 12),
          if (poller.items.isEmpty) const EmptyBox('Aucune notification pour l’instant.', icon: Icons.notifications_rounded),
          for (final n in poller.items)
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: n['read'] == true ? Colors.white : fade(HappyColors.lilac, 0.7),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: softShadow),
                  child: Icon(notifIcon(n['kind'] as String?), size: 18, color: HappyColors.candy),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(n['title']?.toString() ?? '', style: body(14, weight: FontWeight.w700)),
                    if ((n['body'] ?? '').toString().isNotEmpty)
                      Padding(padding: const EdgeInsets.only(top: 2), child: Text(n['body'].toString(), style: body(13, color: HappyColors.muted, height: 1.4))),
                    const SizedBox(height: 4),
                    Text(formatDateTime(n['created_at'].toString()), style: body(11, color: const Color(0x661E1428))),
                  ]),
                ),
              ]),
            ),
        ]),
      ),
    );
  }
}
