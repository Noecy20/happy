// Ajout / modification d'un cadeau de la liste (table `gifts`).
// - « Autre cadeau » : photo, nom, prix, détails, contact du vendeur, lien.
// - « Article d'une boutique » : bientôt disponible (partie e-commerce).
// Un cadeau déjà réservé n'est plus modifiable (le bouton n'est pas proposé).
import 'package:flutter/material.dart';

import '../../core/api.dart';
import '../../widgets/coming_soon.dart';
import '../../widgets/fields.dart';
import '../../widgets/ui.dart';

class GiftForm extends StatefulWidget {
  const GiftForm({super.key, required this.eventId, this.gift, required this.position, required this.onSaved});
  final String eventId;
  final Map<String, dynamic>? gift;
  final int position;
  final VoidCallback onSaved;
  @override
  State<GiftForm> createState() => _GiftFormState();
}

class _GiftFormState extends State<GiftForm> {
  String _source = 'libre';
  late final g = widget.gift;
  late String? _image = g?['image_url'] as String?;
  late final _name = TextEditingController(text: g?['name'] ?? '');
  late final _price = TextEditingController(text: g?['price'] == null ? '' : g!['price'].toString());
  late final _desc = TextEditingController(text: g?['description'] ?? '');
  late final _contact = TextEditingController(text: g?['external_contact'] ?? '');
  late final _link = TextEditingController(text: g?['product_link'] ?? '');
  bool _saving = false;
  String? _err;

  @override
  void dispose() {
    for (final c in [_name, _price, _desc, _contact, _link]) {
      c.dispose();
    }
    super.dispose();
  }

  String? _opt(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) return setState(() => _err = 'Donnez un nom au cadeau.');
    final price = num.tryParse(_price.text.replaceAll(RegExp(r'\D'), ''));
    final payload = <String, dynamic>{
      'name': _name.text.trim(),
      'description': _opt(_desc),
      'price': price,
      'vendor_id': null,
      'product_id': null,
      'options': <String, dynamic>{},
      'external_contact': _opt(_contact),
      'product_link': _opt(_link),
      'image_url': _image,
    };
    setState(() {
      _saving = true;
      _err = null;
    });
    try {
      if (g != null) {
        await api.update('gifts', payload, [Filter('id', 'eq', g!['id'])]);
      } else {
        await api.insert('gifts', {...payload, 'event_id': widget.eventId, 'position': widget.position});
      }
      widget.onSaved();
    } on ApiException catch (e) {
      if (mounted) setState(() => _err = e.message);
    }
    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Segmented<String>(
        value: _source,
        onChanged: (v) => setState(() => _source = v),
        options: const [
          (key: 'boutique', label: 'Article d’une boutique', icon: Icons.storefront_rounded),
          (key: 'libre', label: 'Autre cadeau', icon: Icons.card_giftcard_rounded),
        ],
      ),
      if (_source == 'boutique')
        const ComingSoon(
          compact: true,
          title: 'Articles des boutiques',
          text: 'Bientôt, vous pourrez choisir un article (taille, couleur…) directement dans le catalogue des boutiques Happy. '
              'En attendant, ajoutez « Autre cadeau » avec le contact du vendeur.',
        )
      else ...[
        ImageField(value: _image, onChanged: (u) => setState(() => _image = u), prefix: 'cadeau'),
        Field(label: 'Nom du cadeau', controller: _name, capitalization: TextCapitalization.sentences),
        Field(label: 'Prix (FCFA)', controller: _price, keyboardType: TextInputType.number),
        Field(label: 'Détails', controller: _desc, maxLines: 3),
        Field(label: 'Où l’acheter (contact du vendeur)', controller: _contact, hint: 'Nom, téléphone, adresse'),
        Field(label: 'Lien du produit (facultatif)', controller: _link, hint: 'https://…', keyboardType: TextInputType.url),
        ErrorText(_err),
        PillButton(label: g != null ? 'Enregistrer' : 'Ajouter à ma liste', variant: BtnVariant.candy, loading: _saving, onPressed: _save),
      ],
    ]);
  }
}
