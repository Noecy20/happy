// Demande d'accès ou de prolongation, avec paiement mobile money.
// - Période : par durée (7, 15, 30, 60, 90 jours) ou par dates « du … au … ».
// - Prix = max(prix minimum, jours × prix par jour), lus dans `settings` (réglés par l'admin).
// - Paiement sur le numéro affiché, puis référence de la transaction + capture facultative.
// - Insertion dans `access_requests` ; un déclencheur SQL prévient les administrateurs.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/api.dart';
import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../widgets/fields.dart';
import '../../widgets/ui.dart';

/// Ouvre la feuille de demande. Renvoie true si la demande a été envoyée.
Future<bool?> showAccessRequest(BuildContext context, {required String kind, required String userId}) =>
    showSheet<bool>(context,
        title: kind == 'prolongation' ? 'Demander une prolongation' : 'Demander l’accès',
        builder: (_) => AccessRequestForm(kind: kind, userId: userId));

class AccessRequestForm extends StatefulWidget {
  const AccessRequestForm({super.key, required this.kind, required this.userId});
  final String kind;
  final String userId;
  @override
  State<AccessRequestForm> createState() => _AccessRequestFormState();
}

class _AccessRequestFormState extends State<AccessRequestForm> {
  String _mode = 'duree';
  int _days = 30;
  String _start = todayIso();
  String _end = '';
  Map<String, dynamic>? _cfg;
  String _method = '';
  final _ref = TextEditingController();
  final _message = TextEditingController();
  String? _proof;
  bool _uploading = false;
  bool _sending = false;
  String? _err;

  @override
  void initState() {
    super.initState();
    api.selectOne('settings', filters: [const Filter('id', 'eq', 1)]).then((c) {
      if (mounted) setState(() => _cfg = c);
    });
  }

  @override
  void dispose() {
    _ref.dispose();
    _message.dispose();
    super.dispose();
  }

  /// Nombre de jours de la période choisie.
  int get _span {
    if (_mode == 'duree') return _days;
    if (_end.isEmpty) return 0;
    return parseDay(_end).difference(parseDay(_start)).inDays + 1;
  }

  String get _endDate => _mode == 'duree' ? toIso(DateTime.now().add(Duration(days: _days - 1))) : _end;

  num get _price {
    if (_cfg == null) return 0;
    final min = toNum(_cfg!['access_min_price']) ?? 0;
    final perDay = toNum(_cfg!['access_price_per_day']) ?? 0;
    final p = _span * perDay;
    return p > min ? p : min;
  }

  Future<void> _send() async {
    setState(() => _err = null);
    if (_span < 1) return setState(() => _err = 'Choisissez une période valide.');
    if (_method.isEmpty || _ref.text.trim().isEmpty) {
      return setState(() => _err = 'Indiquez le moyen de paiement et la référence de la transaction.');
    }
    setState(() => _sending = true);
    try {
      await api.insert('access_requests', {
        'user_id': widget.userId,
        'kind': widget.kind,
        'days_requested': _span > 365 ? 365 : _span,
        'start_date': _mode == 'dates' ? _start : todayIso(),
        'end_date': _endDate,
        'amount': _price,
        'payment_method': _method,
        'payment_ref': _ref.text.trim(),
        'proof_url': _proof,
        'message': _message.text.trim().isEmpty ? null : _message.text.trim(),
      });
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (mounted) setState(() {
        _sending = false;
        _err = e.message;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final methods = paymentMethods(_cfg);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Segmented<String>(
        value: _mode,
        onChanged: (v) => setState(() => _mode = v),
        options: const [
          (key: 'duree', label: 'Une durée', icon: Icons.hourglass_empty_rounded),
          (key: 'dates', label: 'Du … au …', icon: Icons.date_range_rounded),
        ],
      ),
      if (_mode == 'duree')
        Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Pills<int>(value: _days, onChanged: (d) => setState(() => _days = d), options: [for (final d in [7, 15, 30, 60, 90]) (key: d, label: '$d jours')]),
        )
      else ...[
        DateField(label: 'Du', value: _start, first: DateTime.now(), onChanged: (v) => setState(() => _start = v)),
        DateField(label: 'Au', value: _end, first: parseDay(_start), onChanged: (v) => setState(() => _end = v)),
      ],

      // Récapitulatif du prix
      Container(
        margin: const EdgeInsets.only(bottom: 18),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: HappyColors.ink, borderRadius: BorderRadius.circular(18)),
        child: Row(children: [
          Expanded(
            child: Text(
              _span > 0 ? '$_span jour${_span > 1 ? 's' : ''} · jusqu’au ${formatDate(_endDate)}' : 'Choisissez une période',
              style: body(13, color: const Color(0xB3FFFFFF)),
            ),
          ),
          Text(formatPrice(_price), style: display(26, color: Colors.white)),
        ]),
      ),

      const FieldLabel('Payer par'),
      if (methods.isEmpty)
        Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: fade(HappyColors.lilac, 0.6), borderRadius: BorderRadius.circular(16)),
          child: Text('Les numéros de paiement ne sont pas encore configurés. Contactez l’administrateur.', style: body(14)),
        ),
      for (final m in methods)
        GestureDetector(
          onTap: () => setState(() => _method = m.name),
          onLongPress: () async {
            await Clipboard.setData(ClipboardData(text: m.number));
            if (context.mounted) toast(context, 'Numéro copié');
          },
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: _method == m.name ? fade(HappyColors.candy, 0.05) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: _method == m.name ? HappyColors.candy : const Color(0x1A1E1428), width: _method == m.name ? 1.5 : 1),
            ),
            child: Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(m.name, style: body(14, weight: FontWeight.w700)),
                  Text(m.number, style: body(14, color: HappyColors.muted)),
                ]),
              ),
              if (_method == m.name) const Icon(Icons.check_rounded, color: HappyColors.candy),
            ]),
          ),
        ),
      if (methods.isNotEmpty) const Padding(padding: EdgeInsets.only(bottom: 12), child: Muted('Appui long sur un numéro pour le copier.', size: 11)),
      if ((_cfg?['payment_instructions'] ?? '').toString().isNotEmpty)
        Padding(padding: const EdgeInsets.only(bottom: 12), child: Muted(_cfg!['payment_instructions'].toString(), size: 12)),
      Field(label: 'Référence de la transaction', controller: _ref, hint: 'Ex. ID Wave', capitalization: TextCapitalization.characters),
      PillButton(
        label: _proof != null ? 'Capture ajoutée' : 'Joindre une capture (facultatif)',
        icon: _proof != null ? Icons.check_rounded : Icons.upload_rounded,
        variant: BtnVariant.ghost,
        small: true,
        loading: _uploading,
        onPressed: () async {
          setState(() => _uploading = true);
          try {
            final u = await pickAndUpload(prefix: 'paiement');
            if (u != null) _proof = u;
          } catch (e) {
            if (context.mounted) toast(context, e.toString(), error: true);
          }
          if (mounted) setState(() => _uploading = false);
        },
      ),
      const SizedBox(height: 16),
      Field(controller: _message, hint: 'Un mot pour l’administrateur (facultatif)', maxLines: 2),
      ErrorText(_err),
      PillButton(label: 'J’ai payé, envoyer la demande', variant: BtnVariant.candy, loading: _sending, onPressed: _send),
      const SizedBox(height: 8),
      const Muted('L’accès est activé dès que l’administrateur a vérifié votre paiement.', size: 12, align: TextAlign.center),
    ]);
  }
}
