import 'package:dio/dio.dart' as dio;
import 'package:image_picker/image_picker.dart';
import '../../core/api/api_client.dart';
import '../../core/models/notification_models.dart';

export '../../core/models/notification_models.dart';

/// The "receita do corte" (ficha técnica) — how a cut was executed, so it can
/// be reproduced identically on the next visit.
class CutRecipe {
  final String? machine;
  final String? finish;
  final String? products;
  final String? notes;
  final String? date;

  CutRecipe({this.machine, this.finish, this.products, this.notes, this.date});

  bool get isEmpty => [machine, finish, products, notes].every((e) => e == null || e.isEmpty);

  factory CutRecipe.fromJson(Map<String, dynamic> j) => CutRecipe(
        machine: j['recipeMachine'] as String?,
        finish: j['recipeFinish'] as String?,
        products: j['recipeProducts'] as String?,
        notes: j['recipeNotes'] as String?,
        date: j['date'] as String?,
      );
}

class BarberTipEntry {
  final String id;
  final double amount;
  final String status;
  final String clientName;

  BarberTipEntry({required this.id, required this.amount, required this.status, required this.clientName});

  factory BarberTipEntry.fromJson(Map<String, dynamic> j) => BarberTipEntry(
        id: j['id'] as String,
        amount: (j['amount'] as num).toDouble(),
        status: j['status'] as String,
        clientName: j['clientName'] as String? ?? 'Cliente',
      );
}

class BarberTips {
  final double total;
  final int count;
  final List<BarberTipEntry> tips;

  BarberTips({required this.total, required this.count, required this.tips});

  factory BarberTips.fromJson(Map<String, dynamic> j) => BarberTips(
        total: (j['total'] as num?)?.toDouble() ?? 0,
        count: j['count'] as int? ?? 0,
        tips: ((j['tips'] as List?) ?? []).map((e) => BarberTipEntry.fromJson(e as Map<String, dynamic>)).toList(),
      );
}

class BarberAppointment {
  final String id;
  final String clientName;
  final String clientPhone;
  final String? clientId;
  final String date;
  final String startTime;
  final String status;
  final double totalPrice;
  final String serviceName;
  final String? referencePhoto;
  final String? resultPhoto;

  BarberAppointment({
    required this.id,
    required this.clientName,
    required this.clientPhone,
    this.clientId,
    required this.date,
    required this.startTime,
    required this.status,
    required this.totalPrice,
    required this.serviceName,
    this.referencePhoto,
    this.resultPhoto,
  });

  factory BarberAppointment.fromJson(Map<String, dynamic> json) =>
      BarberAppointment(
        id: json['id'],
        clientName: json['clientName'],
        clientPhone: json['clientPhone'],
        clientId: json['client']?['id'] as String? ?? json['clientId'] as String?,
        date: json['date'],
        startTime: json['startTime'],
        status: json['status'],
        totalPrice: (json['totalPrice'] as num).toDouble(),
        serviceName: json['service']['name'],
        referencePhoto: json['referencePhoto'] as String?,
        resultPhoto: json['resultPhoto'] as String?,
      );
}

class BarberStats {
  final double monthRevenue;
  final double commissionRate;
  final double commission;
  final int completedCount;
  final double avgTicket;
  final double? avgRating;
  final int ratingCount;

  BarberStats({
    required this.monthRevenue,
    required this.commissionRate,
    required this.commission,
    required this.completedCount,
    required this.avgTicket,
    required this.avgRating,
    required this.ratingCount,
  });

  factory BarberStats.fromJson(Map<String, dynamic> json) => BarberStats(
    monthRevenue: (json['monthRevenue'] as num).toDouble(),
    commissionRate: (json['commissionRate'] as num).toDouble(),
    commission: (json['commission'] as num).toDouble(),
    completedCount: json['completedCount'] as int,
    avgTicket: (json['avgTicket'] as num).toDouble(),
    avgRating: json['avgRating'] != null
        ? (json['avgRating'] as num).toDouble()
        : null,
    ratingCount: json['ratingCount'] as int,
  );
}

