// Carte d'invitation dans une enveloppe qui s'ouvre (lien invités uniquement).
// Fermée : enveloppe à la couleur du thème, cachet champagne. Au toucher : la carte apparaît en glissant.
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import 'ui.dart';

class Invitation extends StatefulWidget {
  const Invitation({super.key, required this.name, required this.age, required this.color, required this.colorHex,
      required this.date, this.time, this.place, this.details, this.dressCode});
  final String name;
  final int age;
  final Color color;
  final String? colorHex;
  final String date;
  final String? time, place, details, dressCode;
  @override
  State<Invitation> createState() => _InvitationState();
}

class _InvitationState extends State<Invitation> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.of(context).disableAnimations;
    return AnimatedSwitcher(
      duration: Duration(milliseconds: reduce ? 1 : 650),
      switchInCurve: Curves.easeOutBack,
      transitionBuilder: (child, anim) => SlideTransition(
        position: Tween(begin: const Offset(0, 0.25), end: Offset.zero).animate(anim),
        child: FadeTransition(opacity: anim, child: child),
      ),
      child: _open ? _card() : _envelope(),
    );
  }

  Widget _envelope() {
    final ink = readableOn(widget.colorHex);
    return Semantics(
      button: true,
      label: 'Ouvrir l’invitation',
      child: GestureDetector(
        key: const ValueKey('env'),
        onTap: () => setState(() => _open = true),
        child: AspectRatio(
          aspectRatio: 3 / 2,
          child: Container(
            decoration: BoxDecoration(color: widget.color, borderRadius: BorderRadius.circular(22), boxShadow: softShadow),
            clipBehavior: Clip.antiAlias,
            child: Stack(fit: StackFit.expand, children: [
              CustomPaint(painter: _FlapsPainter()),
              Align(
                alignment: const Alignment(0, 0.05),
                child: Container(
                  width: 78,
                  height: 78,
                  decoration: BoxDecoration(
                    color: HappyColors.mango,
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0x66FFFFFF), width: 4),
                    boxShadow: softShadow,
                  ),
                  child: const Icon(Icons.drafts_rounded, color: Colors.white, size: 30),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 18,
                child: Text('Touchez pour ouvrir l’invitation', textAlign: TextAlign.center, style: body(14, color: ink, weight: FontWeight.w700)),
              ),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _card() {
    final iconColor = textAccentOf(widget.colorHex);
    return Container(
      key: const ValueKey('card'),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(28), border: Border.all(color: HappyColors.line), boxShadow: softShadow),
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Container(height: 8, color: widget.color),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text('VOUS ÊTES INVITÉ(E)', textAlign: TextAlign.center, style: body(11, color: HappyColors.muted, weight: FontWeight.w700).copyWith(letterSpacing: 3)),
            const SizedBox(height: 14),
            Text('Les ${widget.age} ans\nde ${widget.name}', textAlign: TextAlign.center, style: display(38)),
            Center(child: Container(width: 64, height: 1, margin: const EdgeInsets.symmetric(vertical: 22), color: const Color(0x261E1428))),
            InfoRow(Icons.event_rounded, formatLongDate(widget.date), color: iconColor),
            if ((widget.time ?? '').isNotEmpty) InfoRow(Icons.schedule_rounded, widget.time!, color: iconColor),
            if ((widget.place ?? '').isNotEmpty) InfoRow(Icons.place_rounded, widget.place!, color: iconColor),
            if ((widget.dressCode ?? '').isNotEmpty) InfoRow(Icons.checkroom_rounded, 'Dress code : ${widget.dressCode}', color: iconColor),
            if ((widget.details ?? '').isNotEmpty)
              Container(
                margin: const EdgeInsets.only(top: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: fade(HappyColors.lilac, 0.6), borderRadius: BorderRadius.circular(18)),
                child: Text(widget.details!, style: body(14, height: 1.45)),
              ),
            if ((widget.place ?? '').isNotEmpty) ...[
              const SizedBox(height: 18),
              Center(
                child: PillButton(
                  label: 'Voir sur la carte',
                  icon: Icons.place_rounded,
                  variant: BtnVariant.ghost,
                  small: true,
                  expand: false,
                  onPressed: () => launchUrl(Uri.parse('https://www.google.com/maps/search/${Uri.encodeComponent(widget.place!)}'),
                      mode: LaunchMode.externalApplication),
                ),
              ),
            ],
          ]),
        ),
      ]),
    );
  }
}

/// Rabats de l'enveloppe.
class _FlapsPainter extends CustomPainter {
  @override
  void paint(Canvas c, Size s) {
    final bottom = Path()..moveTo(0, s.height)..lineTo(s.width / 2, s.height * 0.475)..lineTo(s.width, s.height)..close();
    c.drawPath(bottom, Paint()..color = const Color(0x14000000));
    final top = Path()..moveTo(0, 0)..lineTo(s.width / 2, s.height * 0.6)..lineTo(s.width, 0)..close();
    c.drawPath(top, Paint()..color = const Color(0x29FFFFFF));
    c.drawPath(top, Paint()..color = const Color(0x1A000000)..style = PaintingStyle.stroke);
  }

  @override
  bool shouldRepaint(_FlapsPainter old) => false;
}
