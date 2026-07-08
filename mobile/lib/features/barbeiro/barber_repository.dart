import '../../core/api/api_client.dart';

class BarberAppointment {
  final String id;
  final String clientName;
  final String clientPhone;
  final String date;
  final String startTime;
  final String status;
  final double totalPrice;
  final String serviceName;

  BarberAppointment({
    required this.id,
    required this.clientName,
    required this.clientPhone,
    required this.date,
    required this.startTime,
    required this.status,
    required this.totalPrice,
    required this.serviceName,
  });

  factory BarberAppointment.fromJson(Map<String, dynamic> json) =>
      BarberAppointment(
        id: json['id'],
        clientName: json['clientName'],
        clientPhone: json['clientPhone'],
        date: json['date'],
        startTime: json['startTime'],
        status: json['status'],
        totalPrice: (json['totalPrice'] as num).toDouble(),
        serviceName: json['service']['name'],
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

  BarberClientEntry({
    required this.id,
    required this.name,
    required this.phone,
    required this.email,
    required this.visits,
    required this.totalSpent,
    required this.avatar,
  });

  factory BarberClientEntry.fromJson(Map<String, dynamic> json) => BarberClientEntry(
        id: json['id'],
        name: json['name'],
        phone: json['phone'] ?? '',
        email: json['email'],
        visits: json['visits'] as int? ?? 0,
        totalSpent: (json['totalSpent'] as num?)?.toDouble() ?? 0,
        avatar: json['avatar'],
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

  Future<void> createClient({required String name, required String email, String? phone, required String password}) async {
    await ApiClient.instance.post('/clients', data: {
      'name': name,
      'email': email,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      'password': password,
    });
  }

  Future<void> updateStatus(String appointmentId, String status) async {
    await ApiClient.instance.patch(
      '/appointments/$appointmentId',
      data: {'status': status},
    );
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
}
