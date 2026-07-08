import 'package:dio/dio.dart' as dio;
import 'package:image_picker/image_picker.dart';
import '../../core/api/api_client.dart';

class DashboardSummary {
  final double todayRevenue;
  final double yesterdayRevenue;
  final int todayCount;
  final int unconfirmedToday;
  final int activeClients;
  final double monthRevenue;
  final double avgTicket;
  final List<TopBarber> topBarbers;
  final List<RecentAppointment> recentAppointments;

  DashboardSummary({
    required this.todayRevenue,
    required this.yesterdayRevenue,
    required this.todayCount,
    required this.unconfirmedToday,
    required this.activeClients,
    required this.monthRevenue,
    required this.avgTicket,
    required this.topBarbers,
    required this.recentAppointments,
  });

  factory DashboardSummary.fromJson(Map<String, dynamic> json) => DashboardSummary(
        todayRevenue: (json['todayRevenue'] as num).toDouble(),
        yesterdayRevenue: (json['yesterdayRevenue'] as num).toDouble(),
        todayCount: json['todayCount'] as int,
        unconfirmedToday: json['unconfirmedToday'] as int,
        activeClients: json['activeClients'] as int,
        monthRevenue: (json['monthRevenue'] as num).toDouble(),
        avgTicket: (json['avgTicket'] as num).toDouble(),
        topBarbers: (json['topBarbers'] as List).map((e) => TopBarber.fromJson(e)).toList(),
        recentAppointments: (json['recentAppointments'] as List).map((e) => RecentAppointment.fromJson(e)).toList(),
      );
}

class TopBarber {
  final String name;
  final int appointments;
  final double revenue;
  final double share;

  TopBarber({required this.name, required this.appointments, required this.revenue, required this.share});

  factory TopBarber.fromJson(Map<String, dynamic> json) => TopBarber(
        name: json['name'],
        appointments: json['appointments'] as int,
        revenue: (json['revenue'] as num).toDouble(),
        share: (json['share'] as num).toDouble(),
      );
}

class RecentAppointment {
  final String id;
  final String client;
  final String service;
  final String barber;
  final String time;
  final String status;
  final double value;

  RecentAppointment({required this.id, required this.client, required this.service, required this.barber, required this.time, required this.status, required this.value});

  factory RecentAppointment.fromJson(Map<String, dynamic> json) => RecentAppointment(
        id: json['id'],
        client: json['client'],
        service: json['service'],
        barber: json['barber'],
        time: json['time'],
        status: json['status'],
        value: (json['value'] as num).toDouble(),
      );
}

class GestorClient {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final int visits;
  final double totalSpent;
  final String lastVisit;
  final String favorite;
  final int? points;
  final String? tier;
  final bool hasAccount;
  final String? avatar;

  GestorClient({
    required this.id,
    required this.name,
    required this.phone,
    required this.email,
    required this.visits,
    required this.totalSpent,
    required this.lastVisit,
    required this.favorite,
    required this.points,
    required this.tier,
    required this.hasAccount,
    required this.avatar,
  });

  factory GestorClient.fromJson(Map<String, dynamic> json) => GestorClient(
        id: json['id'],
        name: json['name'],
        phone: json['phone'],
        email: json['email'],
        visits: json['visits'] as int,
        totalSpent: (json['totalSpent'] as num).toDouble(),
        lastVisit: json['lastVisit'],
        favorite: json['favorite'] ?? '',
        points: json['points'] as int?,
        tier: json['tier'],
        hasAccount: json['hasAccount'] == true,
        avatar: json['avatar'],
      );
}

class GestorStaff {
  final String id;
  final String name;
  final String role;
  final String? specialties;
  final String? avatar;
  final double commissionRate;
  final bool isActive;
  final int appointmentsCount;
  final double revenue;
  final bool hasLogin;
  final double? avgRating;
  final int reviewCount;

  GestorStaff({
    required this.id,
    required this.name,
    required this.role,
    required this.specialties,
    required this.avatar,
    required this.commissionRate,
    required this.isActive,
    required this.appointmentsCount,
    required this.revenue,
    required this.hasLogin,
    required this.avgRating,
    required this.reviewCount,
  });

