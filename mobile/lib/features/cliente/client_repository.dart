import 'dart:typed_data';
import 'package:dio/dio.dart' as dio;
import 'package:image_picker/image_picker.dart';
import '../../core/api/api_client.dart';
import '../../core/models/notification_models.dart';

export '../../core/models/notification_models.dart';

class ClientAppointment {
  final String id;
  final String date;
  final String startTime;
  final String status;
  final double totalPrice;
  final String serviceName;
  final String staffName;
  final String barbershopName;
  final bool hasReview;
  final bool hasTip;
  final String? resultPhoto;
  final String? referencePhoto;

  ClientAppointment({
    required this.id,
    required this.date,
    required this.startTime,
    required this.status,
    required this.totalPrice,
    required this.serviceName,
    required this.staffName,
    required this.barbershopName,
    required this.hasReview,
    required this.hasTip,
    this.resultPhoto,
    this.referencePhoto,
  });

  factory ClientAppointment.fromJson(Map<String, dynamic> json) => ClientAppointment(
        id: json['id'],
        date: json['date'],
        startTime: json['startTime'],
        status: json['status'],
        totalPrice: (json['totalPrice'] as num).toDouble(),
        serviceName: json['service']['name'],
        staffName: json['staff']['name'],
        barbershopName: json['barbershop']['name'],
        hasReview: json['hasReview'] == true,
        hasTip: json['hasTip'] == true,
        resultPhoto: json['resultPhoto'] as String?,
        referencePhoto: json['referencePhoto'] as String?,
      );
}

class QueueInfo {
  final String status;
  final bool isToday;
  final bool active;
  final int position; // 0 = em atendimento agora
  final int ahead;
  final int etaMinutes;

  QueueInfo({required this.status, required this.isToday, required this.active, required this.position, required this.ahead, required this.etaMinutes});

  factory QueueInfo.fromJson(Map<String, dynamic> j) => QueueInfo(
        status: j['status'] as String? ?? '',
        isToday: j['isToday'] == true,
        active: j['active'] == true,
        position: j['position'] as int? ?? 0,
        ahead: j['ahead'] as int? ?? 0,
        etaMinutes: j['etaMinutes'] as int? ?? 0,
      );
}

class TipInfo {
  final String shopName;
  final String barberName;
  final String? pixKey;
  final bool hasTip;
  final double? amount;

  TipInfo({required this.shopName, required this.barberName, this.pixKey, required this.hasTip, this.amount});

  factory TipInfo.fromJson(Map<String, dynamic> j) => TipInfo(
        shopName: j['shopName'] as String? ?? '',
        barberName: j['barberName'] as String? ?? '',
        pixKey: j['pixKey'] as String?,
        hasTip: j['hasTip'] == true,
        amount: (j['amount'] as num?)?.toDouble(),
      );
}

class LoyaltyBalance {
  final String barbershopName;
  final int points;
  final String tier;

  LoyaltyBalance({required this.barbershopName, required this.points, required this.tier});

  factory LoyaltyBalance.fromJson(Map<String, dynamic> json) => LoyaltyBalance(
        barbershopName: json['barbershopName'],
        points: json['points'],
        tier: json['tier'],
      );
}

class CutPhoto {
  final String id;
  final String imageUrl;
  final String? note;
  final String createdAt;
  CutPhoto({required this.id, required this.imageUrl, this.note, required this.createdAt});
  factory CutPhoto.fromJson(Map<String, dynamic> j) => CutPhoto(
        id: j['id'] as String,
        imageUrl: j['imageUrl'] as String,
        note: j['note'] as String?,
        createdAt: j['createdAt'] as String,
      );
}

class ClientPreferences {
  final String? machine;
  final String? products;
  final String? allergies;
  final String? drink;
  final String? chat;
  final String? notes;
  ClientPreferences({this.machine, this.products, this.allergies, this.drink, this.chat, this.notes});
  factory ClientPreferences.fromJson(Map<String, dynamic> j) => ClientPreferences(
        machine: j['machine'] as String?,
        products: j['products'] as String?,
        allergies: j['allergies'] as String?,
        drink: j['drink'] as String?,
        chat: j['chat'] as String?,
        notes: j['notes'] as String?,
      );
  bool get isEmpty => [machine, products, allergies, drink, chat, notes].every((e) => e == null || e.isEmpty);
}

class ClientRepository {
  Future<List<ClientAppointment>> myAppointments() async {
    final data = await ApiClient.instance.get('/client/appointments') as List;
    return data.map((e) => ClientAppointment.fromJson(e)).toList();
  }

