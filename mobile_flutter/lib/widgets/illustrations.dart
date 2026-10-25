// Illustrations vectorielles Happy (CustomPainter), reprises de components/Illustrations.tsx :
// - GiftStack       : pile de cadeaux + ballons (accueil, connexion)
// - GiftPlaceholder : fond d'une carte cadeau sans photo
// - HappyLogo       : pastille rose + nom en Cormorant
// - Confetti        : fond décoratif (en-tête admin)
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../core/theme.dart';

const _rose = [Color(0xFFF06A8B), Color(0xFFE0456B), Color(0xFFB82F52)];
const _plum = [Color(0xFF5A3677), Color(0xFF3A2150), Color(0xFF26143A)];
const _gold = [Color(0xFFB98F55), Color(0xFFEAD3A2), Color(0xFFB98F55)];
const _cream = [Color(0xFFFFF6F1), Color(0xFFF4E2DA), Color(0xFFE3C9BE)];

Paint _grad(List<Color> c, Rect r, {bool vertical = false}) => Paint()
  ..shader = LinearGradient(
    begin: vertical ? Alignment.topCenter : Alignment.centerLeft,
    end: vertical ? Alignment.bottomCenter : Alignment.centerRight,
    colors: c,
  ).createShader(r);

/// Dessine un cadeau (boîte + couvercle + ruban + nœud) dans le rectangle de la boîte.
void _drawGift(Canvas c, Rect box, double lidH, List<Color> body, List<Color> ribbon, {bool bow = true, bool hBand = false}) {
  c.drawRRect(RRect.fromRectAndRadius(box, const Radius.circular(6)), _grad(body, box));
  final rw = box.width * 0.11;
  final band = Rect.fromLTWH(box.center.dx - rw / 2, box.top, rw, box.height);
  c.drawRect(band, _grad(ribbon, band));
  if (hBand) {
    final hb = Rect.fromLTWH(box.left, box.center.dy - rw / 2, box.width, rw);
    c.drawRect(hb, _grad(ribbon, hb, vertical: true));
  }
  final lid = Rect.fromLTWH(box.left - box.width * 0.05, box.top - lidH, box.width * 1.1, lidH + 4);
  c.drawRRect(RRect.fromRectAndRadius(lid, const Radius.circular(7)), _grad(body.reversed.toList(), lid, vertical: true));
  final lband = Rect.fromLTWH(band.left, lid.top, rw, lid.height);
  c.drawRect(lband, _grad(ribbon, lband));
  if (bow) {
    final cx = box.center.dx, cy = lid.top;
    final s = box.width / 200;
    final p = _grad(_gold, Rect.fromCircle(center: Offset(cx, cy), radius: 30 * s));
    c.save();
    c.translate(cx, cy);
    for (final dir in [-1.0, 1.0]) {
      c.save();
      c.rotate(dir * 0.38);
      c.drawOval(Rect.fromCenter(center: Offset(dir * 24 * s, -10 * s), width: 52 * s, height: 30 * s), p);
      c.drawOval(Rect.fromCenter(center: Offset(dir * 22 * s, -9 * s), width: 26 * s, height: 12 * s), Paint()..color = const Color(0x739C7640));
      c.restore();
    }
    c.drawRRect(RRect.fromRectAndRadius(Rect.fromCenter(center: Offset(0, -3 * s), width: 18 * s, height: 18 * s), Radius.circular(6 * s)), p);
    c.restore();
  }
}

void _balloon(Canvas c, Offset o, double r, List<Color> colors) {
  final string = Path()
    ..moveTo(o.dx, o.dy + r * 1.2)
    ..cubicTo(o.dx - 10, o.dy + r * 2, o.dx + 14, o.dy + r * 2.6, o.dx - 4, o.dy + r * 3.6);
  c.drawPath(string, Paint()..color = HappyColors.mango..style = PaintingStyle.stroke..strokeWidth = 1.5);
  final rect = Rect.fromCenter(center: o, width: r * 2, height: r * 2.36);
  c.drawOval(rect, Paint()..shader = LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: colors).createShader(rect));
  c.drawOval(Rect.fromCenter(center: o.translate(-r * 0.35, -r * 0.45), width: r * 0.44, height: r * 0.68), Paint()..color = const Color(0x59FFFFFF));
}

void _sparkle(Canvas c, Offset o, double s, Color color) {
  final p = Path()
    ..moveTo(o.dx, o.dy - s)
    ..quadraticBezierTo(o.dx, o.dy, o.dx + s, o.dy)
    ..quadraticBezierTo(o.dx, o.dy, o.dx, o.dy + s)
    ..quadraticBezierTo(o.dx, o.dy, o.dx - s, o.dy)
    ..quadraticBezierTo(o.dx, o.dy, o.dx, o.dy - s)
    ..close();
  c.drawPath(p, Paint()..color = color);
}

/// Pile de cadeaux et ballons.
class GiftStack extends StatelessWidget {
  const GiftStack({super.key, this.width = 280});
  final double width;
  @override
  Widget build(BuildContext context) => Semantics(
        label: 'Pile de cadeaux emballés et ballons',
        child: CustomPaint(size: Size(width, width * 460 / 480), painter: _StackPainter()),
      );
}