  factory GestorStaff.fromJson(Map<String, dynamic> json) => GestorStaff(
        id: json['id'],
        name: json['name'],
        role: json['role'],
        specialties: json['specialties'],
        avatar: json['avatar'],
        commissionRate: (json['commissionRate'] as num).toDouble(),
        isActive: json['isActive'] == true,
        appointmentsCount: json['appointmentsCount'] as int,
        revenue: (json['revenue'] as num).toDouble(),
        hasLogin: json['hasLogin'] == true,
        avgRating: json['avgRating'] != null ? (json['avgRating'] as num).toDouble() : null,
        reviewCount: json['reviewCount'] as int,
      );
}

class GestorAppointment {
  final String id;
  final String clientName;
  final String clientPhone;
  final String date;
  final String startTime;
  final String status;
  final double totalPrice;
  final String staffName;
  final String serviceName;

  GestorAppointment({
    required this.id,
    required this.clientName,
    required this.clientPhone,
    required this.date,
    required this.startTime,
    required this.status,
    required this.totalPrice,
    required this.staffName,
    required this.serviceName,
  });

  factory GestorAppointment.fromJson(Map<String, dynamic> json) => GestorAppointment(
        id: json['id'],
        clientName: json['clientName'],
        clientPhone: json['clientPhone'],
        date: json['date'],
        startTime: json['startTime'],
        status: json['status'],
        totalPrice: (json['totalPrice'] as num).toDouble(),
        staffName: json['staff']['name'],
        serviceName: json['service']['name'],
      );
}

class FinanceTransaction {
  final String id;
  final String type;
  final String category;
  final String description;
  final double amount;
  final String date;
  final String? paymentMethod;

  FinanceTransaction({
    required this.id,
    required this.type,
    required this.category,
    required this.description,
    required this.amount,
    required this.date,
    required this.paymentMethod,
  });

  factory FinanceTransaction.fromJson(Map<String, dynamic> json) => FinanceTransaction(
        id: json['id'],
        type: json['type'],
        category: json['category'],
        description: json['description'],
        amount: (json['amount'] as num).toDouble(),
        date: json['date'],
        paymentMethod: json['paymentMethod'],
      );
}

class FinanceSummary {
  final double income;
  final double expenses;
  final double profit;
  final double serviceRevenue;
  final double manualIncome;
  final List<FinanceTransaction> transactions;

  FinanceSummary({
    required this.income,
    required this.expenses,
    required this.profit,
    required this.serviceRevenue,
    required this.manualIncome,
    required this.transactions,
  });

  factory FinanceSummary.fromJson(Map<String, dynamic> json) => FinanceSummary(
        income: (json['summary']['income'] as num).toDouble(),
        expenses: (json['summary']['expenses'] as num).toDouble(),
        profit: (json['summary']['profit'] as num).toDouble(),
        serviceRevenue: (json['summary']['serviceRevenue'] as num).toDouble(),
        manualIncome: (json['summary']['manualIncome'] as num).toDouble(),
        transactions: (json['transactions'] as List).map((e) => FinanceTransaction.fromJson(e)).toList(),
      );
}

class MeLite {
  final String barbershopId;
  MeLite({required this.barbershopId});
  factory MeLite.fromJson(Map<String, dynamic> json) => MeLite(barbershopId: json['barbershopId']);
}

class GestorService {
  final String id;
  final String name;
  final String? description;
  final String? image;
  final String category;
  final int duration;
  final double price;
  final bool isActive;
  final int appointmentsCount;

  GestorService({
    required this.id,
    required this.name,
    required this.description,
    required this.image,
    required this.category,
    required this.duration,
    required this.price,
    required this.isActive,
    required this.appointmentsCount,
  });

  factory GestorService.fromJson(Map<String, dynamic> json) => GestorService(
        id: json['id'],
        name: json['name'],
        description: json['description'],
        image: json['image'],
        category: json['category'],
        duration: json['duration'] as int,
        price: (json['price'] as num).toDouble(),
        isActive: json['isActive'] == true,
        appointmentsCount: json['appointmentsCount'] as int? ?? 0,
      );
}

class GestorProduct {
  final String id;
  final String name;
  final String? image;
  final String? brand;
  final String? sku;
  final double price;
  final double? costPrice;
  final int quantity;
  final int minQuantity;
  final String? category;

