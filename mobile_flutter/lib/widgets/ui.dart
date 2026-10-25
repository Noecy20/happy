// Kit d'interface Happy : briques réutilisées sur tous les écrans.
// Style élégant : titres Cormorant, texte Manrope, cartes très arrondies, boutons en pilule,
// zones tactiles d'au moins 44 px, aucune émoticône (uniquement des icônes).
import 'package:flutter/material.dart';

import '../core/theme.dart';
import '../core/utils.dart';

enum BtnVariant { primary, candy, ghost, light, glass, danger }

/// Bouton en pilule. `color` permet d'utiliser la couleur de thème du célébrant.
class PillButton extends StatelessWidget {
  const PillButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.variant = BtnVariant.primary,
    this.color,
    this.textColor,
    this.loading = false,
    this.small = false,
    this.expand = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final BtnVariant variant;
  final Color? color;
  final Color? textColor;
  final bool loading;
  final bool small;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    Color? border;
    switch (variant) {
      case BtnVariant.primary:
        bg = HappyColors.ink;
        fg = Colors.white;
        break;
      case BtnVariant.candy:
        bg = HappyColors.candy;
        fg = Colors.white;
        break;
      case BtnVariant.ghost:
        bg = Colors.white;
        fg = HappyColors.ink;
        border = const Color(0x261E1428);
        break;
      case BtnVariant.light:
        bg = Colors.white;
        fg = HappyColors.ink;
        break;
      case BtnVariant.glass:
        bg = const Color(0x1AFFFFFF);
        fg = Colors.white;
        border = const Color(0x33FFFFFF);
        break;
      case BtnVariant.danger:
        bg = Colors.white;
        fg = HappyColors.candy;
        border = fade(HappyColors.candy, 0.4);
        break;
    }
    if (color != null) bg = color!;
    if (textColor != null) fg = textColor!;
    final disabled = onPressed == null || loading;

    final content = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (loading)
          SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: fg))
        else ...[
          if (icon != null) ...[Icon(icon, size: small ? 16 : 18, color: fg), const SizedBox(width: 8)],
          // Flexible seulement si le bouton a une largeur imposée (sinon erreur de mise en page)
          if (expand)
            Flexible(
              child: Text(label,
                  textAlign: TextAlign.center,
                  overflow: TextOverflow.ellipsis,
                  style: body(small ? 14 : 15, color: fg, weight: FontWeight.w700)),
            )
          else
            Text(label, style: body(small ? 14 : 15, color: fg, weight: FontWeight.w700)),
        ],
      ],
    );

    return Opacity(
      opacity: disabled && !loading ? 0.5 : 1,
      child: Material(
        color: bg,
        shape: StadiumBorder(side: border == null ? BorderSide.none : BorderSide(color: border)),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: disabled ? null : onPressed,
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: small ? 44 : 52),
            child: Padding(padding: EdgeInsets.symmetric(horizontal: small ? 16 : 20, vertical: 10), child: Center(widthFactor: 1, child: content)),
          ),
        ),
      ),
    );
  }
}

/// Titre en Cormorant Garamond.
class Title2 extends StatelessWidget {
  const Title2(this.text, {super.key, this.size = 34, this.color = HappyColors.ink, this.align});
  final String text;
  final double size;
  final Color color;
  final TextAlign? align;
  @override
  Widget build(BuildContext context) => Text(text, textAlign: align, style: display(size, color: color));
}

/// Texte secondaire.
class Muted extends StatelessWidget {
  const Muted(this.text, {super.key, this.size = 14, this.align});
  final String text;
  final double size;
  final TextAlign? align;
  @override
  Widget build(BuildContext context) => Text(text, textAlign: align, style: body(size, color: HappyColors.muted, height: 1.45));
}

/// Champ de saisie avec libellé au-dessus.
class Field extends StatelessWidget {
  const Field({
    super.key,
    this.label,
    required this.controller,
    this.hint,
    this.keyboardType,
    this.obscure = false,
    this.maxLines = 1,
    this.enabled = true,
    this.helper,
    this.capitalization = TextCapitalization.none,
    this.autofillHints,
  });
  final String? label;
  final TextEditingController controller;
  final String? hint;
  final TextInputType? keyboardType;
  final bool obscure;
  final int maxLines;
  final bool enabled;
  final String? helper;
  final TextCapitalization capitalization;
  final Iterable<String>? autofillHints;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (label != null) ...[
            Text(label!, style: body(13, color: const Color(0xBF1E1428), weight: FontWeight.w600)),
            const SizedBox(height: 6),
          ],
          TextField(
            controller: controller,
            keyboardType: keyboardType,
            obscureText: obscure,
            maxLines: obscure ? 1 : maxLines,
            enabled: enabled,
            textCapitalization: capitalization,
            autofillHints: autofillHints,
            style: body(15),
            decoration: InputDecoration(hintText: hint, fillColor: enabled ? Colors.white : HappyColors.paper),
          ),
          if (helper != null) ...[const SizedBox(height: 4), Text(helper!, style: body(12, color: HappyColors.muted))],
        ],
      ),
    );
  }
}

