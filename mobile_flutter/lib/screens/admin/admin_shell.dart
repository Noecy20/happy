// Espace administrateur : Utilisateurs, Boutiques (bientôt disponible), Messages, Réglages.
// Les règles RLS autorisent l'admin à lire profiles, access_requests, contact_messages, events ;
// les actions sensibles passent par des fonctions SQL qui revérifient is_admin() côté base
// (admin_handle_request, admin_grant_access, admin_revoke_access) et par la route serveur de suppression.
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../widgets/coming_soon.dart';
import '../../widgets/illustrations.dart';
import '../../widgets/notifications.dart';
import '../../widgets/ui.dart';

/// Données partagées par les onglets admin.
class AdminStore extends ChangeNotifier {
  bool loading = true;
  List<Map<String, dynamic>> profiles = [], requests = [], messages = [], events = [];

  Future<void> load() async {
    try {
      final r = await Future.wait([
        api.select('profiles', filters: [const Filter('role', 'neq', 'admin')], orderBy: 'created_at', desc: true),
        api.select('access_requests', orderBy: 'created_at', desc: true),
        api.select('contact_messages', orderBy: 'created_at', desc: true),
        api.select('events'),
      ]);
      profiles = r[0];
      requests = r[1];
      messages = r[2];
      events = r[3];
    } catch (_) {}
    loading = false;
    notifyListeners();
  }

  /// Demande en attente la plus récente de chaque utilisateur.
  Map<String, Map<String, dynamic>> get pendingOf {
    final m = <String, Map<String, dynamic>>{};
    for (final x in requests.where((x) => x['status'] == 'en_attente')) {
      m.putIfAbsent(x['user_id'].toString(), () => x);
    }
    return m;
  }

  /// Exécute une action admin, affiche le résultat et recharge.
  Future<void> act(BuildContext context, Future<dynamic> Function() fn, String ok) async {
    try {
      await fn();
      if (context.mounted) toast(context, ok);
      await load();
    } on ApiException catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }
}

/// État de l'accès d'un utilisateur : jamais, actif ou expire.
String accessState(Map<String, dynamic> p) {
  final e = p['access_expires_at'];
  if (e == null) return 'jamais';
  return DateTime.parse(e.toString()).isAfter(DateTime.now()) ? 'actif' : 'expire';
}

class AdminShell extends StatefulWidget {
  const AdminShell({super.key});
  @override
  State<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends State<AdminShell> {
  final store = AdminStore();
  late final NotificationPoller poller;
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    store.load();
    // Nouvelle demande d'accès : notification + rechargement
    poller = NotificationPoller(session.userId, onNew: (n) {
      if (mounted) toast(context, n['title'].toString());
      store.load();
    })
      ..start();
  }

  @override
  void dispose() {
    poller.dispose();
    store.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        final pending = store.pendingOf.length;
        final newMessages = store.messages.where((m) => m['status'] == 'en_attente').length;
        final pages = [
          UsersTab(store: store),
          ListView(padding: const EdgeInsets.all(20), children: const [
            AdminHeader(title: 'Boutiques'),
            SizedBox(height: 16),
            ComingSoon(
              title: 'Gestion des boutiques',
              text: 'Validation des boutiques après paiement, vitrines, articles, commandes et stock : '
                  'cette partie arrive très bientôt. Les tables existent déjà dans la base.',
            ),
          ]),
          MessagesTab(store: store),
          const SettingsTab(),
        ];
        return Scaffold(
          body: SafeArea(child: store.loading ? const Loading() : IndexedStack(index: _tab, children: pages)),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _tab,
            onDestinationSelected: (i) => setState(() => _tab = i),
            backgroundColor: Colors.white,
            indicatorColor: HappyColors.lilac,
            destinations: [
              NavigationDestination(
                icon: Badge(isLabelVisible: pending > 0, label: Text('$pending'), child: const Icon(Icons.people_rounded)),
                label: 'Utilisateurs',
              ),
              const NavigationDestination(icon: Icon(Icons.storefront_rounded), label: 'Boutiques'),
              NavigationDestination(
                icon: Badge(isLabelVisible: newMessages > 0, label: Text('$newMessages'), child: const Icon(Icons.inbox_rounded)),
                label: 'Messages',
              ),
              const NavigationDestination(icon: Icon(Icons.settings_rounded), label: 'Réglages'),
            ],
          ),
        );
      },
    );
  }
}