  GestorProduct({
    required this.id,
    required this.name,
    required this.image,
    required this.brand,
    required this.sku,
    required this.price,
    required this.costPrice,
    required this.quantity,
    required this.minQuantity,
    required this.category,
  });

  factory GestorProduct.fromJson(Map<String, dynamic> json) => GestorProduct(
        id: json['id'],
        name: json['name'],
        image: json['image'],
        brand: json['brand'],
        sku: json['sku'],
        price: (json['price'] as num).toDouble(),
        costPrice: json['costPrice'] != null ? (json['costPrice'] as num).toDouble() : null,
        quantity: json['quantity'] as int,
        minQuantity: json['minQuantity'] as int,
        category: json['category'],
      );
}

class BarbershopProfile {
  final String id;
  final String name;
  final String slug;
  final String? phone;
  final String? email;
  final String? instagram;
  final String? city;
  final String? description;
  final String? logo;
  final String? coverImage;
  final String primaryColor;
  final String plan;
  final List<WorkingHour> workingHours;

  BarbershopProfile({
    required this.id,
    required this.name,
    required this.slug,
    required this.phone,
    required this.email,
    required this.instagram,
    required this.city,
    required this.description,
    required this.logo,
    required this.coverImage,
    required this.primaryColor,
    required this.plan,
    required this.workingHours,
  });

  factory BarbershopProfile.fromJson(Map<String, dynamic> json) => BarbershopProfile(
        id: json['id'],
        name: json['name'],
        slug: json['slug'],
        phone: json['phone'],
        email: json['email'],
        instagram: json['instagram'],
        city: json['city'],
        description: json['description'],
        logo: json['logo'],
        coverImage: json['coverImage'],
        primaryColor: json['primaryColor'] ?? '#D4AF37',
        plan: json['plan'] ?? 'FREE',
        workingHours: ((json['workingHours'] as List?) ?? []).map((e) => WorkingHour.fromJson(e)).toList(),
      );
}

class WorkingHour {
  final int dayOfWeek;
  final bool isOpen;
  final String openTime;
  final String closeTime;

  WorkingHour({required this.dayOfWeek, required this.isOpen, required this.openTime, required this.closeTime});

  factory WorkingHour.fromJson(Map<String, dynamic> json) => WorkingHour(
        dayOfWeek: json['dayOfWeek'] as int,
        isOpen: json['isOpen'] == true,
        openTime: json['openTime'] ?? '09:00',
        closeTime: json['closeTime'] ?? '20:00',
      );

  Map<String, dynamic> toJson() => {'dayOfWeek': dayOfWeek, 'isOpen': isOpen, 'openTime': openTime, 'closeTime': closeTime};
}

class ReportSeriesPoint {
  final String label;
  final double receita;
  final double despesas;
  final int agendamentos;
  final int novos;
  final int retornantes;

  ReportSeriesPoint({
    required this.label,
    required this.receita,
    required this.despesas,
    required this.agendamentos,
    required this.novos,
    required this.retornantes,
  });

  factory ReportSeriesPoint.fromJson(Map<String, dynamic> json) => ReportSeriesPoint(
        label: json['label'],
        receita: (json['receita'] as num).toDouble(),
        despesas: (json['despesas'] as num).toDouble(),
        agendamentos: json['agendamentos'] as int? ?? 0,
        novos: json['novos'] as int? ?? 0,
        retornantes: json['retornantes'] as int? ?? 0,
      );
}

class ServiceSlice {
  final String name;
  final int count;
  final double value;
  final String color;

  ServiceSlice({required this.name, required this.count, required this.value, required this.color});

  factory ServiceSlice.fromJson(Map<String, dynamic> json) => ServiceSlice(
        name: json['name'],
        count: json['count'] as int,
        value: (json['value'] as num).toDouble(),
        color: json['color'] ?? '#F59E0B',
      );
}

class StaffPerformance {
  final String name;
  final int appointments;
  final double revenue;
  final double commission;
  final int pct;

  StaffPerformance({required this.name, required this.appointments, required this.revenue, required this.commission, required this.pct});

