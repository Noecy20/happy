// Champs spéciaux : date (calendrier natif en français) et photo (galerie → serveur).
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../core/api.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import 'ui.dart';

/// Champ date : affiche « samedi 20 décembre 2026 », ouvre le calendrier natif.
class DateField extends StatelessWidget {
  const DateField({super.key, this.label, required this.value, required this.onChanged, this.first, this.last,
      this.placeholder = 'Choisir une date', this.enabled = true, this.clearable = false});
  final String? label;
  final String value; // "AAAA-MM-JJ" ou ""
  final ValueChanged<String> onChanged;
  final DateTime? first, last;
  final String placeholder;
  final bool enabled;
  final bool clearable;

  Future<void> _pick(BuildContext context) async {
    final firstDate = first ?? DateTime(1920);
    final lastDate = last ?? DateTime(DateTime.now().year + 5);
    var initial = value.isNotEmpty ? parseDay(value) : (first ?? DateTime.now());
    if (initial.isBefore(firstDate)) initial = firstDate;
    if (initial.isAfter(lastDate)) initial = lastDate;
    final d = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: firstDate,
      lastDate: lastDate,
      locale: const Locale('fr', 'FR'),
      helpText: label ?? placeholder,
    );
    if (d != null) onChanged(toIso(d));
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (label != null) FieldLabel(label!),
        InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: enabled ? () => _pick(context) : null,
          child: Container(
            constraints: const BoxConstraints(minHeight: 50),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: enabled ? Colors.white : HappyColors.paper,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0x1A1E1428)),
            ),
            child: Row(children: [
              const Icon(Icons.calendar_month_rounded, size: 18, color: HappyColors.candy),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  value.isNotEmpty ? formatLongDate(value) : placeholder,
                  style: body(15, color: value.isNotEmpty ? (enabled ? HappyColors.ink : HappyColors.muted) : const Color(0x591E1428)),
                ),
              ),
              if (clearable && value.isNotEmpty && enabled)
                IconButton(tooltip: 'Effacer la date', onPressed: () => onChanged(''), icon: const Icon(Icons.close_rounded, size: 18)),
            ]),
          ),
        ),
      ]),
    );
  }
}

/// Choisit une image dans la galerie et l'envoie au serveur. Renvoie l'URL relative, ou null si annulé.
Future<String?> pickAndUpload({String prefix = 'photo'}) async {
  final x = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 70, maxWidth: 1600);
  if (x == null) return null;
  final bytes = await x.readAsBytes();
  if (bytes.length > 5 * 1024 * 1024) throw ApiException('Image trop lourde : 5 Mo maximum.');
  return api.upload(bytes, x.name, prefix: prefix);
}

/// Zone « Ajouter une photo » avec aperçu.
class ImageField extends StatefulWidget {
  const ImageField({super.key, required this.value, required this.onChanged, this.label = 'Ajouter une photo', this.prefix = 'photo'});
  final String? value;
  final ValueChanged<String> onChanged;
  final String label;
  final String prefix;
  @override
  State<ImageField> createState() => _ImageFieldState();
}

class _ImageFieldState extends State<ImageField> {
  bool _busy = false;
  @override
  Widget build(BuildContext context) {
    final url = imageUrl(widget.value);
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: GestureDetector(
        onTap: _busy
            ? null
            : () async {
                setState(() => _busy = true);
                try {
                  final u = await pickAndUpload(prefix: widget.prefix);
                  if (u != null) widget.onChanged(u);
                } catch (e) {
                  if (context.mounted) toast(context, e.toString(), error: true);
                }
                if (mounted) setState(() => _busy = false);
              },
        child: AspectRatio(
          aspectRatio: 16 / 9,
          child: Container(
            decoration: BoxDecoration(
              color: HappyColors.paper,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0x261E1428), width: 1.5),
            ),
            clipBehavior: Clip.antiAlias,
            child: _busy
                ? const Center(child: CircularProgressIndicator(color: HappyColors.candy))
                : url != null
                    ? Image.network(url, fit: BoxFit.cover)
                    : Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        const Icon(Icons.add_photo_alternate_rounded, color: HappyColors.muted, size: 28),
                        const SizedBox(height: 6),
                        Text(widget.label, style: body(13, color: HappyColors.muted, weight: FontWeight.w600)),
                      ]),
          ),
        ),
      ),
    );
  }
}
