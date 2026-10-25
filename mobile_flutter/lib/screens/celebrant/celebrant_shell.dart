// Espace célébrant : 5 onglets (Anniversaire, Ma liste, Invités, Notifications, Profil).
// Le CelebrantStore charge les données une fois et les partage ; les notifications sont
// vérifiées toutes les 15 s (un cadeau réservé, un accès accordé ou une réponse rechargent l'écran).
import 'package:flutter/material.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../widgets/cake.dart';
import '../../widgets/countdown.dart';
import '../../widgets/flip_card.dart';
import '../../widgets/notifications.dart';
import '../../widgets/share_link.dart';
import '../../widgets/ui.dart';
import '../../widgets/wrapped_card.dart';
import '../event_page.dart';
import 'celebrant_store.dart';
import 'event_form.dart';
import 'gift_form.dart';
import 'request_sheet.dart';

class CelebrantShell extends StatefulWidget {
  const CelebrantShell({super.key});
  @override
  State<CelebrantShell> createState() => _CelebrantShellState();
}

class _CelebrantShellState extends State<CelebrantShell> {
  final store = CelebrantStore();
  late final NotificationPoller poller;
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    store.load();
    poller = NotificationPoller(session.userId, onNew: (n) {
      if (mounted) toast(context, n['title'].toString());
      final kind = n['kind'];
      if (kind == 'claim') store.loadGifts();
      if (kind == 'access' || kind == 'rsvp') store.load();
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
      listenable: Listenable.merge([store, poller]),
      builder: (context, _) {
        final pages = [
          DashboardTab(store: store),
          MyListTab(store: store),
          GuestsTab(store: store),
          NotificationsView(poller: poller),
          ProfileTab(store: store),
        ];
        return Scaffold(
          body: SafeArea(child: store.loading ? const Loading() : IndexedStack(index: _tab, children: pages)),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _tab,
            onDestinationSelected: (i) => setState(() => _tab = i),
            backgroundColor: Colors.white,
            indicatorColor: HappyColors.lilac,
            destinations: [
              const NavigationDestination(icon: Icon(Icons.cake_rounded), label: 'Anniversaire'),
              const NavigationDestination(icon: Icon(Icons.card_giftcard_rounded), label: 'Ma liste'),
              const NavigationDestination(icon: Icon(Icons.people_rounded), label: 'Invités'),
              NavigationDestination(
                icon: Badge(isLabelVisible: poller.unread > 0, label: Text('${poller.unread}'), child: const Icon(Icons.notifications_rounded)),
                label: 'Notifications',
              ),
              const NavigationDestination(icon: Icon(Icons.person_rounded), label: 'Profil'),
            ],
          ),
        );
      },
    );
  }
}

/* ================================================================== */
/* Onglet « Anniversaire » : tableau de bord                            */
/* ================================================================== */

class DashboardTab extends StatelessWidget {
  const DashboardTab({super.key, required this.store});
  final CelebrantStore store;

  Future<void> _askAccess(BuildContext context) async {
    final sent = await showAccessRequest(context, kind: store.expires != null ? 'prolongation' : 'acces', userId: session.userId);
    if (sent == true) {
      store.setPending(true);
      if (context.mounted) toast(context, 'Demande envoyée à l’administrateur');
    }
  }