  factory StaffPerformance.fromJson(Map<String, dynamic> json) => StaffPerformance(
        name: json['name'],
        appointments: json['appointments'] as int,
        revenue: (json['revenue'] as num).toDouble(),
        commission: (json['commission'] as num).toDouble(),
        pct: json['pct'] as int,
      );
}

class ReportsData {
  final List<ReportSeriesPoint> series;
  final double totalRevenue;
  final double totalExpenses;
  final int totalAppointments;
  final double profit;
  final double avgTicket;
  final List<ServiceSlice> servicesDistribution;
  final List<StaffPerformance> staffPerformance;

  ReportsData({
    required this.series,
    required this.totalRevenue,
    required this.totalExpenses,
    required this.totalAppointments,
    required this.profit,
    required this.avgTicket,
    required this.servicesDistribution,
    required this.staffPerformance,
  });

  factory ReportsData.fromJson(Map<String, dynamic> json) => ReportsData(
        series: (json['series'] as List).map((e) => ReportSeriesPoint.fromJson(e)).toList(),
        totalRevenue: (json['kpis']['totalRevenue'] as num).toDouble(),
        totalExpenses: (json['kpis']['totalExpenses'] as num).toDouble(),
        totalAppointments: json['kpis']['totalAppointments'] as int,
        profit: (json['kpis']['profit'] as num).toDouble(),
        avgTicket: (json['kpis']['avgTicket'] as num).toDouble(),
        servicesDistribution: (json['servicesDistribution'] as List).map((e) => ServiceSlice.fromJson(e)).toList(),
        staffPerformance: (json['staffPerformance'] as List).map((e) => StaffPerformance.fromJson(e)).toList(),
      );
}

class GestorRepository {
  Future<MeLite> me() async {
    final data = await ApiClient.instance.get('/me');
    return MeLite.fromJson(data as Map<String, dynamic>);
  }

  Future<DashboardSummary> dashboardSummary() async {
    final data = await ApiClient.instance.get('/dashboard/summary');
    return DashboardSummary.fromJson(data as Map<String, dynamic>);
  }

  Future<ReportsData> reports({String range = 'month'}) async {
    final data = await ApiClient.instance.get('/dashboard/reports', query: {'range': range});
    return ReportsData.fromJson(data as Map<String, dynamic>);
  }

  Future<List<GestorAppointment>> appointments(String barbershopId, {String? from, String? to}) async {
    final query = <String, dynamic>{'barbershopId': barbershopId};
    if (from != null) query['from'] = from;
    if (to != null) query['to'] = to;
    final data = await ApiClient.instance.get('/appointments', query: query) as List;
    return data.map((e) => GestorAppointment.fromJson(e)).toList();
  }

  Future<List<GestorClient>> clients() async {
    final data = await ApiClient.instance.get('/clients') as List;
    return data.map((e) => GestorClient.fromJson(e)).toList();
  }

  Future<void> createClient({required String name, required String email, String? phone, required String password}) async {
    await ApiClient.instance.post('/clients', data: {
      'name': name,
      'email': email,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      'password': password,
    });
  }

  Future<void> updateClientAvatar(String id, String? avatar) async {
    await ApiClient.instance.patch('/clients/$id', data: {'avatar': avatar});
  }

  Future<List<GestorStaff>> staff() async {
    final data = await ApiClient.instance.get('/staff') as List;
    return data.map((e) => GestorStaff.fromJson(e)).toList();
  }

  Future<void> createStaff({
    required String name,
    required String role,
    String? specialties,
    required double commissionRate,
    String? avatar,
    String? email,
    String? password,
  }) async {
    await ApiClient.instance.post('/staff', data: {
      'name': name,
      'role': role,
      'specialties': specialties,
      'commissionRate': commissionRate,
      'avatar': avatar,
      if (email != null && email.isNotEmpty) 'email': email,
      if (password != null && password.isNotEmpty) 'password': password,
    });
  }

  Future<void> updateStaff(
    String id, {
    required String name,
    required String role,
    String? specialties,
    required double commissionRate,
    String? avatar,
    bool? isActive,
    String? email,
    String? password,
  }) async {
    await ApiClient.instance.patch('/staff/$id', data: {
      'name': name,
      'role': role,
      'specialties': specialties,
      'commissionRate': commissionRate,
      'avatar': avatar,
      if (isActive != null) 'isActive': isActive,
      if (email != null && email.isNotEmpty) 'email': email,
      if (password != null && password.isNotEmpty) 'password': password,
    });
  }

