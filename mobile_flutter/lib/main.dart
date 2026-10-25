// Point d'entrée de l'application Happy (Flutter).
// 1. Prépare les dates en français.
// 2. Relit la session enregistrée (jeton) et le profil.
// 3. Affiche l'écran qui correspond au rôle : visiteur, célébrant, admin (boutique : bientôt disponible).
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'core/session.dart';
import 'core/theme.dart';
import 'screens/admin/admin_shell.dart';
import 'screens/celebrant/celebrant_shell.dart';
import 'screens/home_screen.dart';
import 'widgets/coming_soon.dart';
import 'widgets/ui.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('fr_FR');
  await session.restore();
  runApp(const HappyApp());
}

class HappyApp extends StatelessWidget {
  const HappyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Happy',
      debugShowCheckedModeBanner: false,
      theme: happyTheme(),
      // Interface en français (calendrier, boutons système…)
      locale: const Locale('fr', 'FR'),
      supportedLocales: const [Locale('fr', 'FR')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const RootGate(),
    );
  }
}

/// Aiguillage selon la session : se redessine automatiquement à la connexion / déconnexion.
class RootGate extends StatelessWidget {
  const RootGate({super.key});
  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: session,
      builder: (context, _) {
        if (!session.ready) return const Scaffold(body: Loading());
        final role = session.role;
        if (role == null) return const HomeScreen();
        if (role == 'admin') return const AdminShell();
        if (role == 'vendor') {
          return ComingSoonScreen(
            title: 'Espace boutique',
            text: 'Votre compte boutique est bien créé. La gestion des articles, des commandes et du stock '
                'arrive très bientôt dans l’application.',
            action: PillButton(label: 'Se déconnecter', icon: Icons.logout_rounded, variant: BtnVariant.danger, onPressed: session.signOut),
          );
        }
        return const CelebrantShell();
      },
    );
  }
}
