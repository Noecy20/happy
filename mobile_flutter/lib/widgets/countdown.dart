// Compte à rebours jours / heures / minutes / secondes jusqu'à l'anniversaire (mis à jour chaque seconde).
import 'dart:async';

import 'package:flutter/material.dart';

import '../core/theme.dart';
import '../core/utils.dart';

class Countdown extends StatefulWidget {
  const Countdown({super.key, required this.date, this.color = HappyColors.ink, this.onDark = false});
  final String date; // "AAAA-MM-JJ"
  final Color color;
  final bool onDark;
  @override
  State<Countdown> createState() => _CountdownState();
}

class _CountdownState extends State<Countdown> {
  late Timer _timer;
  DateTime _now = DateTime.now();

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => setState(() => _now = DateTime.now()));
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final d = parseDay(widget.date);
    final target = DateTime(d.year, d.month, d.day);
    final diff = target.difference(_now);
    final fg = widget.onDark ? Colors.white : widget.color;

    if (diff.isNegative) {
      final today = _now.isBefore(target.add(const Duration(days: 1)));
      return Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(today ? Icons.cake_rounded : Icons.celebration_rounded, color: fg, size: 26),
        const SizedBox(width: 8),
        Text(today ? 'C’est aujourd’hui' : 'La fête est passée', style: display(28, color: fg)),
      ]);
    }
    final parts = [
      (diff.inDays, 'jours'),
      (diff.inHours % 24, 'heures'),
      (diff.inMinutes % 60, 'min'),
      (diff.inSeconds % 60, 'sec'),
    ];
    return Semantics(
      label: 'Compte à rebours : ${diff.inDays} jours',
      // FittedBox : réduit légèrement le compteur sur les petits écrans au lieu de déborder
      child: FittedBox(fit: BoxFit.scaleDown, child: Row(mainAxisSize: MainAxisSize.min, children: [
        for (final (v, l) in parts)
          Container(
            width: 66,
            margin: const EdgeInsets.symmetric(horizontal: 4),
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: widget.onDark ? const Color(0x1AFFFFFF) : Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: widget.onDark ? null : Border.all(color: HappyColors.line),
            ),
            child: Column(children: [
              Text(v.toString().padLeft(2, '0'), style: body(24, color: fg, weight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(l, style: body(11, weight: FontWeight.w600, color: widget.onDark ? const Color(0xB3FFFFFF) : HappyColors.muted)),
            ]),
          ),
      ])),
    );
  }
}
