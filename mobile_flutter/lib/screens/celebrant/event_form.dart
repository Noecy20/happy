// Création / personnalisation de l'anniversaire (table `events`).
// - Prénom et date de naissance COMPLÈTE (passée). Aperçu immédiat du prochain anniversaire et de l'âge
//   (nextBirthday) ; la valeur définitive est calculée en SQL (next_birthday, déclencheur prepare_event).
// - Après publication, prénom et date sont verrouillés (le déclencheur SQL les ignore de toute façon).
// - Couleur de thème + dress code pré-rempli « Tout en <couleur> », modifiable.
// - Fête facultative : date, heure, lieu, infos pratiques.
import 'package:flutter/material.dart';

import '../../core/api.dart';
import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../widgets/color_picker.dart';
import '../../widgets/fields.dart';
import '../../widgets/ui.dart';

class EventForm extends StatefulWidget {
  const EventForm({super.key, required this.userId, this.event, this.defaultName, required this.onSaved});
  final String userId;
  final Map<String, dynamic>? event;
  final String? defaultName;
  final ValueChanged<Map<String, dynamic>> onSaved;
  @override
  State<EventForm> createState() => _EventFormState();
}

class _EventFormState extends State<EventForm> {
  late final Map<String, dynamic>? e = widget.event;
  late final bool locked = e?['published'] == true;
  late final _name = TextEditingController(text: e?['celebrant_name'] ?? widget.defaultName ?? '');
  late String _birth = (e?['birth_date'] ?? '').toString();
  late final _title = TextEditingController(text: e?['title'] ?? '');
  late final _message = TextEditingController(text: e?['message'] ?? '');
  late String _color = (e?['theme_color'] ?? '').toString();
  late final _dress = TextEditingController(text: e?['dress_code'] ?? '');
  late bool _party = e?['has_party'] == true;
  late String _partyDate = (e?['party_date'] ?? '').toString();
  late final _time = TextEditingController(text: e?['party_time'] ?? '');
  late final _place = TextEditingController(text: e?['party_place'] ?? '');
  late final _details = TextEditingController(text: e?['party_details'] ?? '');
  bool _saving = false;
  String? _err;

  @override
  void dispose() {
    for (final c in [_name, _title, _message, _dress, _time, _place, _details]) {
      c.dispose();
    }
    super.dispose();
  }

  /// Le dress code suit la couleur tant qu'il est généré automatiquement.
  void _pickColor(String hex) {
    final auto = _dress.text.isEmpty || _dress.text.startsWith('Tout en ');
    setState(() {
      _color = hex;
      if (auto) _dress.text = hex.isEmpty ? '' : 'Tout en ${colorName(hex)}';
    });
  }

  String? _opt(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();

  Future<void> _save() async {
    setState(() => _err = null);
    if (_name.text.trim().isEmpty) return setState(() => _err = 'Indiquez le prénom de la personne fêtée.');
    if (_birth.isEmpty) return setState(() => _err = 'Indiquez la date de naissance complète.');
    if (_birth.compareTo(todayIso()) > 0) return setState(() => _err = 'La date de naissance ne peut pas être dans le futur.');
    final nb = nextBirthday(_birth);
    final payload = <String, dynamic>{
      'celebrant_name': _name.text.trim(),
      'birth_date': _birth,
      'title': _opt(_title),
      'message': _opt(_message),
      'theme_color': _color.isEmpty ? null : _color,
      'dress_code': _opt(_dress),
      'has_party': _party,
      'party_date': _party ? (_partyDate.isNotEmpty ? _partyDate : nb.date) : null,
      'party_time': _party ? _opt(_time) : null,
      'party_place': _party ? _opt(_place) : null,
      'party_details': _party ? _opt(_details) : null,
    };
    if (locked) {
      payload.remove('celebrant_name');
      payload.remove('birth_date');
    }
    setState(() => _saving = true);
    try {
      final saved = e != null
          ? await api.update('events', payload, [Filter('id', 'eq', e!['id'])])
          : await api.insert('events', {...payload, 'owner_id': widget.userId});
      if (saved != null) widget.onSaved(saved);
    } on ApiException catch (x) {
      setState(() => _err = x.message);
    }
    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    final nb = _birth.isNotEmpty ? nextBirthday(_birth) : null;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Field(label: 'Prénom de la personne fêtée${locked ? ' (verrouillé)' : ''}', controller: _name, enabled: !locked, capitalization: TextCapitalization.words),
      DateField(
        label: 'Date de naissance${locked ? ' (verrouillée)' : ''}',
        value: _birth,
        enabled: !locked,
        first: DateTime(1920),
        last: DateTime.now(),
        placeholder: 'Jour, mois et année',
        onChanged: (v) => setState(() => _birth = v),
      ),
      if (nb != null)
        Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(color: fade(HappyColors.lilac, 0.7), borderRadius: BorderRadius.circular(16)),
          child: Text.rich(TextSpan(style: body(14), children: [
            const TextSpan(text: 'Prochain anniversaire : '),
            TextSpan(text: formatLongDate(nb.date), style: body(14, weight: FontWeight.w700)),
            const TextSpan(text: ' · '),
            TextSpan(text: '${nb.age} ans', style: body(14, weight: FontWeight.w700)),
          ])),
        ),
      Field(label: 'Titre de la page (facultatif)', controller: _title, hint: nb != null ? 'Les ${nb.age} ans de ${_name.text}' : 'Mon anniversaire'),
      Field(label: 'Un mot pour vos proches', controller: _message, maxLines: 3, hint: 'Merci d’avance, j’ai hâte de vous voir !'),
      const FieldLabel('Couleur et dress code (facultatif)'),
      const Muted('La couleur habille votre espace et la page que verront vos proches.', size: 12),
      const SizedBox(height: 10),
      ColorPicker(value: _color, onChanged: _pickColor),
      const SizedBox(height: 12),
      Field(controller: _dress, hint: 'Ex. : Chic en blanc et or, tenue traditionnelle…'),
      ToggleRow(
        value: _party,
        onChanged: (v) => setState(() => _party = v),
        icon: Icons.celebration_rounded,
        label: 'J’organise une fête',
        hint: 'Vos proches recevront une carte d’invitation avec le lien.',
      ),
      if (_party)
        Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(24), border: Border.all(color: HappyColors.line)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            DateField(
              label: 'Date de la fête',
              value: _partyDate.isNotEmpty ? _partyDate : (nb?.date ?? ''),
              first: DateTime.now(),
              onChanged: (v) => setState(() => _partyDate = v),
            ),
            Field(label: 'Heure', controller: _time, hint: 'À partir de 19h'),
            Field(label: 'Lieu', controller: _place, hint: 'Maquis Le Baobab, Cocody Angré'),
            Field(label: 'Infos pratiques', controller: _details, maxLines: 3, hint: 'Parking, code d’entrée, confirmez par WhatsApp…'),
          ]),
        ),
      ErrorText(_err),
      PillButton(label: e != null ? 'Enregistrer' : 'Créer l’anniversaire', variant: BtnVariant.candy, loading: _saving, onPressed: _save),
    ]);
  }
}