  /// Publication : refusée par la base (déclencheur prepare_event) si l'accès n'est pas actif.
  Future<void> _publish(BuildContext context) async {
    final ok = await confirm(
      context,
      'Publier votre liste ?',
      'Vous obtiendrez vos liens à partager. Après publication, le prénom et la date de naissance ne pourront plus être modifiés.'
          '${store.expires != null ? ' Le lien restera actif jusqu’au ${formatDate(store.expires)}.' : ''}',
      ok: 'Publier',
    );
    if (!ok) return;
    try {
      final e = await api.update('events', {'published': true}, [Filter('id', 'eq', store.event!['id'])]);
      store.setEvent(e);
      if (context.mounted) toast(context, 'Liste publiée');
    } on ApiException catch (x) {
      if (context.mounted) toast(context, x.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = store.profile;
    final ev = store.event;
    final firstName = (p['full_name'] ?? '').toString().split(' ').first;

    return RefreshIndicator(
      color: HappyColors.candy,
      onRefresh: store.load,
      child: ListView(padding: const EdgeInsets.fromLTRB(20, 16, 20, 40), children: [
        Title2('Bonjour $firstName', size: 40),
        if (store.error != null) ErrorText(store.error),
        AccessBanner(store: store, onRequest: () => _askAccess(context)),
        const SizedBox(height: 20),
        if (ev == null)
          HCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const Title2('Créez votre anniversaire', size: 30),
              const SizedBox(height: 4),
              const Muted('Votre date de naissance, vos couleurs, et la fête si vous en organisez une.'),
              const SizedBox(height: 18),
              EventForm(
                userId: session.userId,
                defaultName: firstName,
                onSaved: (e) {
                  store.setEvent(e);
                  toast(context, 'Anniversaire créé');
                },
              ),
            ]),
          )
        else
          ..._eventContent(context, ev),
      ]),
    );
  }

  List<Widget> _eventContent(BuildContext context, Map<String, dynamic> ev) {
    final hex = ev['theme_color'] as String?;
    final accent = hexColor(hex);
    final textAccent = textAccentOf(hex);
    final published = ev['published'] == true;
    final hasParty = ev['has_party'] == true;
    final gifts = store.gifts;

    return [
      // Carte de l'anniversaire
      HCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(formatLongDate(ev['birthday_date'].toString()), style: body(13, color: HappyColors.muted, weight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text((ev['title'] ?? '').toString().isNotEmpty ? ev['title'].toString() : 'L’anniversaire de ${ev['celebrant_name']}', style: display(32)),
          Text('${store.age} ans', style: display(24, color: textAccent)),
          const SizedBox(height: 14),
          Countdown(date: ev['birthday_date'].toString(), color: textAccent),
          const SizedBox(height: 12),
          Center(child: Cake(age: store.age, color: accent, width: 260)),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: [
            if ((ev['dress_code'] ?? '').toString().isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: fade(HappyColors.lilac, 0.7), borderRadius: BorderRadius.circular(99)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Container(width: 14, height: 14, decoration: BoxDecoration(color: accent, shape: BoxShape.circle, border: Border.all(color: HappyColors.line))),
                  const SizedBox(width: 6),
                  Text(ev['dress_code'].toString(), style: body(12, weight: FontWeight.w600)),
                ]),
              ),
            if (hasParty)
              Tag('Fête${ev['party_date'] != null ? ' le ${formatDate(ev['party_date'].toString())}' : ''}${(ev['party_place'] ?? '').toString().isNotEmpty ? ' · ${ev['party_place']}' : ''}',
                  icon: Icons.celebration_rounded),
            Tag(published ? 'Liste publiée' : 'Brouillon', tone: published ? TagTone.mint : TagTone.gold),
          ]),
          const SizedBox(height: 14),
          PillButton(
            label: 'Personnaliser',
            icon: Icons.palette_rounded,
            variant: BtnVariant.ghost,
            small: true,
            onPressed: () => showSheet(context,
                title: 'Personnaliser l’anniversaire',
                builder: (ctx) => EventForm(
                      userId: session.userId,
                      event: ev,
                      onSaved: (e) {
                        store.setEvent(e);
                        Navigator.pop(ctx);
                        toast(context, 'Modifications enregistrées');
                      },
                    )),
          ),
        ]),
      ),
      const SizedBox(height: 16),

      // Suivi des cadeaux + publication + partage
      HCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Muted('Cadeaux pris en charge', size: 13),
          Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('${store.taken}', style: display(56, height: 1)),
            const SizedBox(width: 8),
            Padding(padding: const EdgeInsets.only(bottom: 8), child: Text('/ ${gifts.length}', style: body(18, color: HappyColors.muted, weight: FontWeight.w600))),
          ]),
          const SizedBox(height: 10),
          // Barre de progression animée
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: gifts.isEmpty ? 0 : store.taken / gifts.length),
              duration: const Duration(seconds: 1),
              builder: (_, v, __) => LinearProgressIndicator(value: v, minHeight: 10, backgroundColor: HappyColors.lilac, color: accent),
            ),
          ),
          const SizedBox(height: 10),
          Muted(store.revealed ? 'La fête est passée : découvrez qui vous a gâté.' : 'Les noms restent secrets jusqu’au lendemain de votre anniversaire.', size: 13),
          const SizedBox(height: 18),
          if (published && store.hasAccess) ...[
            if (hasParty)
              ShareLink(
                label: 'Lien invités · avec la carte d’invitation',
                url: '$siteUrl/e/${ev['invite_token']}',
                text: 'Tu es invité(e) à mon anniversaire ! Invitation et liste de cadeaux :',
                onPreview: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => EventPage(token: ev['invite_token'].toString()))),
              ),
            ShareLink(
              label: hasParty ? 'Lien liste seule · sans invitation' : 'Lien de ma liste',
              url: '$siteUrl/e/${ev['share_token']}',
              text: 'Ma liste d’anniversaire :',
              onPreview: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => EventPage(token: ev['share_token'].toString()))),
            ),
          ] else if (published)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: HappyColors.lilac, borderRadius: BorderRadius.circular(16)),
              child: Row(children: [
                const Icon(Icons.lock_rounded, size: 16, color: HappyColors.candy),
                const SizedBox(width: 8),
                Expanded(child: Text('Lien expiré : vos amis ne peuvent plus l’ouvrir.', style: body(13, color: HappyColors.candy, weight: FontWeight.w600))),
              ]),
            )
          else if (store.hasAccess)
            PillButton(
              label: gifts.isEmpty ? 'Ajoutez un cadeau pour publier' : 'Publier et obtenir le lien',
              icon: Icons.send_rounded,
              color: hex?.toLowerCase() == '#f7f5f2' ? HappyColors.ink : accent,
              textColor: hex?.toLowerCase() == '#f7f5f2' ? Colors.white : readableOn(hex),
              onPressed: gifts.isEmpty ? null : () => _publish(context),
            )
          else
            PillButton(
              label: store.pending ? 'Demande en cours de validation' : 'Demander l’accès pour publier',
              icon: Icons.lock_rounded,
              variant: BtnVariant.candy,
              onPressed: store.pending ? null : () => _askAccess(context),
            ),
        ]),
      ),

      // Révélation : le lendemain, get_my_gifts renvoie les noms des offreurs
      if (store.revealed && store.taken > 0) ...[
        const SizedBox(height: 28),
        const Title2('Qui vous a offert quoi', size: 32),
        const Muted('Touchez un cadeau pour l’ouvrir.'),
        const SizedBox(height: 14),
        for (final g in gifts.where((g) => g['claimed'] == true))
          Padding(padding: const EdgeInsets.only(bottom: 14), child: FlipCard(gift: g, accent: accent)),
      ],
    ];
  }
}

