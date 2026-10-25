// Page de l'anniversaire pour les amis (SANS compte), ouverte avec le lien partagé.
//
// Données : fonction SQL get_public_event(token). C'est la BASE qui décide :
// - `invited` est vrai seulement avec le lien invités (et s'il y a une fête) ;
//   avec le lien « liste seule », les infos de la fête ne sont jamais renvoyées ;
// - chaque cadeau indique seulement `claimed` (vrai/faux), jamais qui l'a réservé.
//
// Contenu : en-tête sombre aux couleurs du thème, gâteau animé, compte à rebours,
// enveloppe d'invitation + réponse « Serez-vous là ? » (rsvp), liste des cadeaux,
// réservation (claim_gift). Les cadeaux emballés par les autres apparaissent toutes les 15 s.
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/api.dart';
import '../core/memory.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../widgets/cake.dart';
import '../widgets/coming_soon.dart';
import '../widgets/countdown.dart';
import '../widgets/illustrations.dart';
import '../widgets/invitation.dart';
import '../widgets/ui.dart';
import '../widgets/wrapped_card.dart';

class EventPage extends StatefulWidget {
  const EventPage({super.key, required this.token});
  final String token;
  @override
  State<EventPage> createState() => _EventPageState();
}

class _EventPageState extends State<EventPage> {
  Map<String, dynamic>? _data;
  Map<String, String> _mine = {}; // cadeaux réservés depuis ce téléphone : idCadeau → code
  Timer? _timer;
  final _scroll = ScrollController();
  final _invitationKey = GlobalKey();
  final _giftsKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    _load();
    Memory.myGifts().then((m) {
      if (mounted) setState(() => _mine = m);
    });
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final d = await api.rpc('get_public_event', {'p_token': widget.token});
      if (mounted) setState(() => _data = d == null ? {'status': 'not_found'} : Map<String, dynamic>.from(d as Map));
    } catch (e) {
      if (mounted && _data == null) setState(() => _data = {'status': 'error', 'message': e.toString()});
    }
  }

  void _scrollTo(GlobalKey key) {
    final ctx = key.currentContext;
    if (ctx != null) Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 500), curve: Curves.easeInOut);
  }

  @override
  Widget build(BuildContext context) {
    final d = _data;
    if (d == null) return const Scaffold(body: Loading());
    if (d['status'] != 'ok') return _unavailable(d);

    final ev = Map<String, dynamic>.from(d['event'] as Map);
    final gifts = (d['gifts'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    final invited = d['invited'] == true;
    final closed = d['closed'] == true;
    final hex = ev['theme_color'] as String?;
    final accent = hexColor(hex);
    final age = (ev['age'] as num?)?.toInt() ?? 0;
    final taken = gifts.where((g) => g['claimed'] == true).length;
    final name = ev['celebrant_name'].toString();

    return Scaffold(
      backgroundColor: HappyColors.paper,
      body: CustomScrollView(controller: _scroll, slivers: [
        // ---------- En-tête sombre aux couleurs du thème ----------
        SliverToBoxAdapter(
          child: Container(
            color: HappyColors.ink,
            child: Stack(children: [
              Positioned(right: -140, top: -140, child: _glow(420, fade(accent, 0.35))),
              Positioned(left: -120, bottom: -140, child: _glow(320, const Color(0x26C8A26A))),
              SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 36),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      if (Navigator.of(context).canPop())
                        IconButton(
                          tooltip: 'Retour',
                          onPressed: () => Navigator.of(context).pop(),
                          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
                        ),
                      const HappyLogo(light: true),
                    ]),
                    const SizedBox(height: 16),
                    Row(children: [
                      const Icon(Icons.event_rounded, size: 16, color: Color(0xB3FFFFFF)),
                      const SizedBox(width: 8),
                      Expanded(child: Text(formatDayMonth(ev['birthday_date'].toString()), style: body(13, color: const Color(0xB3FFFFFF), weight: FontWeight.w600))),
                    ]),
                    const SizedBox(height: 10),
                    Text((ev['title'] ?? '').toString().isNotEmpty ? ev['title'].toString() : 'Les $age ans de $name',
                        style: display(44, color: Colors.white, height: 1.0)),
                    if ((ev['message'] ?? '').toString().isNotEmpty) ...[
                      const SizedBox(height: 14),
                      Text(ev['message'].toString(), style: body(16, color: const Color(0xBFFFFFFF), height: 1.5)),
                    ],
                    const SizedBox(height: 20),
                    Center(child: Cake(age: age, color: accent, width: 290)),
                    Center(child: Text('$age ans', style: display(30, color: Colors.white))),
                    const SizedBox(height: 10),
                    Center(child: Countdown(date: ev['birthday_date'].toString(), onDark: true)),
                    const SizedBox(height: 24),
                    if (invited) ...[
                      PillButton(label: 'Voir l’invitation', icon: Icons.celebration_rounded, variant: BtnVariant.light, onPressed: () => _scrollTo(_invitationKey)),
                      const SizedBox(height: 10),
                    ],
                    PillButton(label: 'Choisir un cadeau', icon: Icons.card_giftcard_rounded, variant: BtnVariant.glass, onPressed: () => _scrollTo(_giftsKey)),
                    if ((ev['dress_code'] ?? '').toString().isNotEmpty) ...[
                      const SizedBox(height: 20),
                      Container(
                        padding: const EdgeInsets.fromLTRB(8, 8, 18, 8),
                        decoration: BoxDecoration(color: const Color(0x1AFFFFFF), borderRadius: BorderRadius.circular(99), border: Border.all(color: const Color(0x26FFFFFF))),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          Container(width: 28, height: 28, decoration: BoxDecoration(color: accent, shape: BoxShape.circle, border: Border.all(color: const Color(0x66FFFFFF), width: 2))),
                          const SizedBox(width: 10),
                          Flexible(child: Text('Dress code · ${ev['dress_code']}', style: body(13, color: Colors.white, weight: FontWeight.w600))),
                        ]),
                      ),
                    ],
                  ]),
                ),
              ),
            ]),
          ),
        ),

        // ---------- Invitation (lien invités uniquement) ----------
        if (invited)
          SliverToBoxAdapter(
            child: Container(
              key: _invitationKey,
              color: fade(HappyColors.lilac, 0.5),
              padding: const EdgeInsets.fromLTRB(20, 40, 20, 40),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const Title2('Vous êtes invité(e) à la fête', size: 32, align: TextAlign.center),
                const SizedBox(height: 20),
                Invitation(
                  name: name,
                  age: age,
                  color: accent,
                  colorHex: hex,
                  date: (ev['party_date'] ?? ev['birthday_date']).toString(),
                  time: ev['party_time'] as String?,
                  place: ev['party_place'] as String?,
                  details: ev['party_details'] as String?,
                  dressCode: ev['dress_code'] as String?,
                ),
                const SizedBox(height: 20),
                RsvpForm(token: widget.token, accent: accent, accentHex: hex),
              ]),
            ),
          ),

        // ---------- Liste des cadeaux ----------
        SliverToBoxAdapter(
          child: Padding(
            key: _giftsKey,
            padding: const EdgeInsets.fromLTRB(20, 36, 20, 8),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Title2('Choisissez un cadeau', size: 32),
              const SizedBox(height: 6),
              Muted(closed
                  ? 'La fête est passée, la liste est close.'
                  : '$taken sur ${gifts.length} déjà emballés. $name ne saura pas qui a pris quoi avant la fin de son anniversaire.'),
              const SizedBox(height: 20),
            ]),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              for (final g in gifts)
                WrappedCard(
                  key: ValueKey(g['id']),
                  gift: g,
                  accent: accent,
                  accentHex: hex,
                  mine: _mine.containsKey(g['id']),
                  closed: closed,
                  onClaim: () => _claim(g, name, accent, hex),
                  footer: _mine.containsKey(g['id'])
                      ? Text('Code de suivi : ${_mine[g['id']]}', style: body(13, color: HappyColors.muted, weight: FontWeight.w600))
                      : null,
                ),
              const SizedBox(height: 12),
              const ComingSoon(
                compact: true,
                title: 'Commander en boutique',
                text: 'Bientôt, vous pourrez commander ces cadeaux directement auprès des boutiques Happy, les faire emballer, livrer et suivre la livraison.',
              ),
            ]),
          ),
        ),
      ]),
    );
  }

  Widget _glow(double size, Color color) => IgnorePointer(
        child: Container(width: size, height: size, decoration: BoxDecoration(shape: BoxShape.circle, color: color)),
      );

  Widget _unavailable(Map<String, dynamic> d) {
    final expired = d['status'] == 'expired';
    final error = d['status'] == 'error';
    return Scaffold(
      appBar: AppBar(),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: HCard(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(error ? Icons.error_outline_rounded : Icons.lock_rounded, size: 40),
              const SizedBox(height: 12),
              Title2(error ? 'Connexion impossible' : expired ? 'Ce lien a expiré' : 'Liste introuvable', align: TextAlign.center),
              const SizedBox(height: 10),
              Muted(
                error
                    ? d['message'].toString()
                    : expired
                        ? 'La liste de ${d['celebrant_name']} n’est plus accessible. Si vous avez réservé un cadeau, gardez votre code.'
                        : 'Vérifiez le lien reçu ou demandez-le à nouveau à la personne fêtée.',
                align: TextAlign.center,
              ),
              if (error) ...[const SizedBox(height: 16), PillButton(label: 'Réessayer', onPressed: _load)],
            ]),
          ),
        ),
      ),
    );
  }

  /// Réservation d'un cadeau (fonction SQL claim_gift → code de suivi).
  void _claim(Map<String, dynamic> gift, String celebrant, Color accent, String? hex) {
    final name = TextEditingController(), phone = TextEditingController(), email = TextEditingController(), msg = TextEditingController();
    showSheet(context, title: 'Je m’en charge', builder: (ctx) {
      var loading = false;
      String? err;
      return StatefulBuilder(builder: (ctx, setS) {
        Future<void> submit() async {
          if (name.text.trim().isEmpty || phone.text.trim().isEmpty) return setS(() => err = 'Le nom et le téléphone sont obligatoires.');
          setS(() {
            loading = true;
            err = null;
          });
          try {
            final r = await api.rpc('claim_gift', {
              'p_token': widget.token,
              'p_gift_id': gift['id'],
              'p_name': name.text.trim(),
              'p_phone': phone.text.trim(),
              'p_email': email.text.trim().isEmpty ? null : email.text.trim(),
              'p_message': msg.text.trim().isEmpty ? null : msg.text.trim(),
              'p_address': null,
              'p_delivery_date': null,
              'p_wrap': false,
            });
            final code = (r as Map)['tracking_code'].toString();
            final m = await Memory.saveGift(gift['id'].toString(), code);
            if (!ctx.mounted) return;
            Navigator.pop(ctx);
            setState(() => _mine = m);
            await _load(); // le cadeau s'emballe sous les yeux de l'ami
            if (mounted) _success(code, gift, celebrant, accent);
          } on ApiException catch (e) {
            setS(() {
              loading = false;
              err = e.message;
            });
            _load();
          }
        }

        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)),
            child: Row(children: [
              const Icon(Icons.card_giftcard_rounded, color: HappyColors.candy),
              const SizedBox(width: 10),
              Expanded(child: Text(gift['name'].toString(), style: body(15, weight: FontWeight.w700))),
              if (toNum(gift['price']) != null) Text(formatPrice(toNum(gift['price'])), style: body(13, color: HappyColors.muted)),
            ]),
          ),
          const SizedBox(height: 12),
          if ((gift['external_contact'] ?? '').toString().isNotEmpty)
            Padding(padding: const EdgeInsets.only(bottom: 12), child: Muted('Où l’acheter : ${gift['external_contact']}')),
          Field(label: 'Votre nom', controller: name, capitalization: TextCapitalization.words),
          Field(label: 'Téléphone / WhatsApp', controller: phone, keyboardType: TextInputType.phone),
          Field(label: 'Email (facultatif)', controller: email, keyboardType: TextInputType.emailAddress),
          Field(label: 'Un mot pour $celebrant', controller: msg, maxLines: 3, hint: 'Révélé avec votre nom après l’anniversaire'),
          ErrorText(err),
          PillButton(label: 'Réserver ce cadeau', loading: loading, color: accent, textColor: readableOn(hex), onPressed: submit),
        ]);
      });
    });
  }

  /// Confirmation avec le code de suivi.
  void _success(String code, Map<String, dynamic> gift, String celebrant, Color accent) {
    showSheet(context, builder: (ctx) => Column(children: [
          Icon(Icons.celebration_rounded, size: 46, color: accent),
          const SizedBox(height: 10),
          const Title2('C’est emballé !', align: TextAlign.center),
          const SizedBox(height: 8),
          Muted('$celebrant ne saura pas que c’est vous avant le lendemain de son anniversaire.', align: TextAlign.center),
          const SizedBox(height: 20),
          HCard(
            child: Column(children: [
              const Muted('Votre code de réservation'),
              const SizedBox(height: 4),
              Text(code, style: body(28, weight: FontWeight.w800).copyWith(letterSpacing: 5)),
              TextButton.icon(
                onPressed: () async {
                  await Clipboard.setData(ClipboardData(text: code));
                  if (ctx.mounted) toast(ctx, 'Code copié');
                },
                icon: const Icon(Icons.content_copy_rounded, size: 16),
                label: const Text('Copier'),
              ),
            ]),
          ),
          if ((gift['external_contact'] ?? '').toString().isNotEmpty) ...[
            const SizedBox(height: 12),
            Muted('Contactez le vendeur : ${gift['external_contact']}', align: TextAlign.center),
          ],
          const SizedBox(height: 16),
          PillButton(label: 'Fermer', onPressed: () => Navigator.pop(ctx)),
        ]));
  }
}