/// Libellé de section au-dessus d'un groupe de choix.
class FieldLabel extends StatelessWidget {
  const FieldLabel(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text, style: body(13, color: const Color(0xBF1E1428), weight: FontWeight.w600)),
      );
}

/// Carte blanche arrondie à ombre douce.
class HCard extends StatelessWidget {
  const HCard({super.key, required this.child, this.padding = const EdgeInsets.all(20), this.color = Colors.white, this.margin});
  final Widget child;
  final EdgeInsets padding;
  final Color color;
  final EdgeInsets? margin;
  @override
  Widget build(BuildContext context) => Container(
        margin: margin,
        padding: padding,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: HappyColors.line),
          boxShadow: softShadow,
        ),
        child: child,
      );
}

enum TagTone { lilac, mint, candy, gold, plum, muted }

/// Petite pastille d'information (statut, demande en cours…).
class Tag extends StatelessWidget {
  const Tag(this.label, {super.key, this.tone = TagTone.lilac, this.icon});
  final String label;
  final TagTone tone;
  final IconData? icon;
  @override
  Widget build(BuildContext context) {
    final (Color bg, Color fg) = switch (tone) {
      TagTone.lilac => (HappyColors.lilac, HappyColors.ink),
      TagTone.mint => (fade(HappyColors.mint, 0.15), HappyColors.mint),
      TagTone.candy => (fade(HappyColors.candy, 0.1), HappyColors.candy),
      TagTone.gold => (fade(HappyColors.mango, 0.2), HappyColors.gold),
      TagTone.plum => (fade(HappyColors.plum, 0.1), HappyColors.plum),
      TagTone.muted => (const Color(0x0D1E1428), HappyColors.muted),
    };
    // Text.rich (et non Row) : le libellé passe à la ligne au lieu de déborder.
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
      child: Text.rich(
        TextSpan(children: [
          if (icon != null)
            WidgetSpan(
              alignment: PlaceholderAlignment.middle,
              child: Padding(padding: const EdgeInsets.only(right: 4), child: Icon(icon, size: 12, color: fg)),
            ),
          TextSpan(text: label),
        ]),
        style: body(11, color: fg, weight: FontWeight.w700),
      ),
    );
  }
}

/// Sélecteur à onglets (« Mon anniversaire / Ma boutique », « Une durée / Du … au … »).
class Segmented<T> extends StatelessWidget {
  const Segmented({super.key, required this.value, required this.onChanged, required this.options});
  final T value;
  final ValueChanged<T> onChanged;
  final List<({T key, String label, IconData? icon})> options;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(color: fade(HappyColors.lilac, 0.8), borderRadius: BorderRadius.circular(18)),
      child: Row(
        children: [
          for (final o in options)
            Expanded(
              child: GestureDetector(
                onTap: () => onChanged(o.key),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  constraints: const BoxConstraints(minHeight: 44),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: o.key == value ? Colors.white : Colors.transparent,
                    borderRadius: BorderRadius.circular(13),
                    boxShadow: o.key == value ? softShadow : null,
                  ),
                  child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    if (o.icon != null) ...[Icon(o.icon, size: 16, color: o.key == value ? HappyColors.ink : HappyColors.muted), const SizedBox(width: 6)],
                    Flexible(
                      child: Text(o.label,
                          overflow: TextOverflow.ellipsis,
                          style: body(13, weight: FontWeight.w700, color: o.key == value ? HappyColors.ink : HappyColors.muted)),
                    ),
                  ]),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Pastilles de choix (durées, filtres, nombre de personnes).
class Pills<T> extends StatelessWidget {
  const Pills({super.key, required this.value, required this.onChanged, required this.options});
  final T? value;
  final ValueChanged<T> onChanged;
  final List<({T key, String label})> options;
  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final o in options)
          GestureDetector(
            onTap: () => onChanged(o.key),
            child: Container(
              constraints: const BoxConstraints(minHeight: 40),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: o.key == value ? HappyColors.ink : Colors.white,
                borderRadius: BorderRadius.circular(99),
                border: Border.all(color: o.key == value ? HappyColors.ink : const Color(0x261E1428)),
              ),
              child: Text(o.label, style: body(13, weight: FontWeight.w600, color: o.key == value ? Colors.white : HappyColors.ink)),
            ),
          ),
      ],
    );
  }
}

/// Interrupteur avec titre et explication (« J'organise une fête »).
class ToggleRow extends StatelessWidget {
  const ToggleRow({super.key, required this.value, required this.onChanged, required this.label, this.hint, this.icon, this.color = HappyColors.candy});
  final bool value;
  final ValueChanged<bool> onChanged;
  final String label;
  final String? hint;
  final IconData? icon;
  final Color color;
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: HappyColors.line)),
        child: Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                if (icon != null) ...[Icon(icon, size: 18, color: color), const SizedBox(width: 8)],
                Flexible(child: Text(label, style: body(14, weight: FontWeight.w700))),
              ]),
              if (hint != null) Padding(padding: const EdgeInsets.only(top: 2), child: Text(hint!, style: body(12, color: HappyColors.muted))),
            ]),
          ),
          Switch(value: value, onChanged: onChanged, activeTrackColor: color),
        ]),
      ),
    );
  }
}

