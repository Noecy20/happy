// Test minimal : la fonction de formatage des prix respecte le format FCFA.
import 'package:flutter_test/flutter_test.dart';
import 'package:happy/core/utils.dart';

void main() {
  test('formatPrice', () {
    expect(formatPrice(45000).replaceAll(' ', ' '), '45 000 FCFA');
  });
}
