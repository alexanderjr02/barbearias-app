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

  Future<void> markAllNotificationsRead() async {
    await ApiClient.instance.post('/client/notifications/read-all');
  }
}
