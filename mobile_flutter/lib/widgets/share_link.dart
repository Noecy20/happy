// Bloc de partage d'un lien : copier, WhatsApp, partage natif, aperçu (ouvre la page dans l'app).
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/theme.dart';
import 'ui.dart';

class ShareLink extends StatelessWidget {
  const ShareLink({super.key, required this.label, required this.url, required this.text, required this.onPreview});
  final String label;
  final String url;
  final String text;
  final VoidCallback onPreview;

  @override
  Widget build(BuildContext context) {
    Widget action(IconData icon, String tip, Color bg, Color fg, VoidCallback onTap) => Expanded(
          child: Tooltip(
            message: tip,
            child: Material(
              color: bg,
              shape: StadiumBorder(side: BorderSide(color: bg == Colors.white ? const Color(0x1A1E1428) : bg)),
              child: InkWell(
                customBorder: const StadiumBorder(),
                onTap: onTap,
                child: SizedBox(height: 44, child: Icon(icon, size: 18, color: fg)),
              ),
            ),
          ),
        );

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: body(12, color: HappyColors.muted, weight: FontWeight.w700)),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: HappyColors.paper, borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0x1A1E1428))),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(6, 2, 6, 8),
              child: Text(url, maxLines: 1, overflow: TextOverflow.ellipsis, style: body(13)),
            ),
            Row(children: [
              action(Icons.content_copy_rounded, 'Copier', HappyColors.ink, Colors.white, () async {
                await Clipboard.setData(ClipboardData(text: url));
                if (context.mounted) toast(context, 'Lien copié');
              }),
              const SizedBox(width: 8),
              action(Icons.chat_rounded, 'WhatsApp', const Color(0xFF25D366), Colors.white,
                  () => launchUrl(Uri.parse('https://wa.me/?text=${Uri.encodeComponent('$text $url')}'), mode: LaunchMode.externalApplication)),
              const SizedBox(width: 8),
              action(Icons.share_rounded, 'Partager', Colors.white, HappyColors.ink, () => Share.share('$text $url')),
              const SizedBox(width: 8),
              action(Icons.visibility_rounded, 'Aperçu', Colors.white, HappyColors.ink, onPreview),
            ]),
          ]),
        ),
      ]),
    );
  }
}