  Future<List<LoyaltyBalance>> myLoyalty() async {
    final data = await ApiClient.instance.get('/client/loyalty') as List;
    return data.map((e) => LoyaltyBalance.fromJson(e)).toList();
  }

  Future<void> cancelAppointment(String appointmentId) {
    return ApiClient.instance.patch('/appointments/$appointmentId', data: {'status': 'CANCELLED'});
  }

  Future<void> submitReview({required String appointmentId, required int rating, String? comment}) {
    return ApiClient.instance.post('/client/reviews', data: {
      'appointmentId': appointmentId,
      'rating': rating,
      if (comment != null && comment.trim().isNotEmpty) 'comment': comment.trim(),
    });
  }

  Future<GestorNotificationsResult> notifications() async {
    final data = await ApiClient.instance.get('/client/notifications');
    return GestorNotificationsResult.fromJson(data as Map<String, dynamic>);
  }

  Future<List<CutPhoto>> cuts() async {
    final data = await ApiClient.instance.get('/client/cuts') as List;
    return data.map((e) => CutPhoto.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> addCut({required String imageUrl, String? note}) async {
    await ApiClient.instance.post('/client/cuts', data: {
      'imageUrl': imageUrl,
      if (note != null && note.isNotEmpty) 'note': note,
    });
  }

  Future<void> deleteCut(String id) async {
    await ApiClient.instance.delete('/client/cuts/$id');
  }

  Future<Uint8List> downloadBytes(String url) async {
    final resp = await dio.Dio().get<List<int>>(url, options: dio.Options(responseType: dio.ResponseType.bytes));
    return Uint8List.fromList(resp.data ?? const []);
  }

  Future<String> uploadImage(XFile file) async {
    final bytes = await file.readAsBytes();
    final formData = dio.FormData.fromMap({'file': dio.MultipartFile.fromBytes(bytes, filename: file.name)});
    final result = await ApiClient.instance.post('/upload', data: formData);
    return result['url'] as String;
  }

  Future<ClientPreferences> preferences() async {
    final data = await ApiClient.instance.get('/client/preferences') as Map<String, dynamic>;
    return ClientPreferences.fromJson(data);
  }

  Future<void> savePreferences(Map<String, String?> prefs) async {
    await ApiClient.instance.put('/client/preferences', data: prefs);
  }

  Future<QueueInfo> queue(String appointmentId) async {
    final data = await ApiClient.instance.get('/client/queue', query: {'appointmentId': appointmentId});
    return QueueInfo.fromJson(data as Map<String, dynamic>);
  }

  Future<TipInfo> tipInfo(String appointmentId) async {
    final data = await ApiClient.instance.get('/client/tips', query: {'appointmentId': appointmentId});
    return TipInfo.fromJson(data as Map<String, dynamic>);
  }

  Future<void> sendTip(String appointmentId, double amount) async {
    await ApiClient.instance.post('/client/tips', data: {'appointmentId': appointmentId, 'amount': amount});
  }

  /// Sends a message to the barbershop's virtual assistant. Returns the bot's
  /// reply — AI-powered when the shop is on Pro+ and a key is configured on the
  /// server, otherwise the backend's canned answers.
  Future<String> chatbotSend({required String message, required String sessionId, required String barbershopId}) async {
    final data = await ApiClient.instance.post('/chatbot', data: {
      'message': message,
      'sessionId': sessionId,
      'barbershopId': barbershopId,
    });
    return (data as Map<String, dynamic>)['response'] as String? ?? '';
  }

  /// Personalized, logged-in client assistant — knows the client, remembers the
  /// conversation. Preferred over [chatbotSend] when the client is signed in.
  Future<String> clientChatSend({required String message, required String barbershopId}) async {
    final data = await ApiClient.instance.post('/client/chat', data: {'message': message, 'barbershopId': barbershopId});
    return (data as Map<String, dynamic>)['response'] as String? ?? '';
  }

  Future<List<({String role, String text})>> clientChatHistory(String barbershopId) async {
    final data = await ApiClient.instance.get('/client/chat', query: {'barbershopId': barbershopId}) as Map<String, dynamic>;
    return ((data['messages'] as List?) ?? []).map((e) {
      final m = e as Map<String, dynamic>;
      return (role: m['role'] as String? ?? 'assistant', text: m['content'] as String? ?? '');
    }).toList();
  }

  Future<void> markAllNotificationsRead() async {
    await ApiClient.instance.post('/client/notifications/read-all');
  }
}