class _StackPainter extends CustomPainter {
  @override
  void paint(Canvas c, Size size) {
    c.scale(size.width / 480, size.height / 460);
    c.drawCircle(const Offset(240, 235), 215,
        Paint()..shader = const RadialGradient(colors: [HappyColors.lilac, Color(0x00F6E7EA)]).createShader(Rect.fromCircle(center: const Offset(240, 235), radius: 215)));
    _balloon(c, const Offset(120, 92), 34, const [Color(0xFFF58CA6), Color(0xFFD83D64)]);
    _balloon(c, const Offset(176, 62), 26, const [Color(0xFFF1DDB3), Color(0xFFBE945A)]);
    c.drawOval(Rect.fromCenter(center: const Offset(240, 408), width: 380, height: 32), Paint()..color = const Color(0x1A1E1428));
    _drawGift(c, const Rect.fromLTWH(268, 196, 136, 206), 38, _plum, _gold);
    _drawGift(c, const Rect.fromLTWH(72, 248, 200, 154), 42, _rose, _gold, hBand: true);
    _drawGift(c, const Rect.fromLTWH(232, 336, 112, 66), 26, _cream, _rose, bow: false);
    _sparkle(c, const Offset(420, 110), 14, HappyColors.mango);
    _sparkle(c, const Offset(448, 150), 7, HappyColors.candy);
    _sparkle(c, const Offset(58, 190), 9, HappyColors.mango);
    _sparkle(c, const Offset(250, 118), 6, HappyColors.candy);
    c.drawCircle(const Offset(400, 70), 4, Paint()..color = const Color(0x99E0456B));
  }

  @override
  bool shouldRepaint(_StackPainter old) => false;
}

/// Cadeau dessiné quand un cadeau n'a pas de photo. Le ton varie selon l'identifiant.
class GiftPlaceholder extends StatelessWidget {
  const GiftPlaceholder({super.key, this.seed = ''});
  final String seed;
  @override
  Widget build(BuildContext context) {
    final tone = seed.codeUnits.fold<int>(0, (a, b) => a + b) % 3;
    return CustomPaint(painter: _PlaceholderPainter(tone), size: Size.infinite);
  }
}

class _PlaceholderPainter extends CustomPainter {
  _PlaceholderPainter(this.tone);
  final int tone;
  @override
  void paint(Canvas c, Size size) {
    c.drawRect(Offset.zero & size, Paint()..color = HappyColors.lilac);
    final s = math.min(size.width / 400, size.height / 300);
    c.translate((size.width - 400 * s) / 2, (size.height - 300 * s) / 2);
    c.scale(s);
    c.drawCircle(const Offset(200, 160), 120, Paint()..color = const Color(0x99FFFFFF));
    c.drawOval(Rect.fromCenter(center: const Offset(200, 246), width: 192, height: 18), Paint()..color = const Color(0x141E1428));
    final body = tone == 1 ? _plum : tone == 2 ? _cream : _rose;
    _drawGift(c, const Rect.fromLTWH(130, 154, 140, 90), 32, body, _gold);
    _sparkle(c, const Offset(300, 90), 10, HappyColors.mango);
    _sparkle(c, const Offset(100, 120), 6, HappyColors.candy);
  }

  @override
  bool shouldRepaint(_PlaceholderPainter old) => old.tone != tone;
}

/// Logo Happy.
class HappyLogo extends StatelessWidget {
  const HappyLogo({super.key, this.light = false});
  final bool light;
  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(color: HappyColors.candy, borderRadius: BorderRadius.circular(11)),
          child: const Icon(Icons.card_giftcard_rounded, color: Colors.white, size: 19),
        ),
        const SizedBox(width: 10),
        Text('Happy', style: display(26, color: light ? Colors.white : HappyColors.ink)),
      ]);
}

/// Fond de confettis (déterministe) posé derrière un en-tête sombre.
class ConfettiBackground extends StatelessWidget {
  const ConfettiBackground({super.key, this.seed = 11, this.opacity = 0.5});
  final int seed;
  final double opacity;
  @override
  Widget build(BuildContext context) => IgnorePointer(
        child: Opacity(opacity: opacity, child: CustomPaint(painter: _ConfettiPainter(seed), size: Size.infinite)),
      );
}

class _ConfettiPainter extends CustomPainter {
  _ConfettiPainter(this.seed);
  final int seed;
  @override
  void paint(Canvas c, Size size) {
    final r = math.Random(seed);
    const pal = [HappyColors.candy, HappyColors.mango, Color(0xFFF2B8C6), Colors.white];
    for (var i = 0; i < 46; i++) {
      final x = r.nextDouble() * size.width, y = r.nextDouble() * size.height;
      final p = Paint()..color = pal[r.nextInt(pal.length)];
      if (r.nextBool()) {
        final w = 6 + r.nextDouble() * 10;
        c.save();
        c.translate(x, y);
        c.rotate(r.nextDouble() * math.pi);
        c.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(0, 0, w, w * 0.45), const Radius.circular(1.5)), p);
        c.restore();
      } else {
        c.drawCircle(Offset(x, y), 2 + r.nextDouble() * 3.5, p);
      }
    }
  }

  @override
  bool shouldRepaint(_ConfettiPainter old) => old.seed != seed;
}