  Future<FinanceSummary> finance() async {
    final data = await ApiClient.instance.get('/finance/transactions');
    return FinanceSummary.fromJson(data as Map<String, dynamic>);
  }

  Future<void> createTransaction({
    required String type,
    required String category,
    required String description,
    required double amount,
    String? date,
    String? paymentMethod,
  }) async {
    await ApiClient.instance.post('/finance/transactions', data: {
      'type': type,
      'category': category,
      'description': description,
      'amount': amount,
      if (date != null) 'date': date,
      if (paymentMethod != null && paymentMethod.isNotEmpty) 'paymentMethod': paymentMethod,
    });
  }

  Future<List<GestorService>> services() async {
    final data = await ApiClient.instance.get('/services') as List;
    return data.map((e) => GestorService.fromJson(e)).toList();
  }

  Future<void> createService({
    required String name,
    String? description,
    required String category,
    required int duration,
    required double price,
    String? image,
  }) async {
    await ApiClient.instance.post('/services', data: {
      'name': name,
      'description': description,
      'category': category,
      'duration': duration,
      'price': price,
      'image': image,
    });
  }

  Future<void> updateService(
    String id, {
    String? name,
    String? description,
    String? category,
    int? duration,
    double? price,
    String? image,
    bool? isActive,
  }) async {
    await ApiClient.instance.patch('/services/$id', data: {
      if (name != null) 'name': name,
      if (description != null) 'description': description,
      if (category != null) 'category': category,
      if (duration != null) 'duration': duration,
      if (price != null) 'price': price,
      if (image != null) 'image': image,
      if (isActive != null) 'isActive': isActive,
    });
  }

  Future<void> deleteService(String id) async {
    await ApiClient.instance.delete('/services/$id');
  }

  Future<List<GestorProduct>> products() async {
    final data = await ApiClient.instance.get('/products') as List;
    return data.map((e) => GestorProduct.fromJson(e)).toList();
  }

  Future<void> createProduct({
    required String name,
    String? image,
    String? brand,
    String? sku,
    String? category,
    required double price,
    double? costPrice,
    required int quantity,
    required int minQuantity,
  }) async {
    await ApiClient.instance.post('/products', data: {
      'name': name,
      'image': image,
      'brand': brand,
      'sku': sku,
      'category': category,
      'price': price,
      'costPrice': costPrice,
      'quantity': quantity,
      'minQuantity': minQuantity,
    });
  }

  Future<BarbershopProfile> barbershop() async {
    final data = await ApiClient.instance.get('/barbershop');
    return BarbershopProfile.fromJson(data as Map<String, dynamic>);
  }

  Future<void> updateBarbershopProfile({
    required String name,
    String? phone,
    String? email,
    String? instagram,
    String? city,
    String? description,
    String? logo,
    String? coverImage,
  }) async {
    await ApiClient.instance.patch('/barbershop', data: {
      'name': name,
      'phone': phone,
      'email': email,
      if (logo != null) 'logo': logo,
      if (coverImage != null) 'coverImage': coverImage,
      'instagram': instagram,
      'city': city,
      'description': description,
    });
  }

  Future<void> updateBarbershopColor(String primaryColor) async {
    await ApiClient.instance.patch('/barbershop', data: {'primaryColor': primaryColor});
  }

  Future<void> updateWorkingHours(List<WorkingHour> hours) async {
    await ApiClient.instance.patch('/barbershop', data: {'workingHours': hours.map((h) => h.toJson()).toList()});
  }

  Future<void> updatePlan(String plan) async {
    await ApiClient.instance.patch('/barbershop', data: {'plan': plan});
  }

  Future<String> uploadImage(XFile file) async {
    final bytes = await file.readAsBytes();
    final formData = dio.FormData.fromMap({
      'file': dio.MultipartFile.fromBytes(bytes, filename: file.name),
    });
    final result = await ApiClient.instance.post('/upload', data: formData);
    return result['url'] as String;
  }
}