/// En-tête sombre illustré (confettis).
class AdminHeader extends StatelessWidget {
  const AdminHeader({super.key, required this.title});
  final String title;
  @override
  Widget build(BuildContext context) => Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(color: HappyColors.ink, borderRadius: BorderRadius.circular(32)),
        child: Stack(children: [
          const Positioned.fill(child: ConfettiBackground(seed: 11, opacity: 0.5)),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Happy · Administration', style: body(13, color: const Color(0x99FFFFFF), weight: FontWeight.w600)),
              Text(title, style: display(42, color: Colors.white)),
            ]),
          ),
        ]),
      );
}

/* ================================================================== */
/* Utilisateurs                                                         */
/* ================================================================== */

class UsersTab extends StatefulWidget {
  const UsersTab({super.key, required this.store});
  final AdminStore store;
  @override
  State<UsersTab> createState() => _UsersTabState();
}

class _UsersTabState extends State<UsersTab> {
  String _filter = 'tous';
  final _q = TextEditingController();

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  AdminStore get s => widget.store;

  Future<void> _decide(String reqId, bool approve) => s.act(
      context, () => api.rpc('admin_handle_request', {'p_request': reqId, 'p_approve': approve}), approve ? 'Demande accordée' : 'Demande refusée');

  @override
  Widget build(BuildContext context) {
    final pendingOf = s.pendingOf;
    final celebrants = s.profiles.where((p) => p['role'] == 'celebrant').toList();
    final q = _q.text.toLowerCase();
    final list = celebrants
        .where((p) => q.isEmpty || '${p['full_name']} ${p['email'] ?? ''} ${p['phone'] ?? ''}'.toLowerCase().contains(q))
        .where((p) {
          final st = accessState(p);
          return switch (_filter) {
            'attente' => pendingOf.containsKey(p['id']),
            'actifs' => st == 'actif',
            'expires' => st == 'expire',
            'jamais' => st == 'jamais',
            _ => true,
          };
        })
        .toList()
      ..sort((a, b) => (pendingOf.containsKey(b['id']) ? 1 : 0) - (pendingOf.containsKey(a['id']) ? 1 : 0)); // demandes en premier

    return RefreshIndicator(
      color: HappyColors.candy,
      onRefresh: s.load,
      child: ListView(padding: const EdgeInsets.fromLTRB(20, 16, 20, 40), children: [
        const AdminHeader(title: 'Utilisateurs'),
        const SizedBox(height: 16),
        Row(children: [
          Expanded(child: StatTile(value: '${pendingOf.length}', label: 'Demandes en attente', highlight: pendingOf.isNotEmpty)),
          const SizedBox(width: 12),
          Expanded(child: StatTile(value: '${celebrants.where((p) => accessState(p) == 'actif').length}', label: 'Accès actifs')),
        ]),
        const SizedBox(height: 16),
        TextField(
          controller: _q,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(hintText: 'Nom, email, téléphone…', prefixIcon: Icon(Icons.search_rounded)),
        ),
        const SizedBox(height: 12),
        Pills<String>(
          value: _filter,
          onChanged: (v) => setState(() => _filter = v),
          options: [
            (key: 'tous', label: 'Tous'),
            (key: 'attente', label: pendingOf.isEmpty ? 'En attente' : 'En attente (${pendingOf.length})'),
            (key: 'actifs', label: 'Actifs'),
            (key: 'expires', label: 'Expirés'),
            (key: 'jamais', label: 'Jamais activés'),
          ],
        ),
        const SizedBox(height: 16),
        if (list.isEmpty) const EmptyBox('Aucun utilisateur dans cette vue.', icon: Icons.people_rounded),
        for (final p in list) _userCard(p, pendingOf[p['id']]),
      ]),
    );
  }

