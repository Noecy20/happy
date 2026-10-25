// Client de l'API Happy (remplace supabase-js).
// - auth : inscription / connexion, le jeton est gardé sur le téléphone (shared_preferences)
// - db   : lecture / écriture des tables (le serveur applique les règles RLS de PostgreSQL)
// - rpc  : appel des fonctions SQL (get_public_event, claim_gift, rsvp, admin_grant_access…)
// - upload : envoi d'une image, renvoie son URL
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'config.dart';

/// Erreur renvoyée par le serveur (message en français, souvent venant d'une fonction SQL).
class ApiException implements Exception {
  ApiException(this.message, [this.status = 400]);
  final String message;
  final int status;
  @override
  String toString() => message;
}

/// Filtre de requête : Filter('owner_id', 'eq', id)
class Filter {
  const Filter(this.column, this.op, this.value);
  final String column;
  final String op; // eq, neq, gt, gte, lt, lte, in, is
  final dynamic value;
  List<dynamic> toJson() => [column, op, value];
}

class Api {
  Api._();
  static final Api instance = Api._();

  static const _tokenKey = 'happy-token';
  String? token;

  /// Relit le jeton enregistré au lancement de l'app.
  Future<void> init() async {
    final p = await SharedPreferences.getInstance();
    token = p.getString(_tokenKey);
  }

  Future<void> _saveToken(String? t) async {
    token = t;
    final p = await SharedPreferences.getInstance();
    if (t == null) {
      await p.remove(_tokenKey);
    } else {
      await p.setString(_tokenKey, t);
    }
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  /// Envoie une requête et décode la réponse JSON. Lève ApiException en cas d'erreur.
  Future<dynamic> _send(String method, String path, [Object? body]) async {
    final uri = Uri.parse('$apiUrl$path');
    http.Response r;
    try {
      final b = body == null ? null : jsonEncode(body);
      switch (method) {
        case 'GET':
          r = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 20));
          break;
        case 'DELETE':
          r = await http.delete(uri, headers: _headers).timeout(const Duration(seconds: 20));
          break;
        default:
          r = await http.post(uri, headers: _headers, body: b).timeout(const Duration(seconds: 20));
      }
    } catch (_) {
      throw ApiException('Connexion au serveur impossible ($apiUrl). Vérifiez que le serveur Happy est lancé.', 0);
    }
    dynamic data;
    try {
      data = r.body.isEmpty ? null : jsonDecode(utf8.decode(r.bodyBytes));
    } catch (_) {
      throw ApiException('Réponse inattendue du serveur (${r.statusCode}).', r.statusCode);
    }
    if (r.statusCode >= 400) {
      final msg = data is Map && data['error'] != null ? data['error'].toString() : 'Erreur serveur (${r.statusCode}).';
      if (r.statusCode == 401 && token != null) await _saveToken(null); // session expirée ou compte supprimé
      throw ApiException(msg, r.statusCode);
    }
    return data;
  }

  /* ---------------- Comptes ---------------- */

  Future<void> signUp(String email, String password, Map<String, dynamic> data) async {
    final r = await _send('POST', '/api/auth/signup', {'email': email, 'password': password, 'data': data});
    await _saveToken(r['token'] as String);
  }

  Future<void> signIn(String email, String password) async {
    final r = await _send('POST', '/api/auth/login', {'email': email, 'password': password});
    await _saveToken(r['token'] as String);
  }

  Future<void> signOut() => _saveToken(null);

  /// Profil de l'utilisateur connecté (ou null).
  Future<Map<String, dynamic>?> me() async {
    if (token == null) return null;
    final r = await _send('GET', '/api/auth/me');
    return r == null ? null : Map<String, dynamic>.from(r as Map);
  }

  /* ---------------- Données ---------------- */

  Future<List<Map<String, dynamic>>> select(String table,
      {String select = '*', List<Filter> filters = const [], String? orderBy, bool desc = false, int? limit}) async {
    final r = await _send('POST', '/api/db', {
      'table': table, 'action': 'select', 'select': select,
      'filters': filters.map((f) => f.toJson()).toList(),
      if (orderBy != null) 'order': [orderBy, desc ? 'desc' : 'asc'],
      if (limit != null) 'limit': limit,
    });
    return (r as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<Map<String, dynamic>?> selectOne(String table, {List<Filter> filters = const []}) async {
    final rows = await select(table, filters: filters, limit: 1);
    return rows.isEmpty ? null : rows.first;
  }

  /// Insère une ligne et la renvoie. `returning: false` quand on n'a pas le droit de la relire (message de contact).
  Future<Map<String, dynamic>?> insert(String table, Map<String, dynamic> values, {bool returning = true}) async {
    final r = await _send('POST', '/api/db', {'table': table, 'action': 'insert', 'values': values, 'single': true, 'returning': returning});
    return r is Map ? Map<String, dynamic>.from(r) : null;
  }

  Future<Map<String, dynamic>?> update(String table, Map<String, dynamic> values, List<Filter> filters) async {
    final r = await _send('POST', '/api/db', {
      'table': table, 'action': 'update', 'values': values,
      'filters': filters.map((f) => f.toJson()).toList(), 'single': true,
    });
    return r == null ? null : Map<String, dynamic>.from(r as Map);
  }

  Future<void> delete(String table, List<Filter> filters) =>
      _send('POST', '/api/db', {'table': table, 'action': 'delete', 'filters': filters.map((f) => f.toJson()).toList()});

  /// Appel d'une fonction SQL : rpc('claim_gift', {'p_token': …}).
  Future<dynamic> rpc(String fn, [Map<String, dynamic> args = const {}]) => _send('POST', '/api/rpc/$fn', args);

  /* ---------------- Admin ---------------- */

  Future<void> adminDeleteUser(String id) => _send('DELETE', '/api/admin/users/$id');

  /* ---------------- Images ---------------- */

  /// Envoie une image (octets) et renvoie son URL relative « /uploads/<uid>/… ».
  Future<String> upload(List<int> bytes, String filename, {String prefix = 'photo'}) async {
    final req = http.MultipartRequest('POST', Uri.parse('$apiUrl/api/upload?prefix=$prefix'));
    if (token != null) req.headers['Authorization'] = 'Bearer $token';
    req.files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));
    final res = await http.Response.fromStream(await req.send());
    final data = jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode >= 400) throw ApiException((data['error'] ?? 'Envoi impossible.').toString());
    return data['url'] as String;
  }
}

/// URL complète d'une image : les images envoyées sont stockées en chemin relatif.
String? imageUrl(String? u) => u == null || u.isEmpty ? null : (u.startsWith('http') ? u : '$apiUrl$u');

/// Raccourci global.
final api = Api.instance;