class ClientHistoryVisit {
  final String date;
  final String startTime;
  final String status;
  final double totalPrice;
  final String serviceName;
  final String staffName;

  ClientHistoryVisit({
    required this.date,
    required this.startTime,
    required this.status,
    required this.totalPrice,
    required this.serviceName,
    required this.staffName,
  });

  factory ClientHistoryVisit.fromJson(Map<String, dynamic> json) =>
      ClientHistoryVisit(
        date: json['date'],
        startTime: json['startTime'],
        status: json['status'],
        totalPrice: (json['totalPrice'] as num).toDouble(),
        serviceName: json['service']['name'],
        staffName: json['staff']['name'],
      );
}

class ClientHistory {
  final String clientName;
  final int totalVisits;
  final double totalSpent;
  final List<ClientHistoryVisit> visits;

  ClientHistory({
    required this.clientName,
    required this.totalVisits,
    required this.totalSpent,
    required this.visits,
  });

  factory ClientHistory.fromJson(Map<String, dynamic> json) => ClientHistory(
    clientName: json['clientName'],
    totalVisits: json['totalVisits'] as int,
    totalSpent: (json['totalSpent'] as num).toDouble(),
    visits: (json['appointments'] as List)
        .map((e) => ClientHistoryVisit.fromJson(e))
        .toList(),
  );
}

class ClientRankingEntry {
  final String key;
  final String? clientId;
  final String name;
  final String? avatar;
  final int visits;
  final double totalSpent;
  final String lastVisit;

  ClientRankingEntry({
    required this.key,
    required this.clientId,
    required this.name,
    required this.avatar,
    required this.visits,
    required this.totalSpent,
    required this.lastVisit,
  });

  factory ClientRankingEntry.fromJson(Map<String, dynamic> json) =>
      ClientRankingEntry(
        key: json['key'],
        clientId: json['clientId'],
        name: json['name'],
        avatar: json['avatar'],
        visits: json['visits'] as int,
        totalSpent: (json['totalSpent'] as num).toDouble(),
        lastVisit: json['lastVisit'],
      );
}

class ClientMembership {
  final String planName;
  final String planColor;
  final String status; // ACTIVE | PAST_DUE

  ClientMembership({required this.planName, required this.planColor, required this.status});

  factory ClientMembership.fromJson(Map<String, dynamic> json) => ClientMembership(
        planName: json['planName'],
        planColor: json['planColor'] ?? '#D4AF37',
        status: json['status'],
      );
}

/// A client as registered on the barbershop (not just the ones with a
/// completed visit under this barber) — used so a client the barber just
/// registered shows up immediately, before they've ever been served.
class BarberClientEntry {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final int visits;
  final double totalSpent;
  final String? avatar;
  final ClientMembership? subscription;

  BarberClientEntry({
    required this.id,
    required this.name,
    required this.phone,
    required this.email,
    required this.visits,
    required this.totalSpent,
    required this.avatar,
    required this.subscription,
  });

  factory BarberClientEntry.fromJson(Map<String, dynamic> json) => BarberClientEntry(
        id: json['id'],
        name: json['name'],
        phone: json['phone'] ?? '',
        email: json['email'],
        visits: json['visits'] as int? ?? 0,
        totalSpent: (json['totalSpent'] as num?)?.toDouble() ?? 0,
        avatar: json['avatar'],
        subscription: json['subscription'] != null ? ClientMembership.fromJson(json['subscription']) : null,
      );
}

/// One weekday's effective schedule for a staff member: either following
/// the barbershop's own default hours (no override on file), a custom
/// open/close the barber set for themself, or a recurring day off.
class ScheduleDay {
  final int dayOfWeek;
  final String mode; // default | custom | closed
  final String startTime;
  final String endTime;

  ScheduleDay({required this.dayOfWeek, required this.mode, required this.startTime, required this.endTime});
}

class ShopHours {
  final int dayOfWeek;
  final bool isOpen;
  final String openTime;
  final String closeTime;

