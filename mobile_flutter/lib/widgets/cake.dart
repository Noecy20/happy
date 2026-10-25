// Gâteau d'anniversaire animé, dessiné avec CustomPainter (reprise du composant web Cake.tsx).
// - Une bougie par année, jusqu'à 36 dessinées (1 à 3 rangées).
// - Les bougies apparaissent, puis les flammes vacillent en continu.
// - Couleur du gâteau = couleur de thème du célébrant.
// - Si l'utilisateur a demandé de réduire les animations (accessibilité), tout reste immobile.
import 'dart:math' as math;

import 'package:flutter/material.dart';

class Cake extends StatefulWidget {
  const Cake({super.key, required this.age, required this.color, this.width = 260});
  final int age;
  final Color color;
  final double width;

  @override
  State<Cake> createState() => _CakeState();
}

class _CakeState extends State<Cake> with TickerProviderStateMixin {
  late final AnimationController _rise = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
  late final AnimationController _flicker = AnimationController(vsync: this, duration: const Duration(milliseconds: 1800));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduce = MediaQuery.of(context).disableAnimations;
    if (reduce) {
      _rise.value = 1;
      _flicker.stop();
    } else {
      if (_rise.value == 0) _rise.forward();
      if (!_flicker.isAnimating) _flicker.repeat();
    }
  }

  @override
  void dispose() {
    _rise.dispose();
    _flicker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Gâteau avec ${widget.age} bougies',
      child: SizedBox(
        width: widget.width,
        height: widget.width * 270 / 320,
        child: AnimatedBuilder(
          animation: Listenable.merge([_rise, _flicker]),
          builder: (_, __) => CustomPaint(
            painter: _CakePainter(
              age: widget.age,
              color: widget.color,
              rise: Curves.easeOutBack.transform(_rise.value.clamp(0.0, 1.0)),
              clock: _flicker.value * 2 * math.pi,
            ),
          ),
        ),
      ),
    );
  }
}

class _CakePainter extends CustomPainter {
  _CakePainter({required this.age, required this.color, required this.rise, required this.clock});
  final int age;
  final Color color;
  final double rise;  // 0 → 1 : apparition des bougies
  final double clock; // horloge du vacillement (radians)

  static const cream1 = Color(0xFFFFF7F2);
  static const cream2 = Color(0xFFF6E3DA);
  static const cream3 = Color(0xFFE8CDBF);
  static const gold = Color(0xFFC8A26A);

  /// Glaçage qui coule entre x0 et x1 (même formule que le web).
  Path drip(double x0, double x1, double top, double base, int n) {
    final w = (x1 - x0) / n;
    final p = Path()
      ..moveTo(x0, top + 8)
      ..quadraticBezierTo(x0, top, x0 + 10, top)
      ..lineTo(x1 - 10, top)
      ..quadraticBezierTo(x1, top, x1, top + 8)
      ..lineTo(x1, base);
    for (var i = n; i > 0; i--) {
      final xa = x0 + i * w, xm = xa - w / 2, deep = i.isOdd ? 14.0 : 8.0;
      p.quadraticBezierTo(xm, base + deep, xa - w, base);
    }
    return p..close();
  }

