import '../../core/api/api_client.dart';

class ClientSubscriptionPlan {
  final String id;
  final String name;
  final String? description;
  final double price;
  final String billingCycle; // MONTHLY | QUARTERLY | ANNUAL
  final String benefits;
  final String color;

  ClientSubscriptionPlan({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.billingCycle,
    required this.benefits,
    required this.color,
  });

  factory ClientSubscriptionPlan.fromJson(Map<String, dynamic> json) => ClientSubscriptionPlan(
        id: json['id'],
        name: json['name'],
        description: json['description'],
        price: (json['price'] as num).toDouble(),
        billingCycle: json['billingCycle'],
        benefits: json['benefits'] ?? '',
        color: json['color'] ?? '#D4AF37',
      );
}

class MySubscription {
  final String id;
  final String planId;
  final String planName;
  final double price;
  final String billingCycle;
  final String color;
  final String paymentMethod;
  final String status; // ACTIVE | PAST_DUE | CANCELLED
  final String startedAt;
  final String nextBillingAt;
  final int visitCount;
  final double valueConsumed;
  final double totalPaid;

  MySubscription({
    required this.id,
    required this.planId,
    required this.planName,
    required this.price,
    required this.billingCycle,
    required this.color,
    required this.paymentMethod,
    required this.status,
    required this.startedAt,
    required this.nextBillingAt,
    required this.visitCount,
    required this.valueConsumed,
    required this.totalPaid,
  });

  factory MySubscription.fromJson(Map<String, dynamic> json) => MySubscription(
        id: json['id'],
        planId: json['planId'],
        planName: json['planName'],
        price: (json['price'] as num).toDouble(),
        billingCycle: json['billingCycle'],
        color: json['color'] ?? '#D4AF37',
        paymentMethod: json['paymentMethod'],
        status: json['status'],
        startedAt: json['startedAt'],
        nextBillingAt: json['nextBillingAt'],
        visitCount: json['visitCount'] as int? ?? 0,
        valueConsumed: (json['valueConsumed'] as num?)?.toDouble() ?? 0,
        totalPaid: (json['totalPaid'] as num?)?.toDouble() ?? 0,
      );
}

class BarbershopSubscriptions {
  final List<ClientSubscriptionPlan> plans;
  final MySubscription? mySubscription;

  BarbershopSubscriptions({required this.plans, required this.mySubscription});

  factory BarbershopSubscriptions.fromJson(Map<String, dynamic> json) => BarbershopSubscriptions(
        plans: (json['plans'] as List).map((e) => ClientSubscriptionPlan.fromJson(e)).toList(),
        mySubscription: json['mySubscription'] != null ? MySubscription.fromJson(json['mySubscription']) : null,
      );
}

class ClientSubscriptionRepository {
  Future<BarbershopSubscriptions> plansFor(String barbershopId) async {
    final data = await ApiClient.instance.get('/client/subscription-plans', query: {'barbershopId': barbershopId});
    return BarbershopSubscriptions.fromJson(data as Map<String, dynamic>);
  }

  /// Starts a subscription. Returns the payment payload: `{simulated: true}`,
  /// `{pix: {qrCode, qrCodeBase64}}` or `{initPoint: ...}` (hosted checkout).
  /// `cpfCnpj` is required by some providers (e.g. Asaas).
  Future<Map<String, dynamic>> subscribe({required String planId, required String paymentMethod, String? cpfCnpj}) async {
    final data = await ApiClient.instance.post('/client/subscription-plans', data: {
      'planId': planId,
      'paymentMethod': paymentMethod,
      if (cpfCnpj != null && cpfCnpj.isNotEmpty) 'cpfCnpj': cpfCnpj,
    });
    return (data as Map).cast<String, dynamic>();
  }

  /// Polls whether a pending payment has been confirmed. Returns the current
  /// status ("PENDING" | "ACTIVE" | "CANCELLED").
  Future<String> checkPaymentStatus(String subscriptionId) async {
    final data = await ApiClient.instance.post('/client/subscriptions/check', data: {'subscriptionId': subscriptionId});
    return ((data as Map)['status'] as String?) ?? 'PENDING';
  }

  Future<void> cancelMySubscription(String subscriptionId) {
    return ApiClient.instance.patch('/client-subscriptions/$subscriptionId', data: {'status': 'CANCELLED'});
  }
}