/// Bandeau d'état de l'accès : non activé / en attente / actif (Prolonger à 7 jours de la fin) / expiré.
class AccessBanner extends StatelessWidget {
  const AccessBanner({super.key, required this.store, required this.onRequest});
  final CelebrantStore store;
  final VoidCallback onRequest;

  @override
  Widget build(BuildContext context) {
    final expires = store.expires;
    if (!store.hasAccess) {
      final expired = expires != null;
      final fg = expired ? Colors.white : HappyColors.ink;
      return Container(
        margin: const EdgeInsets.only(top: 16),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(color: expired ? HappyColors.candy : HappyColors.lilac, borderRadius: BorderRadius.circular(24)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(expired ? Icons.lock_rounded : Icons.schedule_rounded, color: fg),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(
                  store.pending ? 'Demande envoyée' : expired ? 'Votre accès a expiré le ${formatDate(expires)}' : 'Votre accès n’est pas encore activé',
                  style: body(15, color: fg, weight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  store.pending
                      ? 'L’administrateur la traite. Vous recevrez une notification dès l’activation.'
                      : expired
                          ? 'Votre lien est désactivé. Demandez une prolongation pour le réactiver.'
                          : 'Préparez dès maintenant votre anniversaire et vos cadeaux. L’accès est nécessaire pour publier et partager la liste.',
                  style: body(13, color: expired ? const Color(0xD9FFFFFF) : const Color(0xB31E1428), height: 1.4),
                ),
              ]),
            ),
          ]),
          const SizedBox(height: 14),
          PillButton(
            label: store.pending ? 'En attente de validation' : expired ? 'Demander une prolongation' : 'Demander l’accès',
            small: true,
            variant: expired ? BtnVariant.light : BtnVariant.primary,
            onPressed: store.pending ? null : onRequest,
          ),
        ]),
      );
    }
    final left = store.daysLeft;
    final soon = left <= 7;
    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: soon ? HappyColors.lilac : Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: HappyColors.line)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          const Icon(Icons.schedule_rounded, size: 18, color: HappyColors.candy),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Accès actif jusqu’au ${formatDate(expires)} · ${left <= 0 ? 'expire aujourd’hui' : '$left jour${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}'}',
              style: body(13, weight: FontWeight.w600),
            ),
          ),
        ]),
        if (soon) ...[
          const SizedBox(height: 10),
          PillButton(label: store.pending ? 'Prolongation demandée' : 'Prolonger', small: true, onPressed: store.pending ? null : onRequest),
        ],
      ]),
    );
  }
}