  @override
  void paint(Canvas canvas, Size size) {
    // On dessine dans un repère 320 × 270 puis on met à l'échelle.
    canvas.scale(size.width / 320, size.height / 270);
    final creamShader = const LinearGradient(colors: [cream1, cream2, cream3], stops: [0, 0.7, 1]);

    // Ombre et plateau
    canvas.drawOval(const Rect.fromLTWH(10, 230, 300, 32), Paint()..color = const Color(0x1A1E1428));
    canvas.drawOval(const Rect.fromLTWH(22, 224, 276, 28), Paint()..color = Colors.white);
    canvas.drawOval(const Rect.fromLTWH(22, 224, 276, 28),
        Paint()..color = const Color(0x141E1428)..style = PaintingStyle.stroke);

    // Étage du bas (couleur du thème)
    const bottom = Rect.fromLTWH(28, 152, 264, 84);
    canvas.drawRRect(RRect.fromRectAndRadius(bottom, const Radius.circular(10)),
        Paint()..shader = LinearGradient(colors: [color.withAlpha(217), color, Color.alphaBlend(const Color(0x40000000), color)], stops: const [0, 0.6, 1]).createShader(bottom));
    canvas.drawPath(drip(28, 292, 150, 172, 14), Paint()..shader = creamShader.createShader(const Rect.fromLTWH(28, 150, 264, 40)));
    final dot = Paint()..color = gold;
    for (final x in [58.0, 98.0, 140.0, 180.0, 222.0, 262.0]) {
      canvas.drawCircle(Offset(x, 210), 3.2, dot);
    }

    // Étage du haut (crème + glaçage coloré)
    const top = Rect.fromLTWH(58, 96, 204, 62);
    canvas.drawRRect(RRect.fromRectAndRadius(top, const Radius.circular(8)), Paint()..shader = creamShader.createShader(top));
    canvas.drawPath(drip(58, 262, 96, 114, 11), Paint()..color = color);
    canvas.drawOval(const Rect.fromLTWH(58, 86, 204, 22), Paint()..color = cream1);

    // Bougies
    final n = age.clamp(1, 36);
    final perRow = n <= 12 ? n : (n / (n / 12).ceil()).ceil();
    final rows = <List<int>>[];
    for (var i = 0; i < n; i += perRow) {
      rows.add([for (var k = i; k < math.min(i + perRow, n); k++) k]);
    }
    final rowY = rows.length == 1 ? [96.0] : rows.length == 2 ? [90.0, 101.0] : [86.0, 95.0, 104.0];
    final stripes = [gold, color, Colors.white];

    canvas.save();
    // Les bougies « tombent » légèrement en apparaissant
    canvas.translate(0, (1 - rise) * -18);
    final alpha = (rise.clamp(0.0, 1.0) * 255).round();
    for (var ri = 0; ri < rows.length; ri++) {
      final row = rows[ri];
      for (var ci = 0; ci < row.length; ci++) {
        final idx = row[ci];
        const span = 176.0;
        final x = 160 - span / 2 + (row.length == 1 ? span / 2 : (span / (row.length - 1)) * ci) + (ri.isOdd ? 4 : 0);
        final y = rowY[ri];
        const h = 26.0;
        // corps de la bougie
        canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(x - 3, y - h, 6, h), const Radius.circular(2)),
            Paint()..color = stripes[idx % 3].withAlpha(alpha));
        canvas.drawLine(Offset(x, y - h), Offset(x, y - h - 4), Paint()..color = const Color(0xFF3A2150).withAlpha(alpha)..strokeWidth = 1.2);
        // halo
        canvas.drawCircle(Offset(x, y - h - 10), 11,
            Paint()..shader = RadialGradient(colors: [const Color(0x8CFFD36B), const Color(0x00FFD36B)]).createShader(Rect.fromCircle(center: Offset(x, y - h - 10), radius: 11)));
        // flamme qui vacille
        final phase = idx * 0.9;
        final k = 1 + 0.1 * math.sin(clock * 2 + phase);
        final lean = 1.2 * math.sin(clock + phase);
        final base = y - h - 3.5;
        final tip = base - 14.5 * k;
        final flame = Path()
          ..moveTo(x + lean, tip)
          ..cubicTo(x + 5, base - 7.5 * k, x + 4.5, base - 0.5, x, base)
          ..cubicTo(x - 4.5, base - 0.5, x - 5, base - 7.5 * k, x + lean, tip)
          ..close();
        canvas.drawPath(flame, Paint()..shader = const LinearGradient(
          begin: Alignment.bottomCenter, end: Alignment.topCenter,
          colors: [Color(0xFFF27A1A), Color(0xFFFFC94A), Color(0xFFFFF4C2)], stops: [0, 0.55, 1],
        ).createShader(Rect.fromLTWH(x - 5, tip, 10, base - tip)));
      }
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_CakePainter old) => old.rise != rise || old.clock != clock || old.color != color || old.age != age;
}