  Widget _userCard(Map<String, dynamic> p, Map<String, dynamic>? pend) {
    final name = (p['full_name'] ?? 'Sans nom').toString();
    return HCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        InkWell(
          onTap: () => _openUser(p),
          child: Row(children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: HappyColors.lilac,
              child: Text(name.isEmpty ? '?' : name[0].toUpperCase(), style: display(20, color: HappyColors.candy)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: body(15, weight: FontWeight.w700)),
                Text([p['phone'], p['email']].where((x) => x != null && x.toString().isNotEmpty).join(' · '),
                    maxLines: 1, overflow: TextOverflow.ellipsis, style: body(13, color: HappyColors.muted)),
                const SizedBox(height: 6),
                Wrap(spacing: 6, runSpacing: 6, children: [
                  StatusTag(p: p),
                  if (pend != null)
                    Tag(
                      '${pend['kind'] == 'acces' ? 'Demande d’accès' : 'Prolongation'} · ${pend['days_requested']} j${pend['amount'] != null ? ' · ${formatPrice(toNum(pend['amount']))}' : ''}',
                      tone: TagTone.candy,
                    ),
                ]),
              ]),
            ),
            const Icon(Icons.chevron_right_rounded, color: Color(0x4D1E1428)),
          ]),
        ),
        if (pend != null) ...[
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
              child: PillButton(label: 'Accorder', icon: Icons.check_rounded, variant: BtnVariant.candy, small: true, onPressed: () => _decide(pend['id'].toString(), true)),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: PillButton(label: 'Refuser', icon: Icons.close_rounded, variant: BtnVariant.ghost, small: true, onPressed: () => _decide(pend['id'].toString(), false)),
            ),
          ]),
        ],
      ]),
    );
  }

  /// Fiche détaillée : contacts, anniversaire, demande + paiement + capture, accorder, historique, couper, supprimer.
  void _openUser(Map<String, dynamic> p) {
    final uid = p['id'].toString();
    showSheet(context, title: (p['full_name'] ?? 'Utilisateur').toString(), builder: (ctx) {
      final requests = s.requests.where((r) => r['user_id'] == uid).toList();
      final pending = requests.where((r) => r['status'] == 'en_attente').toList();
      final pend = pending.isEmpty ? null : pending.first;
      final ev = s.events.where((e) => e['owner_id'] == uid).toList();
      final active = accessState(p) == 'actif';
      var days = pend != null && [7, 15, 30, 60, 90].contains(pend['days_requested']) ? pend['days_requested'] as int : 30;

      return StatefulBuilder(builder: (ctx, setS) {
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if ((p['phone'] ?? '').toString().isNotEmpty)
            InfoRow(Icons.phone_rounded, p['phone'].toString(), onTap: () => launchUrl(Uri.parse(waLink(p['phone'].toString())), mode: LaunchMode.externalApplication)),
          if ((p['email'] ?? '').toString().isNotEmpty) InfoRow(Icons.mail_rounded, p['email'].toString()),
          Padding(padding: const EdgeInsets.only(bottom: 8), child: Wrap(children: [StatusTag(p: p)])),
          Muted('Inscrit le ${formatDate(p['created_at'].toString())}', size: 13),
          const SizedBox(height: 14),
          if (ev.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 14),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: HappyColors.line)),
              child: Row(children: [
                Container(width: 40, height: 40, decoration: BoxDecoration(color: hexColor(ev.first['theme_color'] as String?), borderRadius: BorderRadius.circular(12))),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text((ev.first['title'] ?? '').toString().isNotEmpty ? ev.first['title'].toString() : 'Anniversaire de ${ev.first['celebrant_name']}',
                        style: body(14, weight: FontWeight.w700)),
                    Text('${formatDate(ev.first['birthday_date'].toString())} · ${ev.first['published'] == true ? 'publiée' : 'brouillon'}',
                        style: body(12, color: HappyColors.muted)),
                  ]),
                ),
              ]),
            )
          else
            const Padding(padding: EdgeInsets.only(bottom: 14), child: Muted('Anniversaire pas encore créé.', size: 13)),

          if (pend != null)
            Container(
              margin: const EdgeInsets.only(bottom: 18),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: fade(HappyColors.candy, 0.05),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: fade(HappyColors.candy, 0.2)),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Text('${pend['kind'] == 'acces' ? 'Demande d’accès' : 'Demande de prolongation'} · ${pend['days_requested']} jours',
                    style: body(15, weight: FontWeight.w700)),
                Text('Envoyée le ${formatDate(pend['created_at'].toString())}${pend['end_date'] != null ? ' · jusqu’au ${formatDate(pend['end_date'].toString())}' : ''}',
                    style: body(13, color: HappyColors.muted)),
                const SizedBox(height: 10),
                if ((pend['payment_ref'] ?? '').toString().isNotEmpty) ...[
                  Text.rich(TextSpan(style: body(13), children: [
                    TextSpan(text: formatPrice(toNum(pend['amount'])), style: body(13, weight: FontWeight.w700)),
                    TextSpan(text: ' par ${pend['payment_method']} · réf. '),
                    TextSpan(text: pend['payment_ref'].toString(), style: body(13, weight: FontWeight.w700)),
                  ])),
                  if (imageUrl(pend['proof_url'] as String?) != null) ...[
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: Image.network(imageUrl(pend['proof_url'] as String?)!, height: 200, fit: BoxFit.cover),
                    ),
                  ],
                ] else
                  Text('Aucun paiement déclaré.', style: body(13, color: HappyColors.candy, weight: FontWeight.w600)),
                if ((pend['message'] ?? '').toString().isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Text(pend['message'].toString(), style: body(13))),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(
                    child: PillButton(
                      label: 'Accorder',
                      icon: Icons.check_rounded,
                      variant: BtnVariant.candy,
                      small: true,
                      onPressed: () async {
                        Navigator.pop(ctx);
                        await _decide(pend['id'].toString(), true);
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: PillButton(
                      label: 'Refuser',
                      variant: BtnVariant.ghost,
                      small: true,
                      onPressed: () async {
                        Navigator.pop(ctx);
                        await _decide(pend['id'].toString(), false);
                      },
                    ),
                  ),
                ]),
              ]),
            ),

          FieldLabel(active ? 'Prolonger l’accès' : 'Accorder un accès'),
          Pills<int>(value: days, onChanged: (d) => setS(() => days = d), options: [for (final d in [7, 15, 30, 60, 90]) (key: d, label: '$d jours')]),
          const SizedBox(height: 12),
          PillButton(
            label: 'Oui, accorder',
            icon: Icons.check_rounded,
            onPressed: () async {
              Navigator.pop(ctx);
              await s.act(context, () => api.rpc('admin_grant_access', {'p_user': uid, 'p_days': days}), 'Accès accordé pour $days jours');
            },
          ),

          if (requests.isNotEmpty) ...[
            const SizedBox(height: 20),
            const FieldLabel('Historique des demandes'),
            for (final r in requests)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: HappyColors.line))),
                child: Row(children: [
                  Expanded(
                    child: Text('${r['kind'] == 'acces' ? 'Accès' : 'Prolongation'} · ${r['days_requested']} j · ${formatDate(r['created_at'].toString())}',
                        style: body(13)),
                  ),
                  Text(r['status'] == 'en_attente' ? 'En attente' : r['status'] == 'acceptee' ? 'Accordée' : 'Refusée',
                      style: body(13, color: HappyColors.muted, weight: FontWeight.w600)),
                ]),
              ),
          ],

          const SizedBox(height: 20),
          if (active) ...[
            PillButton(
              label: 'Couper l’accès',
              icon: Icons.block_rounded,
              variant: BtnVariant.ghost,
              onPressed: () async {
                if (!await confirm(ctx, 'Couper l’accès ?', 'Le lien de partage expirera immédiatement.', ok: 'Couper', danger: true)) return;
                if (ctx.mounted) Navigator.pop(ctx);
                await s.act(context, () => api.rpc('admin_revoke_access', {'p_user': uid}), 'Accès coupé');
              },
            ),
            const SizedBox(height: 10),
          ],
          PillButton(
            label: 'Supprimer l’utilisateur',
            icon: Icons.delete_outline_rounded,
            variant: BtnVariant.danger,
            onPressed: () async {
              if (!await confirm(ctx, 'Supprimer définitivement ?', 'Son anniversaire, ses cadeaux et ses demandes seront effacés.', ok: 'Supprimer', danger: true)) {
                return;
              }
              if (ctx.mounted) Navigator.pop(ctx);
              await s.act(context, () => api.adminDeleteUser(uid), 'Utilisateur supprimé');
            },
          ),
        ]);
      });
    });
  }
}

