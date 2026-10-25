// Bandeau « Bientôt disponible » : la partie e-commerce (boutiques, commandes, stock)
// est prévue dans une prochaine version. Les tables existent déjà en base.
import 'package:flutter/material.dart';

import '../core/theme.dart';
import 'illustrations.dart';
import 'ui.dart';

class ComingSoon extends StatelessWidget {
  const ComingSoon({super.key, this.title = 'Les boutiques Happy', this.text, this.compact = false});
  final String title;
  final String? text;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(color: HappyColors.plum, borderRadius: BorderRadius.circular(28)),
      child: Stack(children: [
        const Positioned.fill(child: ConfettiBackground(seed: 4, opacity: 0.35)),
        Padding(
          padding: EdgeInsets.all(compact ? 20 : 28),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Tag('Bientôt disponible', tone: TagTone.gold, icon: Icons.hourglass_empty_rounded),
            const SizedBox(height: 12),
            Text(title, style: display(compact ? 28 : 34, color: Colors.white)),
            const SizedBox(height: 8),
            Text(
              text ??
                  'Commander directement un cadeau auprès des boutiques partenaires, le faire emballer et livrer, '
                      'suivre sa commande : cette partie arrive très bientôt.',
              style: body(14, color: const Color(0xB3FFFFFF), height: 1.5),
            ),
          ]),
        ),
      ]),
    );
  }
}

/// Écran complet « Bientôt disponible » (ex. compte boutique).
class ComingSoonScreen extends StatelessWidget {
  const ComingSoonScreen({super.key, required this.title, this.text, this.action});
  final String title;
  final String? text;
  final Widget? action;
  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: ListView(padding: const EdgeInsets.all(20), children: [
            const HappyLogo(),
            const SizedBox(height: 24),
            ComingSoon(title: title, text: text),
            if (action != null) ...[const SizedBox(height: 16), action!],
          ]),
        ),
      );
}
