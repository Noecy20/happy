// Carte cadeau. Quand un cadeau est réservé, il « s'emballe » sous nos yeux :
// 1. le papier satiné descend du haut de la photo,
// 2. le ruban vertical puis le ruban horizontal apparaissent,
// 3. l'étiquette « Déjà réservé » (ou « Vous l'offrez ») surgit au centre.
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/api.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import 'illustrations.dart';
import 'ui.dart';
import 'wrap_paper.dart';

class WrappedCard extends StatefulWidget {
  const WrappedCard({
    super.key,
    required this.gift,
    this.onClaim,
    this.mine = false,
    this.closed = false,
    this.accent = HappyColors.candy,
    this.accentHex,
    this.footer,
  });

  /// Cadeau tel que renvoyé par get_public_event ou get_my_gifts.
  final Map<String, dynamic> gift;
  final VoidCallback? onClaim;
  final bool mine;
  final bool closed;
  final Color accent;
  final String? accentHex;
  final Widget? footer;

  @override
  State<WrappedCard> createState() => _WrappedCardState();
}

class _WrappedCardState extends State<WrappedCard> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500));

  bool get _claimed => widget.gift['claimed'] == true;

  @override
  void initState() {
    super.initState();
    if (_claimed) _c.forward();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Accessibilité : « réduire les animations » → le cadeau apparaît directement emballé.
    if (MediaQuery.of(context).disableAnimations && _claimed) _c.value = 1;
  }

  @override
  void didUpdateWidget(WrappedCard old) {
    super.didUpdateWidget(old);
    // Le cadeau vient d'être réservé (par moi ou par un autre ami) : on l'emballe.
    if (_claimed && old.gift['claimed'] != true) _c.forward(from: 0);
    if (!_claimed) _c.value = 0;
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  /// Portion de l'animation entre a et b (0 → 1), avec une courbe.
  double _seg(double a, double b, [Curve curve = Curves.easeInOutCubic]) =>
      curve.transform(((_c.value - a) / (b - a)).clamp(0.0, 1.0));

  @override
  Widget build(BuildContext context) {
    final g = widget.gift;
    final img = imageUrl(g['image_url'] as String?);
    final price = toNum(g['price']);
    final canClaim = widget.onClaim != null && !_claimed && !widget.closed;

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: HappyColors.line),
        boxShadow: softShadow,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        AspectRatio(
          aspectRatio: 4 / 3,
          child: Stack(fit: StackFit.expand, children: [
            if (img != null)
              Image.network(img, fit: BoxFit.cover, errorBuilder: (_, __, ___) => GiftPlaceholder(seed: g['id'].toString()))
            else
              GiftPlaceholder(seed: g['id'].toString()),
            if (_claimed)
              AnimatedBuilder(
                animation: _c,
                builder: (_, __) => Stack(fit: StackFit.expand, children: [
                  // papier qui descend depuis le haut
                  Transform(
                    alignment: Alignment.topCenter,
                    transform: Matrix4.diagonal3Values(1, _seg(0, 0.5), 1),
                    child: WrapPaper(color: widget.accent),
                  ),
                  Transform(
                    alignment: Alignment.topCenter,
                    transform: Matrix4.diagonal3Values(1, _seg(0.37, 0.63), 1),
                    child: const RibbonV(),
                  ),
                  Transform(
                    alignment: Alignment.centerLeft,
                    transform: Matrix4.diagonal3Values(_seg(0.5, 0.77), 1, 1),
                    child: const RibbonH(),
                  ),
                  Center(
                    child: Opacity(
                      opacity: _seg(0.67, 0.85),
                      child: Transform.scale(
                        scale: 0.6 + 0.4 * _seg(0.67, 1, Curves.elasticOut),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(99), boxShadow: softShadow),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            Icon(widget.mine ? Icons.favorite_rounded : Icons.lock_rounded, size: 15, color: widget.mine ? HappyColors.candy : HappyColors.ink),
                            const SizedBox(width: 6),
                            Text(widget.mine ? 'Vous l’offrez' : 'Déjà réservé', style: body(14, weight: FontWeight.w700)),
                          ]),
                        ),
                      ),
                    ),
                  ),
                ]),
              ),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(g['name']?.toString() ?? '', style: display(24)),
            if (price != null && price > 0) ...[
              const SizedBox(height: 4),
              Text(formatPrice(price), style: body(14, weight: FontWeight.w700, color: const Color(0xBF1E1428))),
            ],
            if ((g['description'] ?? '').toString().isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(g['description'].toString(), style: body(14, color: HappyColors.muted, height: 1.45)),
            ],
            if ((g['product_link'] ?? '').toString().isNotEmpty) ...[
              const SizedBox(height: 10),
              Wrap(children: [
                GestureDetector(
                  onTap: () => launchUrl(Uri.parse(g['product_link'].toString()), mode: LaunchMode.externalApplication),
                  child: const Tag('Voir le produit', icon: Icons.open_in_new_rounded),
                ),
              ]),
            ],
            if (canClaim) ...[
              const SizedBox(height: 16),
              PillButton(
                label: 'Je m’en charge',
                color: widget.accent,
                textColor: readableOn(widget.accentHex),
                onPressed: widget.onClaim,
              ),
            ],
            if (widget.footer != null) ...[const SizedBox(height: 12), widget.footer!],
          ]),
        ),
      ]),
    );
  }
}
