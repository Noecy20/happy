// Révélation : carte emballée qui se retourne au toucher et montre qui a offert le cadeau.
// Face avant : papier cadeau + ruban + nom du cadeau. Face arrière : nom de l'ami et son mot.
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../core/theme.dart';
import 'wrap_paper.dart';

class FlipCard extends StatefulWidget {
  const FlipCard({super.key, required this.gift, required this.accent});
  final Map<String, dynamic> gift;
  final Color accent;
  @override
  State<FlipCard> createState() => _FlipCardState();
}

class _FlipCardState extends State<FlipCard> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  void _toggle() {
    final fast = MediaQuery.of(context).disableAnimations;
    final opening = _c.value < 0.5;
    if (fast) {
      _c.value = opening ? 1 : 0; // accessibilité : pas d'animation
    } else if (opening) {
      _c.forward();
    } else {
      _c.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    final g = widget.gift;
    return Semantics(
      button: true,
      label: 'Révéler ${g['name']}',
      child: GestureDetector(
        onTap: _toggle,
        child: SizedBox(
          height: 220,
          child: AnimatedBuilder(
            animation: _c,
            builder: (_, __) {
              final angle = Curves.easeInOutBack.transform(_c.value) * math.pi;
              final showBack = angle > math.pi / 2;
              return Transform(
                alignment: Alignment.center,
                transform: Matrix4.identity()
                  ..setEntry(3, 2, 0.001) // perspective
                  ..rotateY(angle),
                child: showBack
                    ? Transform(alignment: Alignment.center, transform: Matrix4.rotationY(math.pi), child: _back(g))
                    : _front(g),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _front(Map<String, dynamic> g) => ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(fit: StackFit.expand, children: [
          WrapPaper(color: widget.accent),
          const RibbonV(),
          const RibbonH(),
          Positioned(
            left: 12,
            right: 12,
            bottom: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(99)),
              child: Text(g['name']?.toString() ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: body(14, weight: FontWeight.w700)),
            ),
          ),
        ]),
      );

  Widget _back(Map<String, dynamic> g) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: HappyColors.line), boxShadow: softShadow),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(g['name']?.toString() ?? '', style: body(12, color: HappyColors.muted, weight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(g['friend_name']?.toString() ?? 'Un proche', style: display(30)),
          if ((g['friend_message'] ?? '').toString().isNotEmpty) ...[
            const SizedBox(height: 10),
            Text('« ${g['friend_message']} »', style: body(14, color: const Color(0xBF1E1428), height: 1.45).copyWith(fontStyle: FontStyle.italic)),
          ],
        ]),
      );
}