/* ================================================================== */
/* Onglet « Ma liste »                                                  */
/* ================================================================== */

class MyListTab extends StatelessWidget {
  const MyListTab({super.key, required this.store});
  final CelebrantStore store;

  void _openForm(BuildContext context, [Map<String, dynamic>? gift]) {
    showSheet(context,
        title: gift != null ? 'Modifier le cadeau' : 'Ajouter un cadeau',
        builder: (ctx) => GiftForm(
              eventId: store.event!['id'].toString(),
              gift: gift,
              position: store.gifts.length,
              onSaved: () {
                Navigator.pop(ctx);
                store.loadGifts();
                toast(context, gift != null ? 'Cadeau modifié' : 'Cadeau ajouté');
              },
            ));
  }

  Future<void> _remove(BuildContext context, Map<String, dynamic> g) async {
    if (!await confirm(context, 'Retirer ce cadeau ?', '« ${g['name']} » sera retiré de la liste.', ok: 'Retirer', danger: true)) return;
    try {
      await api.delete('gifts', [Filter('id', 'eq', g['id'])]);
      await store.loadGifts();
      if (context.mounted) toast(context, 'Cadeau retiré');
    } on ApiException catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ev = store.event;
    if (ev == null) {
      return ListView(padding: const EdgeInsets.all(20), children: const [
        Title2('Ma liste'),
        SizedBox(height: 8),
        Muted('Créez d’abord votre anniversaire dans l’onglet « Anniversaire ».'),
      ]);
    }
    final hex = ev['theme_color'] as String?;
    return RefreshIndicator(
      color: HappyColors.candy,
      onRefresh: store.loadGifts,
      child: ListView(padding: const EdgeInsets.fromLTRB(20, 16, 20, 40), children: [
        Row(children: [
          const Expanded(child: Title2('Ma liste')),
          if (!store.revealed)
            PillButton(label: 'Ajouter', icon: Icons.add_rounded, small: true, expand: false, onPressed: () => _openForm(context)),
        ]),
        const SizedBox(height: 16),
        if (store.gifts.isEmpty)
          GestureDetector(
            onTap: () => _openForm(context),
            child: const EmptyBox('Ajoutez votre premier cadeau : n’importe quel cadeau, avec le contact du vendeur.', icon: Icons.add_rounded),
          ),
        for (final g in store.gifts)
          WrappedCard(
            key: ValueKey(g['id']),
            gift: g,
            accent: hexColor(hex),
            accentHex: hex,
            footer: g['claimed'] == true
                ? null
                : Row(children: [
                    Expanded(
                      child: PillButton(label: 'Modifier', icon: Icons.edit_rounded, variant: BtnVariant.ghost, small: true, onPressed: () => _openForm(context, g)),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: PillButton(label: 'Retirer', icon: Icons.delete_outline_rounded, variant: BtnVariant.danger, small: true, onPressed: () => _remove(context, g)),
                    ),
                  ]),
          ),
      ]),
    );
  }
}

/* ================================================================== */
/* Onglet « Invités » : réponses à l'invitation                         */
/* ================================================================== */

class GuestsTab extends StatelessWidget {
  const GuestsTab({super.key, required this.store});
  final CelebrantStore store;

