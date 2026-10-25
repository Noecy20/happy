// Papier cadeau satiné + ruban champagne (élément signature de Happy),
// équivalent des classes CSS .wrap-paper / .ribbon-v / .ribbon-h du site.
import 'package:flutter/material.dart';

const _ribbon = [Color(0xFFB98F55), Color(0xFFE9CF9C), Color(0xFFB98F55)];

/// Fond : couleur d'accent, fines rayures diagonales, reflet satiné.
class WrapPaper extends StatelessWidget {
  const WrapPaper({super.key, required this.color});
  final Color color;
  @override
  Widget build(BuildContext context) => CustomPaint(painter: _PaperPainter(color), size: Size.infinite);
}

class _PaperPainter extends CustomPainter {
  _PaperPainter(this.color);
  final Color color;
  @override
  void paint(Canvas canvas, Size size) {
    final r = Offset.zero & size;
    canvas.drawRect(r, Paint()..color = color);
    // rayures à 45°
    final stripe = Paint()
      ..color = const Color(0x12FFFFFF)
      ..strokeWidth = 2;
    for (double x = -size.height; x < size.width; x += 12) {
      canvas.drawLine(Offset(x, size.height), Offset(x + size.height, 0), stripe);
    }
    // reflet satiné
    canvas.drawRect(r, Paint()..shader = const LinearGradient(
      begin: Alignment.topLeft, end: Alignment.bottomRight,
      colors: [Color(0x38FFFFFF), Color(0x00FFFFFF), Color(0x1FFFFFFF), Color(0x00FFFFFF)],
      stops: [0, 0.4, 0.6, 1],
    ).createShader(r));
  }

  @override
  bool shouldRepaint(_PaperPainter old) => old.color != color;
}

/// Ruban vertical (largeur 18).
class RibbonV extends StatelessWidget {
  const RibbonV({super.key});
  @override
  Widget build(BuildContext context) => Center(
        child: Container(width: 18, decoration: const BoxDecoration(gradient: LinearGradient(colors: _ribbon))),
      );
}

/// Ruban horizontal (hauteur 18).
class RibbonH extends StatelessWidget {
  const RibbonH({super.key});
  @override
  Widget build(BuildContext context) => Center(
        child: Container(
          height: 18,
          decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: _ribbon)),
        ),
      );
}