  ShopHours({required this.dayOfWeek, required this.isOpen, required this.openTime, required this.closeTime});

  factory ShopHours.fromJson(Map<String, dynamic> json) =>
      ShopHours(dayOfWeek: json['dayOfWeek'], isOpen: json['isOpen'], openTime: json['openTime'], closeTime: json['closeTime']);
}

class StaffSchedule {
  final List<ScheduleDay> days;
  final List<ShopHours> shopHours;

  StaffSchedule({required this.days, required this.shopHours});

  String describeDefault(int dayOfWeek) {
    final h = shopHours.where((s) => s.dayOfWeek == dayOfWeek).toList();
    if (h.isEmpty || !h.first.isOpen) return 'Barbearia fechada';
    return 'Padrão: ${h.first.openTime} às ${h.first.closeTime}';
  }
}

class TimeOffEntry {
  final String id;
  final String date;
  final String? reason;

  TimeOffEntry({required this.id, required this.date, this.reason});

  factory TimeOffEntry.fromJson(Map<String, dynamic> json) => TimeOffEntry(id: json['id'], date: json['date'], reason: json['reason']);
}

class BarberRepository {
  Future<List<BarberAppointment>> myAppointments({String? from, String? to}) async {
    final query = <String, dynamic>{};
    if (from != null) query['from'] = from;
    if (to != null) query['to'] = to;
    final data = await ApiClient.instance.get('/barber/appointments', query: query.isEmpty ? null : query) as List;
    return data.map((e) => BarberAppointment.fromJson(e)).toList();
  }

  Future<void> createClient({required String name, required String email, String? phone, required String password, String? dateOfBirth}) async {
    await ApiClient.instance.post('/clients', data: {
      'name': name,
      'email': email,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      if (dateOfBirth != null && dateOfBirth.isNotEmpty) 'dateOfBirth': dateOfBirth,
      'password': password,
    });
  }

  Future<void> updateStatus(String appointmentId, String status) async {
    await ApiClient.instance.patch(
      '/appointments/$appointmentId',
      data: {'status': status},
    );
  }

  /// Completes an appointment while recording the "depois" photo and the cut
  /// recipe (ficha técnica) in one shot. The result photo also auto-lands in
  /// the client's Carteira de Cortes (handled server-side).
  Future<void> finalizeAppointment(
    String appointmentId, {
    String? resultPhoto,
    String? machine,
    String? finish,
    String? products,
    String? notes,
    bool complete = true,
  }) async {
    await ApiClient.instance.patch('/appointments/$appointmentId', data: {
      if (complete) 'status': 'COMPLETED',
      if (resultPhoto != null) 'resultPhoto': resultPhoto,
      'recipeMachine': machine ?? '',
      'recipeFinish': finish ?? '',
      'recipeProducts': products ?? '',
      'recipeNotes': notes ?? '',
    });
  }

  /// The most recent recipe recorded for a client, to pre-fill the next cut.
  Future<CutRecipe?> lastRecipe(String clientId) async {
    final data = await ApiClient.instance.get('/barber/last-recipe', query: {'clientId': clientId});
    if (data == null) return null;
    return CutRecipe.fromJson(data as Map<String, dynamic>);
  }

  /// Asks the AI to describe a reference photo in technical barber terms.
  /// Returns null when the AI assistant isn't configured on the server.
  Future<String?> analyzeReference(String imageUrl) async {
    final data = await ApiClient.instance.post('/barber/analyze-reference', data: {'imageUrl': imageUrl}) as Map<String, dynamic>;
    if (data['available'] != true) return null;
    return data['description'] as String?;
  }

  Future<BarberTips> myTips() async {
    final data = await ApiClient.instance.get('/barber/tips');
    return BarberTips.fromJson(data as Map<String, dynamic>);
  }

  Future<String> uploadImage(XFile file) async {
    final bytes = await file.readAsBytes();
    final formData = dio.FormData.fromMap({'file': dio.MultipartFile.fromBytes(bytes, filename: file.name)});
    final result = await ApiClient.instance.post('/upload', data: formData);
    return result['url'] as String;
  }