  @override
  Widget build(BuildContext context) {
    final ev = store.event;
    final rsvps = store.rsvps;
    final yes = rsvps.where((r) => r['attending'] == 'oui').toList();
    final maybe = rsvps.where((r) => r['attending'] == 'peut-etre').length;
    final no = rsvps.where((r) => r['attending'] == 'non').length;
    final people = yes.fold<int>(0, (a, r) => a + ((r['guests'] as num?)?.toInt() ?? 1));
    final hex = ev?['theme_color'] as String?;
    final accent = hex?.toLowerCase() == '#f7f5f2' ? HappyColors.ink : hexColor(hex);

    return RefreshIndicator(
      color: HappyColors.candy,
      onRefresh: store.load,
      child: ListView(padding: const EdgeInsets.fromLTRB(20, 16, 20, 40), children: [
        const Title2('Réponses à l’invitation'),
        const SizedBox(height: 16),
        if (ev == null || ev['has_party'] != true)
          const EmptyBox('Activez « J’organise une fête » dans Personnaliser pour envoyer une invitation et recevoir des réponses.', icon: Icons.celebration_rounded)
        else ...[
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.2,
            children: [
              StatTile(value: '$people', label: 'Personnes attendues', highlight: true, color: accent),
              StatTile(value: '${yes.length}', label: 'Oui'),
              StatTile(value: '$maybe', label: 'Peut-être'),
              StatTile(value: '$no', label: 'Non'),
            ],
          ),
          const SizedBox(height: 16),
          if (rsvps.isEmpty)
            const EmptyBox('Aucune réponse pour le moment. Partagez le lien invités.', icon: Icons.people_rounded)
          else
            HCard(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Column(children: [
                for (var i = 0; i < rsvps.length; i++)
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(border: i == 0 ? null : const Border(top: BorderSide(color: HappyColors.line))),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Wrap(spacing: 8, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
                        Text(rsvps[i]['name'].toString(), style: body(14, weight: FontWeight.w700)),
                        Tag(
                          rsvps[i]['attending'] == 'oui'
                              ? 'Oui · ${rsvps[i]['guests']} pers.'
                              : rsvps[i]['attending'] == 'non'
                                  ? 'Non'
                                  : 'Peut-être',
                          tone: rsvps[i]['attending'] == 'oui' ? TagTone.mint : rsvps[i]['attending'] == 'non' ? TagTone.muted : TagTone.gold,
                        ),
                      ]),
                      if ((rsvps[i]['phone'] ?? '').toString().isNotEmpty)
                        Padding(padding: const EdgeInsets.only(top: 4), child: Text(rsvps[i]['phone'].toString(), style: body(13, color: HappyColors.muted))),
                      if ((rsvps[i]['message'] ?? '').toString().isNotEmpty)
                        Padding(padding: const EdgeInsets.only(top: 4), child: Muted('« ${rsvps[i]['message']} »', size: 13)),
                    ]),
                  ),
              ]),
            ),
        ],
      ]),
    );
  }
}

/* ================================================================== */
/* Onglet « Profil »                                                    */
/* ================================================================== */

class ProfileTab extends StatelessWidget {
  const ProfileTab({super.key, required this.store});
  final CelebrantStore store;
  @override
  Widget build(BuildContext context) {
    final p = store.profile;
    return ListView(padding: const EdgeInsets.fromLTRB(20, 16, 20, 40), children: [
      Title2((p['full_name'] ?? 'Mon profil').toString()),
      const SizedBox(height: 16),
      HCard(
        child: Column(children: [
          if ((p['phone'] ?? '').toString().isNotEmpty) InfoRow(Icons.phone_rounded, p['phone'].toString()),
          if ((p['email'] ?? '').toString().isNotEmpty) InfoRow(Icons.mail_rounded, p['email'].toString()),
          InfoRow(
            Icons.schedule_rounded,
            store.hasAccess
                ? 'Accès actif jusqu’au ${formatDate(store.expires)}'
                : store.expires != null
                    ? 'Accès expiré le ${formatDate(store.expires)}'
                    : 'Accès pas encore activé',
          ),
        ]),
      ),
      const SizedBox(height: 20),
      PillButton(label: 'Se déconnecter', icon: Icons.logout_rounded, variant: BtnVariant.danger, onPressed: session.signOut),
    ]);
  }
}
