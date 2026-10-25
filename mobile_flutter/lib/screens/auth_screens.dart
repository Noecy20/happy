// Connexion et inscription.
// - Email facultatif : sans email, l'identifiant technique est <chiffres du téléphone>@tel.happy.app
//   (phoneToEmail), jamais affiché ; le déclencheur SQL handle_new_user met profiles.email à null.
// - Connexion : un seul champ « Email ou téléphone ». Ensuite, RootGate affiche l'espace du rôle.
// - « Ma boutique » : bientôt disponible (partie e-commerce).
import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/session.dart';
import '../core/utils.dart';
import '../widgets/coming_soon.dart';
import '../widgets/illustrations.dart';
import '../widgets/ui.dart';

/// Retour à la racine : RootGate affiche alors l'espace correspondant au rôle.
void _goHome(BuildContext context) => Navigator.of(context).popUntil((r) => r.isFirst);

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _login = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _login.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (_login.text.trim().isEmpty || _password.text.isEmpty) {
      return setState(() => _error = 'Renseignez votre identifiant et votre mot de passe.');
    }
    setState(() => _loading = true);
    final phone = isPhone(_login.text);
    try {
      await api.signIn(phone ? phoneToEmail(_login.text) : _login.text.trim(), _password.text);
      await session.refresh();
      if (mounted) _goHome(context);
    } on ApiException catch (e) {
      setState(() {
        _loading = false;
        _error = phone && e.message.toLowerCase().contains('invalid')
            ? 'Téléphone ou mot de passe incorrect. Si vous vous êtes inscrit avec un email, connectez-vous avec votre email.'
            : authError(e.message);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const HappyLogo()),
      body: AutofillGroup(
        child: ListView(padding: const EdgeInsets.fromLTRB(20, 0, 20, 40), children: [
          const Center(child: GiftStack(width: 190)),
          const Title2('Bon retour'),
          const SizedBox(height: 4),
          const Muted('Célébrants et administrateur se connectent ici.'),
          const SizedBox(height: 20),
          Field(label: 'Email ou téléphone', controller: _login, keyboardType: TextInputType.emailAddress, autofillHints: const [AutofillHints.username]),
          Field(label: 'Mot de passe', controller: _password, obscure: true, autofillHints: const [AutofillHints.password]),
          ErrorText(_error),
          PillButton(label: 'Se connecter', loading: _loading, onPressed: _submit),
          const SizedBox(height: 10),
          PillButton(
            label: 'Pas encore de compte ? S’inscrire',
            variant: BtnVariant.ghost,
            onPressed: () => Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const SignupScreen())),
          ),
        ]),
      ),
    );
  }
}

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});
  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  String _type = 'celebrant';
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [_name, _phone, _email, _password]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (_name.text.trim().isEmpty || _phone.text.trim().isEmpty) {
      return setState(() => _error = 'Le nom et le téléphone sont obligatoires.');
    }
    if (_password.text.length < 6) return setState(() => _error = 'Mot de passe trop court : 6 caractères minimum.');
    setState(() => _loading = true);
    try {
      // Métadonnées lues par le déclencheur SQL handle_new_user pour créer le profil
      await api.signUp(
        _email.text.trim().isNotEmpty ? _email.text.trim() : phoneToEmail(_phone.text),
        _password.text,
        {'full_name': _name.text.trim(), 'phone': _phone.text.trim()},
      );
      await session.refresh();
      if (mounted) {
        toast(context, 'Bienvenue sur Happy');
        _goHome(context);
      }
    } on ApiException catch (e) {
      setState(() {
        _loading = false;
        _error = e.message.contains('registered')
            ? (_email.text.trim().isNotEmpty ? 'Cet email a déjà un compte. Connectez-vous.' : 'Ce numéro a déjà un compte. Connectez-vous.')
            : authError(e.message);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const HappyLogo()),
      body: AutofillGroup(
        child: ListView(padding: const EdgeInsets.fromLTRB(20, 8, 20, 40), children: [
          const Title2('Créer mon compte'),
          const SizedBox(height: 4),
          const Muted('Vous préparez votre anniversaire et votre liste, puis vous demandez l’accès pour les partager.'),
          const SizedBox(height: 20),
          Segmented<String>(
            value: _type,
            onChanged: (v) => setState(() => _type = v),
            options: const [
              (key: 'celebrant', label: 'Mon anniversaire', icon: Icons.cake_rounded),
              (key: 'vendor', label: 'Ma boutique', icon: Icons.storefront_rounded),
            ],
          ),
          if (_type == 'vendor')
            const ComingSoon(
              title: 'Ouvrir ma boutique',
              compact: true,
              text: 'L’inscription des boutiques partenaires (vitrine, articles, commandes) arrive très bientôt. '
                  'En attendant, créez votre compte « Mon anniversaire ».',
            )
          else ...[
            Field(label: 'Nom complet', controller: _name, capitalization: TextCapitalization.words, autofillHints: const [AutofillHints.name]),
            Field(label: 'Téléphone / WhatsApp', controller: _phone, keyboardType: TextInputType.phone, autofillHints: const [AutofillHints.telephoneNumber]),
            Field(
              label: 'Email (facultatif)',
              controller: _email,
              hint: 'Sans email, connexion avec votre téléphone',
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
            ),
            Field(label: 'Mot de passe', controller: _password, obscure: true, hint: '6 caractères minimum', autofillHints: const [AutofillHints.newPassword]),
            ErrorText(_error),
            PillButton(label: 'Créer mon compte', variant: BtnVariant.candy, loading: _loading, onPressed: _submit),
          ],
          const SizedBox(height: 10),
          PillButton(
            label: 'Déjà inscrit ? Se connecter',
            variant: BtnVariant.ghost,
            onPressed: () => Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen())),
          ),
        ]),
      ),
    );
  }
}