/// Pastille d'état d'accès.
class StatusTag extends StatelessWidget {
  const StatusTag({super.key, required this.p});
  final Map<String, dynamic> p;
  @override
  Widget build(BuildContext context) {
    final st = accessState(p);
    if (st == 'jamais') return const Tag('Jamais activé', tone: TagTone.muted);
    if (st == 'expire') return Tag('Expiré le ${formatDate(p['access_expires_at'].toString())}', tone: TagTone.muted);
    final left = daysUntil(p['access_expires_at'].toString());
    return Tag('Actif · $left j restants', tone: left <= 7 ? TagTone.gold : TagTone.mint);
  }
}

/* ================================================================== */
/* Messages du formulaire « Nous contacter »                            */
/* ================================================================== */

class MessagesTab extends StatelessWidget {
  const MessagesTab({super.key, required this.store});
  final AdminStore store;
  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: HappyColors.candy,
      onRefresh: store.load,
      child: ListView(padding: const EdgeInsets.fromLTRB(20, 16, 20, 40), children: [
        const AdminHeader(title: 'Messages'),
        const SizedBox(height: 16),
        if (store.messages.isEmpty) const EmptyBox('Aucun message reçu.', icon: Icons.inbox_rounded),
        for (final m in store.messages)
          Opacity(
            opacity: m['status'] == 'en_attente' ? 1 : 0.6,
            child: HCard(
              margin: const EdgeInsets.only(bottom: 12),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Text(m['full_name'].toString(), style: body(15, weight: FontWeight.w700)),
                Text([m['phone'], m['email']].where((x) => x != null && x.toString().isNotEmpty).join(' · '), style: body(13, color: HappyColors.muted)),
                if ((m['message'] ?? '').toString().isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: fade(HappyColors.lilac, 0.6), borderRadius: BorderRadius.circular(14)),
                    child: Text(m['message'].toString(), style: body(14)),
                  ),
                const SizedBox(height: 6),
                Text('Reçu le ${formatDate(m['created_at'].toString())}', style: body(11, color: const Color(0x661E1428))),
                const SizedBox(height: 10),
                Row(children: [
                  if ((m['phone'] ?? '').toString().isNotEmpty)
                    Expanded(
                      child: PillButton(
                        label: 'WhatsApp',
                        icon: Icons.chat_rounded,
                        variant: BtnVariant.ghost,
                        small: true,
                        onPressed: () => launchUrl(Uri.parse(waLink(m['phone'].toString())), mode: LaunchMode.externalApplication),
                      ),
                    ),
                  if ((m['phone'] ?? '').toString().isNotEmpty && m['status'] == 'en_attente') const SizedBox(width: 8),
                  if (m['status'] == 'en_attente')
                    Expanded(
                      child: PillButton(
                        label: 'Traité',
                        small: true,
                        onPressed: () => store.act(context, () => api.update('contact_messages', {'status': 'traitee'}, [Filter('id', 'eq', m['id'])]), 'Marqué comme traité'),
                      ),
                    ),
                ]),
              ]),
            ),
          ),
      ]),
    );
  }
}

