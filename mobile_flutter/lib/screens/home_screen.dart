// Accueil (visiteur non connecté) : présentation du concept, démo « réservez un cadeau »,
// ouverture d'une invitation reçue (lien ou code), boutiques (bientôt disponible), contact.
import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/theme.dart';
import '../widgets/coming_soon.dart';
import '../widgets/illustrations.dart';
import '../widgets/ui.dart';
import '../widgets/wrapped_card.dart';
import 'auth_screens.dart';
import 'event_page.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // Cadeaux fictifs de la démo (aucun appel au serveur)
  static const _demo = [
    {'id': 'a1', 'name': 'Parfum floral 50 ml', 'price': 38000, 'claimed': false},
    {'id': 'b2', 'name': 'Robe en wax sur mesure', 'price': 45000, 'claimed': true},
  ];
  List<Map<String, dynamic>> demo = _demo.map((e) => Map<String, dynamic>.from(e)).toList();
  final _link = TextEditingController();

  @override
  void dispose() {
    _link.dispose();
    super.dispose();
  }

  /// Extrait le jeton d'un lien « https://…/e/<jeton> » ou accepte le jeton seul.
  void _openInvitation() {
    var t = _link.text.trim();
    final i = t.indexOf('/e/');
    if (i >= 0) t = t.substring(i + 3);
    t = t.split(RegExp(r'[/?#\s]')).first;
    if (t.isEmpty) return toast(context, 'Collez le lien reçu.', error: true);
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => EventPage(token: t)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(padding: const EdgeInsets.fromLTRB(20, 8, 20, 40), children: [
          Row(children: [
            const HappyLogo(),
            const Spacer(),
            PillButton(
              label: 'Connexion',
              variant: BtnVariant.ghost,
              small: true,
              expand: false,
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen())),
            ),
          ]),
          const SizedBox(height: 8),
          const Center(child: GiftStack(width: 270)),
          Text('La liste d’anniversaire qui garde le secret.', style: display(42, height: 1.0)),
          const SizedBox(height: 14),
          const Muted(
            'Vous créez votre liste, vos proches réservent un cadeau. Vous savez qu’un cadeau est pris, '
            'jamais par qui, jusqu’au lendemain de la fête.',
            size: 16,
          ),
          const SizedBox(height: 24),
          PillButton(
            label: 'Créer ma liste',
            variant: BtnVariant.candy,
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SignupScreen())),
          ),
          const SizedBox(height: 10),
          PillButton(
            label: 'J’ai déjà un compte',
            variant: BtnVariant.ghost,
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen())),
          ),
          const SizedBox(height: 24),
          for (final (icon, text) in const [
            (Icons.visibility_off_rounded, 'Surprise préservée'),
            (Icons.mail_outline_rounded, 'Invitation et réponses des invités'),
            (Icons.verified_user_rounded, 'Lien personnel sécurisé'),
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(children: [
                Icon(icon, size: 18, color: HappyColors.candy),
                const SizedBox(width: 10),
                Expanded(child: Text(text, style: body(15, color: const Color(0xB31E1428), weight: FontWeight.w500))),
              ]),
            ),

          // Ouvrir une invitation reçue
          const SizedBox(height: 20),
          HCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Title2('Vous avez reçu un lien ?', size: 28),
              const SizedBox(height: 4),
              const Muted('Collez le lien d’anniversaire reçu par WhatsApp ou SMS.'),
              const SizedBox(height: 12),
              Field(controller: _link, hint: 'https://…/e/…'),
              PillButton(label: 'Ouvrir l’anniversaire', icon: Icons.cake_rounded, onPressed: _openInvitation),
            ]),
          ),

          // Démo : toucher « Je m'en charge » emballe le cadeau
          const SizedBox(height: 36),
          const Title2('Essayez : réservez un cadeau', size: 32),
          const SizedBox(height: 6),
          const Muted('Dès qu’un proche touche « Je m’en charge », le cadeau s’emballe pour tout le monde.'),
          const SizedBox(height: 16),
          for (var i = 0; i < demo.length; i++)
            WrappedCard(
              key: ValueKey(demo[i]['id']),
              gift: demo[i],
              onClaim: () => setState(() => demo[i] = {...demo[i], 'claimed': true}),
            ),
          TextButton.icon(
            onPressed: () => setState(() => demo = _demo.map((e) => Map<String, dynamic>.from(e)).toList()),
            icon: const Icon(Icons.restart_alt_rounded, size: 18, color: HappyColors.muted),
            label: Text('Réinitialiser la démo', style: body(14, color: HappyColors.muted, weight: FontWeight.w600)),
          ),

          const SizedBox(height: 16),
          const ComingSoon(),
          const SizedBox(height: 16),
          PillButton(label: 'Nous contacter', variant: BtnVariant.ghost, icon: Icons.chat_rounded, onPressed: () => _contact(context)),
          const SizedBox(height: 28),
          const Center(child: Muted('Fait à Abidjan, pour toutes les fêtes.', size: 13)),
        ]),
      ),
    );
  }

  /// Formulaire « Nous contacter » (table contact_messages, lue par l'admin).
  void _contact(BuildContext context) {
    final name = TextEditingController(), phone = TextEditingController(), email = TextEditingController(), msg = TextEditingController();
    showSheet(context, title: 'Nous contacter', builder: (ctx) {
      var sending = false;
      return StatefulBuilder(builder: (ctx, setS) {
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Field(label: 'Nom complet', controller: name),
          Field(label: 'Téléphone / WhatsApp', controller: phone, keyboardType: TextInputType.phone),
          Field(label: 'Email (facultatif)', controller: email, keyboardType: TextInputType.emailAddress),
          Field(label: 'Message', controller: msg, maxLines: 4),
          PillButton(
            label: 'Envoyer',
            variant: BtnVariant.candy,
            loading: sending,
            onPressed: () async {
              if (name.text.trim().isEmpty) return toast(ctx, 'Indiquez votre nom.', error: true);
              setS(() => sending = true);
              try {
                await api.insert('contact_messages', returning: false, {
                  'full_name': name.text.trim(),
                  'phone': phone.text.trim().isEmpty ? null : phone.text.trim(),
                  'email': email.text.trim().isEmpty ? null : email.text.trim(),
                  'message': msg.text.trim().isEmpty ? null : msg.text.trim(),
                });
                if (ctx.mounted) {
                  Navigator.pop(ctx);
                  toast(context, 'Message envoyé. Merci !');
                }
              } catch (e) {
                setS(() => sending = false);
                if (ctx.mounted) toast(ctx, e.toString(), error: true);
              }
            },
          ),
        ]);
      });
    });
  }
}
