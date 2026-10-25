// Choix de la couleur de thème : palette prédéfinie + couleur libre (code hexadécimal).
// La couleur choisie est toujours visiblement sélectionnée (anneau + coche), y compris la couleur libre.
import 'package:flutter/material.dart';

import '../core/theme.dart';
import '../core/utils.dart';

class ColorPicker extends StatefulWidget {
  const ColorPicker({super.key, required this.value, required this.onChanged});
  final String value; // "" = aucune couleur
  final ValueChanged<String> onChanged;
  @override
  State<ColorPicker> createState() => _ColorPickerState();
}

class _ColorPickerState extends State<ColorPicker> {
  late final TextEditingController _hex = TextEditingController(text: _isCustom ? widget.value : '#');
  late bool _showHex = _isCustom;

  bool get _isCustom =>
      widget.value.isNotEmpty && !themeColors.any((c) => c.hex.toLowerCase() == widget.value.toLowerCase());

  @override
  void dispose() {
    _hex.dispose();
    super.dispose();
  }

  Widget _dot({required Color color, required bool selected, required VoidCallback onTap, required String label, Widget? child, bool dashed = false}) {
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(color: selected ? HappyColors.ink : (dashed ? const Color(0x661E1428) : const Color(0x1A1E1428)), width: selected ? 3 : 1.5),
          ),
          child: child,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final custom = _isCustom;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Wrap(spacing: 10, runSpacing: 10, children: [
        for (final c in themeColors)
          _dot(
            color: hexColor(c.hex),
            label: c.name,
            selected: widget.value.toLowerCase() == c.hex.toLowerCase(),
            onTap: () => widget.onChanged(widget.value.toLowerCase() == c.hex.toLowerCase() ? '' : c.hex),
            child: widget.value.toLowerCase() == c.hex.toLowerCase() ? Icon(Icons.check_rounded, size: 18, color: readableOn(c.hex)) : null,
          ),
        // couleur libre
        _dot(
          color: custom ? hexColor(widget.value) : Colors.white,
          label: 'Autre couleur',
          selected: custom,
          dashed: true,
          onTap: () => setState(() => _showHex = !_showHex),
          child: Icon(custom ? Icons.check_rounded : Icons.add_rounded, size: 18, color: custom ? readableOn(widget.value) : HappyColors.ink),
        ),
      ]),
      if (_showHex)
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Row(children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: isHex(_hex.text) ? hexColor(_hex.text) : Colors.white,
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0x1A1E1428)),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: _hex,
                maxLength: 7,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(hintText: '#A1B2C3', counterText: ''),
                onChanged: (t) {
                  final v = '#${t.replaceAll(RegExp(r'[^0-9a-fA-F]'), '')}';
                  final clean = v.length > 7 ? v.substring(0, 7) : v;
                  if (clean != t) {
                    _hex.value = TextEditingValue(text: clean, selection: TextSelection.collapsed(offset: clean.length));
                  }
                  setState(() {});
                  if (isHex(clean)) widget.onChanged(clean.toUpperCase());
                },
              ),
            ),
          ]),
        ),
    ]);
  }
}