/* ================================================================== */
/* Réglages : tarifs et numéros de paiement (table settings, ligne 1)   */
/* ================================================================== */

class SettingsTab extends StatefulWidget {
  const SettingsTab({super.key});
  @override
  State<SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends State<SettingsTab> {
  static const _keys = [
    'access_price_per_day', 'access_min_price', 'vendor_fee', 'vendor_fee_label',
    'wave_number', 'orange_number', 'mtn_number', 'moov_number', 'payment_instructions',
  ];
  final Map<String, TextEditingController> _c = {for (final k in _keys) k: TextEditingController()};
  bool _loaded = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    api.selectOne('settings', filters: [const Filter('id', 'eq', 1)]).then((d) {
      if (!mounted) return;
      for (final k in _keys) {
        _c[k]!.text = d?[k] == null ? '' : d![k].toString();
      }
      setState(() => _loaded = true);
    }).catchError((_) {
      if (mounted) setState(() => _loaded = true);
    });
  }

  @override
  void dispose() {
    for (final c in _c.values) {
      c.dispose();
    }
    super.dispose();
  }

  num _n(String k) => num.tryParse(_c[k]!.text.replaceAll(RegExp(r'\D'), '')) ?? 0;
  String? _s(String k) => _c[k]!.text.trim().isEmpty ? null : _c[k]!.text.trim();

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await api.update('settings', {
        'access_price_per_day': _n('access_price_per_day'),
        'access_min_price': _n('access_min_price'),
        'vendor_fee': _n('vendor_fee'),
        'vendor_fee_label': _s('vendor_fee_label') ?? 'Frais d’ouverture de boutique',
        'wave_number': _s('wave_number'),
        'orange_number': _s('orange_number'),
        'mtn_number': _s('mtn_number'),
        'moov_number': _s('moov_number'),
        'payment_instructions': _s('payment_instructions'),
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      }, [const Filter('id', 'eq', 1)]);
      if (mounted) toast(context, 'Réglages enregistrés');
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded) return const Loading();
    return ListView(padding: const EdgeInsets.fromLTRB(20, 16, 20, 40), children: [
      const AdminHeader(title: 'Réglages'),
      const SizedBox(height: 16),
      HCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Title2('Tarifs', size: 28),
          const SizedBox(height: 12),
          Field(label: 'Accès célébrant : prix par jour (FCFA)', controller: _c['access_price_per_day']!, keyboardType: TextInputType.number),
          Field(label: 'Accès célébrant : prix minimum (FCFA)', controller: _c['access_min_price']!, keyboardType: TextInputType.number),
          Field(label: 'Boutique : montant (FCFA) · bientôt utilisé', controller: _c['vendor_fee']!, keyboardType: TextInputType.number),
          Field(label: 'Boutique : libellé', controller: _c['vendor_fee_label']!),
          const SizedBox(height: 8),
          const Title2('Numéros de paiement', size: 28),
          const Muted('Seuls les numéros renseignés sont proposés aux utilisateurs.', size: 13),
          const SizedBox(height: 12),
          Field(label: 'Wave', controller: _c['wave_number']!, keyboardType: TextInputType.phone),
          Field(label: 'Orange Money', controller: _c['orange_number']!, keyboardType: TextInputType.phone),
          Field(label: 'MTN MoMo', controller: _c['mtn_number']!, keyboardType: TextInputType.phone),
          Field(label: 'Moov Money', controller: _c['moov_number']!, keyboardType: TextInputType.phone),
          Field(label: 'Instructions de paiement', controller: _c['payment_instructions']!, maxLines: 3, hint: 'Indiquez votre nom en motif de paiement…'),
          PillButton(label: 'Enregistrer', variant: BtnVariant.candy, loading: _saving, onPressed: _save),
        ]),
      ),
      const SizedBox(height: 20),
      PillButton(label: 'Se déconnecter', icon: Icons.logout_rounded, variant: BtnVariant.danger, onPressed: session.signOut),
    ]);
  }
}