/// « Serez-vous là ? » : oui / peut-être / non, nombre de personnes, nom, téléphone, petit mot (fonction SQL rsvp).
class RsvpForm extends StatefulWidget {
  const RsvpForm({super.key, required this.token, required this.accent, this.accentHex});
  final String token;
  final Color accent;
  final String? accentHex;
  @override
  State<RsvpForm> createState() => _RsvpFormState();
}

class _RsvpFormState extends State<RsvpForm> {
  String? _sent; // réponse déjà envoyée depuis ce téléphone
  String _attending = 'oui';
  int _guests = 1;
  final _name = TextEditingController(), _phone = TextEditingController(), _msg = TextEditingController();
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    Memory.rsvp(widget.token).then((v) {
      if (mounted) setState(() => _sent = v);
    });
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _msg.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_name.text.trim().isEmpty) return toast(context, 'Indiquez votre nom.', error: true);
    setState(() => _loading = true);
    try {
      await api.rpc('rsvp', {
        'p_token': widget.token,
        'p_name': _name.text.trim(),
        'p_phone': _phone.text.trim().isEmpty ? null : _phone.text.trim(),
        'p_attending': _attending,
        'p_guests': _guests,
        'p_message': _msg.text.trim().isEmpty ? null : _msg.text.trim(),
      });
      final label = _attending == 'oui' ? 'je serai là' : _attending == 'non' ? 'je ne pourrai pas venir' : 'peut-être';
      await Memory.saveRsvp(widget.token, label);
      if (!mounted) return;
      setState(() => _sent = label);
      toast(context, 'Réponse envoyée');
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        toast(context, e.message, error: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_sent != null) {
      return HCard(child: Text('Merci, votre réponse a été envoyée : $_sent.', textAlign: TextAlign.center, style: body(14, weight: FontWeight.w600)));
    }
    // Le blanc serait illisible pour un bouton : on passe alors à la couleur nuit
    final btn = (widget.accentHex ?? '').toLowerCase() == '#f7f5f2' ? HappyColors.ink : widget.accent;
    final btnText = btn == HappyColors.ink ? Colors.white : readableOn(widget.accentHex);
    return HCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Title2('Serez-vous là ?', size: 28, align: TextAlign.center),
        const SizedBox(height: 16),
        Row(children: [
          for (final (k, l) in const [('oui', 'Oui'), ('peut-etre', 'Peut-être'), ('non', 'Non')]) ...[
            Expanded(
              child: PillButton(
                label: l,
                small: true,
                variant: BtnVariant.ghost,
                color: _attending == k ? btn : null,
                textColor: _attending == k ? btnText : null,
                onPressed: () => setState(() => _attending = k),
              ),
            ),
            if (k != 'non') const SizedBox(width: 8),
          ],
        ]),
        const SizedBox(height: 16),
        if (_attending != 'non') ...[
          const FieldLabel('Nombre de personnes'),
          Pills<int>(value: _guests, onChanged: (n) => setState(() => _guests = n), options: [for (var n = 1; n <= 6; n++) (key: n, label: '$n pers.')]),
          const SizedBox(height: 16),
        ],
        Field(controller: _name, hint: 'Votre nom', capitalization: TextCapitalization.words),
        Field(controller: _phone, hint: 'Téléphone (facultatif)', keyboardType: TextInputType.phone),
        Field(controller: _msg, hint: 'Un petit mot (facultatif)'),
        PillButton(label: 'Envoyer ma réponse', loading: _loading, color: btn, textColor: btnText, onPressed: _submit),
      ]),
    );
  }
}