  Future<BarberStats> myStats() async {
    final data = await ApiClient.instance.get('/barber/stats');
    return BarberStats.fromJson(data as Map<String, dynamic>);
  }

  Future<ClientHistory> clientHistory(String appointmentId) async {
    final data = await ApiClient.instance.get(
      '/barber/clients/history',
      query: {'appointmentId': appointmentId},
    );
    return ClientHistory.fromJson(data as Map<String, dynamic>);
  }

  Future<List<ClientRankingEntry>> clientRanking() async {
    final data = await ApiClient.instance.get('/barber/clients/ranking') as List;
    return data.map((e) => ClientRankingEntry.fromJson(e)).toList();
  }

  /// Every client on the barbershop, regardless of whether they've had a
  /// completed visit yet — unlike [clientRanking], which only ever includes
  /// clients with at least one completed appointment.
  Future<List<BarberClientEntry>> allClients() async {
    final data = await ApiClient.instance.get('/clients') as List;
    return data.map((e) => BarberClientEntry.fromJson(e)).toList();
  }

  Future<StaffSchedule> mySchedule(String staffId) async {
    final data = await ApiClient.instance.get('/staff/$staffId/availability') as Map<String, dynamic>;
    final overrides = (data['availability'] as List).cast<Map<String, dynamic>>();
    final days = List.generate(7, (dayOfWeek) {
      final override = overrides.where((o) => o['dayOfWeek'] == dayOfWeek).toList();
      if (override.isEmpty) return ScheduleDay(dayOfWeek: dayOfWeek, mode: 'default', startTime: '09:00', endTime: '18:00');
      final o = override.first;
      final isAvailable = o['isAvailable'] as bool;
      return ScheduleDay(
        dayOfWeek: dayOfWeek,
        mode: isAvailable ? 'custom' : 'closed',
        startTime: isAvailable ? o['startTime'] as String : '09:00',
        endTime: isAvailable ? o['endTime'] as String : '18:00',
      );
    });
    final shopHours = (data['shopHours'] as List).map((e) => ShopHours.fromJson(e)).toList();
    return StaffSchedule(days: days, shopHours: shopHours);
  }

  Future<void> saveSchedule(String staffId, List<ScheduleDay> days) async {
    await ApiClient.instance.put('/staff/$staffId/availability', data: {
      'days': days
          .map((d) => {
                'dayOfWeek': d.dayOfWeek,
                'mode': d.mode,
                if (d.mode == 'custom') 'startTime': d.startTime,
                if (d.mode == 'custom') 'endTime': d.endTime,
              })
          .toList(),
    });
  }

  Future<List<TimeOffEntry>> myTimeOff(String staffId) async {
    final data = await ApiClient.instance.get('/staff/$staffId/time-off') as List;
    return data.map((e) => TimeOffEntry.fromJson(e)).toList();
  }

  Future<void> addTimeOff(String staffId, {required String date, String? reason}) async {
    await ApiClient.instance.post('/staff/$staffId/time-off', data: {
      'date': date,
      if (reason != null && reason.isNotEmpty) 'reason': reason,
    });
  }

  Future<void> removeTimeOff(String staffId, String timeOffId) async {
    await ApiClient.instance.delete('/staff/$staffId/time-off/$timeOffId');
  }

  Future<List<GestorAnnouncement>> activeAnnouncements() async {
    final data = await ApiClient.instance.get('/announcements/active') as List;
    return data.map((e) => GestorAnnouncement.fromJson(e)).toList();
  }

  Future<void> dismissAnnouncement(String id) async {
    await ApiClient.instance.post('/announcements/$id/dismiss');
  }

  Future<GestorNotificationsResult> notifications() async {
    final data = await ApiClient.instance.get('/notifications');
    return GestorNotificationsResult.fromJson(data as Map<String, dynamic>);
  }

  Future<void> markAllNotificationsRead() async {
    await ApiClient.instance.post('/notifications/read-all');
  }
}