/// Tuile statistique (grand chiffre en Cormorant).
class StatTile extends StatelessWidget {
  const StatTile({super.key, required this.value, required this.label, this.highlight = false, this.color = HappyColors.candy});
  final String value;
  final String label;
  final bool highlight;
  final Color color;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: highlight ? color : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: highlight ? null : Border.all(color: HappyColors.line),
        boxShadow: highlight ? null : softShadow,
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(value, style: display(40, color: highlight ? readableOnColor(color) : HappyColors.ink, height: 1)),
        const SizedBox(height: 6),
        Text(label, style: body(12, weight: FontWeight.w600, color: highlight ? fade(readableOnColor(color), 0.85) : HappyColors.muted)),
      ]),
    );
  }
}

/// Texte lisible sur une couleur Flutter (luminance).
Color readableOnColor(Color c) => c.computeLuminance() > 0.45 ? HappyColors.ink : Colors.white;

/// Ligne icône + texte (date, lieu, téléphone…).
class InfoRow extends StatelessWidget {
  const InfoRow(this.icon, this.text, {super.key, this.color = HappyColors.candy, this.onTap});
  final IconData icon;
  final String text;
  final Color color;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) {
    final row = Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(padding: const EdgeInsets.only(top: 1), child: Icon(icon, size: 17, color: color)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(text,
              style: body(14, color: const Color(0xCC1E1428)).copyWith(decoration: onTap != null ? TextDecoration.underline : null)),
        ),
      ]),
    );
    return onTap == null ? row : InkWell(onTap: onTap, child: row);
  }
}

/// Message quand une liste est vide.
class EmptyBox extends StatelessWidget {
  const EmptyBox(this.text, {super.key, this.icon});
  final String text;
  final IconData? icon;
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(24), border: Border.all(color: const Color(0x261E1428), width: 1.5)),
      child: Column(children: [
        if (icon != null) Icon(icon, size: 30, color: const Color(0x591E1428)),
        const SizedBox(height: 10),
        Muted(text, align: TextAlign.center),
      ]),
    );
  }
}

/// Indicateur de chargement centré.
class Loading extends StatelessWidget {
  const Loading({super.key});
  @override
  Widget build(BuildContext context) =>
      const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator(color: HappyColors.candy)));
}

/// Message d'erreur sous un formulaire.
class ErrorText extends StatelessWidget {
  const ErrorText(this.text, {super.key});
  final String? text;
  @override
  Widget build(BuildContext context) => text == null || text!.isEmpty
      ? const SizedBox.shrink()
      : Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(text!, style: body(14, color: HappyColors.candy, weight: FontWeight.w600)));
}

/// Message éphémère en bas de l'écran.
void toast(BuildContext context, String message, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      backgroundColor: error ? HappyColors.candy : HappyColors.ink,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(99)),
      content: Row(children: [
        Icon(error ? Icons.error_outline_rounded : Icons.check_circle_rounded, color: error ? Colors.white : HappyColors.mango, size: 18),
        const SizedBox(width: 8),
        Expanded(child: Text(message, style: body(14, color: Colors.white, weight: FontWeight.w600))),
      ]),
    ));
}

/// Feuille modale (bas de l'écran) : formulaires, confirmations, fiches.
/// Le contenu défile et remonte au-dessus du clavier.
Future<T?> showSheet<T>(BuildContext context, {String? title, required WidgetBuilder builder}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: HappyColors.paper,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
    builder: (ctx) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.92),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const SizedBox(height: 10),
          Container(width: 48, height: 5, decoration: BoxDecoration(color: const Color(0x261E1428), borderRadius: BorderRadius.circular(9))),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 8, 4),
            child: Row(children: [
              Expanded(child: Text(title ?? '', style: display(28))),
              IconButton(tooltip: 'Fermer', onPressed: () => Navigator.of(ctx).pop(), icon: const Icon(Icons.close_rounded)),
            ]),
          ),
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
              child: Builder(builder: builder),
            ),
          ),
        ]),
      ),
    ),
  );
}

/// Boîte de confirmation (« Supprimer ? », « Couper l'accès ? »).
Future<bool> confirm(BuildContext context, String title, String message, {String ok = 'Confirmer', bool danger = false}) async {
  final r = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: Colors.white,
      title: Text(title, style: display(26)),
      content: Text(message, style: body(14, color: HappyColors.muted)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('Annuler', style: body(14, weight: FontWeight.w600))),
        TextButton(
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(ok, style: body(14, weight: FontWeight.w700, color: danger ? HappyColors.candy : HappyColors.ink)),
        ),
      ],
    ),
  );
  return r ?? false;
}
