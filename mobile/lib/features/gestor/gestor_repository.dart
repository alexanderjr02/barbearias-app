import 'package:dio/dio.dart' as dio;
import 'package:image_picker/image_picker.dart';
import '../../core/api/api_client.dart';
import '../../core/models/notification_models.dart';
import '../../core/storage/token_storage.dart';

export '../../core/models/notification_models.dart';

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

class ClientSubscriptionInfo {
  final String planName;
  final String planColor;
  final String status;

  ClientSubscriptionInfo({required this.planName, required this.planColor, required this.status});

  factory ClientSubscriptionInfo.fromJson(Map<String, dynamic> json) => ClientSubscriptionInfo(
        planName: json['planName'],
        planColor: json['planColor'],
        status: json['status'],
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
  final ClientSubscriptionInfo? subscription;

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
    required this.subscription,
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
        subscription: json['subscription'] != null ? ClientSubscriptionInfo.fromJson(json['subscription']) : null,
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
  final String? clientAvatar;
  final String? clientId;
  final String date;
  final String startTime;
  final String endTime;
  final String status;
  final double totalPrice;
  final String staffId;
  final String staffName;
  final String serviceName;
  final String? referencePhoto;
  final String? resultPhoto;
  final String? recipeMachine;
  final String? recipeFinish;
  final String? recipeProducts;
  final String? recipeNotes;

  GestorAppointment({
    required this.id,
    required this.clientName,
    required this.clientPhone,
    required this.clientAvatar,
    this.clientId,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.status,
    required this.totalPrice,
    required this.staffId,
    required this.staffName,
    required this.serviceName,
    this.referencePhoto,
    this.resultPhoto,
    this.recipeMachine,
    this.recipeFinish,
    this.recipeProducts,
    this.recipeNotes,
  });

  bool get hasRecipe =>
      [recipeMachine, recipeFinish, recipeProducts, recipeNotes].any((e) => e != null && e.isNotEmpty);

  factory GestorAppointment.fromJson(Map<String, dynamic> json) => GestorAppointment(
        id: json['id'],
        clientName: json['clientName'],
        clientPhone: json['clientPhone'],
        clientAvatar: json['client']?['avatar'],
        clientId: json['client']?['id'] as String?,
        date: json['date'],
        startTime: json['startTime'],
        endTime: json['endTime'] ?? json['startTime'],
        status: json['status'],
        totalPrice: (json['totalPrice'] as num).toDouble(),
        staffId: json['staff']['id'],
        staffName: json['staff']['name'],
        serviceName: json['service']['name'],
        referencePhoto: json['referencePhoto'] as String?,
        resultPhoto: json['resultPhoto'] as String?,
        recipeMachine: json['recipeMachine'] as String?,
        recipeFinish: json['recipeFinish'] as String?,
        recipeProducts: json['recipeProducts'] as String?,
        recipeNotes: json['recipeNotes'] as String?,
      );
}

class StaffDaySchedule {
  final String staffId;
  final bool isOpen;
  final String? openTime;
  final String? closeTime;
  final String source;

  StaffDaySchedule({required this.staffId, required this.isOpen, required this.openTime, required this.closeTime, required this.source});

  factory StaffDaySchedule.fromJson(Map<String, dynamic> json) => StaffDaySchedule(
        staffId: json['staffId'],
        isOpen: json['isOpen'] == true,
        openTime: json['openTime'],
        closeTime: json['closeTime'],
        source: json['source'] ?? 'shop',
      );
}

class GestorAppointmentSlot {
  final String time;
  final String status; // available | past | booked

  GestorAppointmentSlot({required this.time, required this.status});

  factory GestorAppointmentSlot.fromJson(Map<String, dynamic> json) => GestorAppointmentSlot(time: json['time'], status: json['status']);

  bool get isAvailable => status == 'available';
}

class GestorDaySlots {
  final bool isOpen;
  final String? openTime;
  final String? closeTime;
  final String source;
  final List<GestorAppointmentSlot> slots;

  GestorDaySlots({required this.isOpen, this.openTime, this.closeTime, required this.source, required this.slots});

  factory GestorDaySlots.fromJson(Map<String, dynamic> json) => GestorDaySlots(
        isOpen: json['isOpen'] == true,
        openTime: json['openTime'],
        closeTime: json['closeTime'],
        source: json['source'] ?? 'shop',
        slots: (json['slots'] as List).map((e) => GestorAppointmentSlot.fromJson(e)).toList(),
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
  /// Custo direto (produto, lâmina). Sem ele o sistema só sabe faturamento,
  /// nunca margem.
  final double cost;
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
    this.cost = 0,
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
        cost: (json['cost'] as num?)?.toDouble() ?? 0,
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
  final String? pixKey;
  final String? faqText;
  final String? city;
  final String? description;
  final String? logo;
  final String? coverImage;
  final String primaryColor;
  final String plan;
  final String autopilotLevel;
  final bool autoConfirm;
  final bool autoBirthday;
  final int? autoWinbackDays;
  final List<WorkingHour> workingHours;

  BarbershopProfile({
    required this.id,
    required this.name,
    required this.slug,
    required this.phone,
    required this.email,
    required this.instagram,
    this.pixKey,
    this.faqText,
    required this.city,
    required this.description,
    required this.logo,
    required this.coverImage,
    required this.primaryColor,
    required this.plan,
    this.autopilotLevel = 'suggest',
    this.autoConfirm = false,
    this.autoBirthday = false,
    this.autoWinbackDays,
    required this.workingHours,
  });

  factory BarbershopProfile.fromJson(Map<String, dynamic> json) => BarbershopProfile(
        id: json['id'],
        name: json['name'],
        slug: json['slug'],
        phone: json['phone'],
        email: json['email'],
        instagram: json['instagram'],
        pixKey: json['pixKey'],
        faqText: json['faqText'],
        city: json['city'],
        description: json['description'],
        logo: json['logo'],
        coverImage: json['coverImage'],
        primaryColor: json['primaryColor'] ?? '#D4AF37',
        plan: json['plan'] ?? 'FREE',
        autopilotLevel: json['autopilotLevel'] as String? ?? 'suggest',
        autoConfirm: json['autoConfirm'] == true,
        autoBirthday: json['autoBirthday'] == true,
        autoWinbackDays: json['autoWinbackDays'] as int?,
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

class SubscriptionVisit {
  final String date;
  final String service;
  final String staff;
  final double price;

  SubscriptionVisit({required this.date, required this.service, required this.staff, required this.price});

  factory SubscriptionVisit.fromJson(Map<String, dynamic> json) => SubscriptionVisit(
        date: json['date'],
        service: json['service'],
        staff: json['staff'],
        price: (json['price'] as num).toDouble(),
      );
}

class GestorSubscriber {
  final String id;
  final String clientName;
  final String clientPhone;
  final String? clientAvatar;
  final String paymentMethod; // PIX | CREDIT_CARD
  final String status; // ACTIVE | PAST_DUE | CANCELLED
  final String startedAt;
  final String nextBillingAt;
  final int visitCount;
  final double valueConsumed;
  final double totalPaid;
  final String? lastVisitAt;
  final List<SubscriptionVisit> recentVisits;

  GestorSubscriber({
    required this.id,
    required this.clientName,
    required this.clientPhone,
    required this.clientAvatar,
    required this.paymentMethod,
    required this.status,
    required this.startedAt,
    required this.nextBillingAt,
    required this.visitCount,
    required this.valueConsumed,
    required this.totalPaid,
    required this.lastVisitAt,
    required this.recentVisits,
  });

  factory GestorSubscriber.fromJson(Map<String, dynamic> json) => GestorSubscriber(
        id: json['id'],
        clientName: json['clientName'],
        clientPhone: json['clientPhone'],
        clientAvatar: json['clientAvatar'],
        paymentMethod: json['paymentMethod'],
        status: json['status'],
        startedAt: json['startedAt'],
        nextBillingAt: json['nextBillingAt'],
        visitCount: json['visitCount'] as int,
        valueConsumed: (json['valueConsumed'] as num).toDouble(),
        totalPaid: (json['totalPaid'] as num).toDouble(),
        lastVisitAt: json['lastVisitAt'],
        recentVisits: (json['recentVisits'] as List).map((e) => SubscriptionVisit.fromJson(e)).toList(),
      );
}

class GestorSubscriptionPlan {
  final String id;
  final String name;
  final String? description;
  final double price;
  final String billingCycle; // MONTHLY | QUARTERLY | ANNUAL
  final String benefits;
  final String color;
  final bool isActive;
  final List<GestorSubscriber> subscriptions;

  GestorSubscriptionPlan({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.billingCycle,
    required this.benefits,
    required this.color,
    required this.isActive,
    required this.subscriptions,
  });

  factory GestorSubscriptionPlan.fromJson(Map<String, dynamic> json) => GestorSubscriptionPlan(
        id: json['id'],
        name: json['name'],
        description: json['description'],
        price: (json['price'] as num).toDouble(),
        billingCycle: json['billingCycle'],
        benefits: json['benefits'] ?? '',
        color: json['color'] ?? '#D4AF37',
        isActive: json['isActive'] == true,
        subscriptions: (json['subscriptions'] as List).map((e) => GestorSubscriber.fromJson(e)).toList(),
      );
}

class SupportTicketSummary {
  final String id;
  final String subject;
  final String status;
  final String priority;
  final int messageCount;
  final String? lastMessage;
  final bool lastMessageIsAdmin;
  final DateTime createdAt;
  final DateTime updatedAt;

  SupportTicketSummary({
    required this.id,
    required this.subject,
    required this.status,
    required this.priority,
    required this.messageCount,
    required this.lastMessage,
    required this.lastMessageIsAdmin,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SupportTicketSummary.fromJson(Map<String, dynamic> json) => SupportTicketSummary(
        id: json['id'],
        subject: json['subject'],
        status: json['status'],
        priority: json['priority'],
        messageCount: json['messageCount'] as int,
        lastMessage: json['lastMessage'],
        lastMessageIsAdmin: json['lastMessageIsAdmin'] == true,
        createdAt: DateTime.parse(json['createdAt']),
        updatedAt: DateTime.parse(json['updatedAt']),
      );
}

class SupportTicketMessage {
  final String id;
  final String body;
  final String authorName;
  final bool isAdmin;
  final DateTime createdAt;

  SupportTicketMessage({required this.id, required this.body, required this.authorName, required this.isAdmin, required this.createdAt});

  factory SupportTicketMessage.fromJson(Map<String, dynamic> json) => SupportTicketMessage(
        id: json['id'],
        body: json['body'],
        authorName: json['authorName'],
        isAdmin: json['isAdmin'] == true,
        createdAt: DateTime.parse(json['createdAt']),
      );
}

class SupportTicketDetail {
  final String id;
  final String subject;
  final String status;
  final String priority;
  final DateTime createdAt;
  final List<SupportTicketMessage> messages;

  SupportTicketDetail({required this.id, required this.subject, required this.status, required this.priority, required this.createdAt, required this.messages});

  factory SupportTicketDetail.fromJson(Map<String, dynamic> json) => SupportTicketDetail(
        id: json['id'],
        subject: json['subject'],
        status: json['status'],
        priority: json['priority'],
        createdAt: DateTime.parse(json['createdAt']),
        messages: (json['messages'] as List).map((e) => SupportTicketMessage.fromJson(e)).toList(),
      );
}

class OnboardingStep {
  final String key;
  final String label;
  final bool done;

  OnboardingStep({required this.key, required this.label, required this.done});

  factory OnboardingStep.fromJson(Map<String, dynamic> json) => OnboardingStep(key: json['key'], label: json['label'], done: json['done'] == true);
}

class OnboardingStatus {
  final List<OnboardingStep> steps;
  final int completedCount;
  final int totalCount;
  final bool allDone;
  final bool dismissed;

  OnboardingStatus({required this.steps, required this.completedCount, required this.totalCount, required this.allDone, required this.dismissed});

  factory OnboardingStatus.fromJson(Map<String, dynamic> json) => OnboardingStatus(
        steps: (json['steps'] as List).map((e) => OnboardingStep.fromJson(e)).toList(),
        completedCount: json['completedCount'] as int,
        totalCount: json['totalCount'] as int,
        allDone: json['allDone'] == true,
        dismissed: json['dismissed'] == true,
      );
}

/// Current-month figures for the "Meta & Ponto de Equilíbrio" cockpit.
class FinanceOverview {
  final double? goal;
  final String monthLabel;
  final int daysInMonth;
  final int dayOfMonth;
  final double monthExpenses;
  final double monthRevenue;
  final List<double> dailyRevenue;

  FinanceOverview({
    required this.goal,
    required this.monthLabel,
    required this.daysInMonth,
    required this.dayOfMonth,
    required this.monthExpenses,
    required this.monthRevenue,
    required this.dailyRevenue,
  });

  factory FinanceOverview.fromJson(Map<String, dynamic> j) => FinanceOverview(
        goal: (j['goal'] as num?)?.toDouble(),
        monthLabel: j['monthLabel'] as String? ?? '',
        daysInMonth: (j['daysInMonth'] as num).toInt(),
        dayOfMonth: (j['dayOfMonth'] as num).toInt(),
        monthExpenses: (j['monthExpenses'] as num).toDouble(),
        monthRevenue: (j['monthRevenue'] as num).toDouble(),
        dailyRevenue: (j['dailyRevenue'] as List).map((e) => (e as num).toDouble()).toList(),
      );
}

class CashMethodEntry {
  final String method;
  final double amount;
  CashMethodEntry({required this.method, required this.amount});
  factory CashMethodEntry.fromJson(Map<String, dynamic> j) =>
      CashMethodEntry(method: j['method'] as String, amount: (j['amount'] as num).toDouble());
}

class CashBarberEntry {
  final String staffId;
  final String name;
  final String? avatar;
  final double revenue;
  final int count;
  final double commission;
  CashBarberEntry({required this.staffId, required this.name, required this.avatar, required this.revenue, required this.count, required this.commission});
  factory CashBarberEntry.fromJson(Map<String, dynamic> j) => CashBarberEntry(
        staffId: j['staffId'] as String,
        name: j['name'] as String,
        avatar: j['avatar'] as String?,
        revenue: (j['revenue'] as num).toDouble(),
        count: (j['count'] as num).toInt(),
        commission: (j['commission'] as num).toDouble(),
      );
}

/// The "Caixa do Dia" — everything to close the till for a given day.
class DailyCash {
  final String date;
  final double totalRevenue;
  final double serviceRevenue;
  final double manualIncome;
  final double manualExpense;
  final double net;
  final double avgTicket;
  final double totalCommission;
  final double avgDailyRevenue;
  final int appointmentCount;
  final int vsAveragePct;
  final List<CashMethodEntry> byMethod;
  final List<CashBarberEntry> byBarber;

  DailyCash({
    required this.date,
    required this.totalRevenue,
    required this.serviceRevenue,
    required this.manualIncome,
    required this.manualExpense,
    required this.net,
    required this.avgTicket,
    required this.totalCommission,
    required this.avgDailyRevenue,
    required this.appointmentCount,
    required this.vsAveragePct,
    required this.byMethod,
    required this.byBarber,
  });

  factory DailyCash.fromJson(Map<String, dynamic> j) => DailyCash(
        date: j['date'] as String,
        totalRevenue: (j['totalRevenue'] as num).toDouble(),
        serviceRevenue: (j['serviceRevenue'] as num).toDouble(),
        manualIncome: (j['manualIncome'] as num).toDouble(),
        manualExpense: (j['manualExpense'] as num).toDouble(),
        net: (j['net'] as num).toDouble(),
        avgTicket: (j['avgTicket'] as num).toDouble(),
        totalCommission: (j['totalCommission'] as num).toDouble(),
        avgDailyRevenue: (j['avgDailyRevenue'] as num).toDouble(),
        appointmentCount: (j['appointmentCount'] as num).toInt(),
        vsAveragePct: (j['vsAveragePct'] as num).toInt(),
        byMethod: (j['byMethod'] as List).map((e) => CashMethodEntry.fromJson(e as Map<String, dynamic>)).toList(),
        byBarber: (j['byBarber'] as List).map((e) => CashBarberEntry.fromJson(e as Map<String, dynamic>)).toList(),
      );
}

class ReviewItem {
  final int rating;
  final String? comment;
  final String createdAt;
  final String clientName;
  final String staffName;
  final String? serviceName;
  ReviewItem({required this.rating, this.comment, required this.createdAt, required this.clientName, required this.staffName, this.serviceName});
  factory ReviewItem.fromJson(Map<String, dynamic> j) => ReviewItem(
        rating: (j['rating'] as num).toInt(),
        comment: j['comment'] as String?,
        createdAt: j['createdAt'] as String,
        clientName: j['clientName'] as String? ?? 'Cliente',
        staffName: j['staffName'] as String? ?? 'Barbeiro',
        serviceName: j['serviceName'] as String?,
      );
}

class BarberRating {
  final String name;
  final double average;
  final int count;
  BarberRating({required this.name, required this.average, required this.count});
  factory BarberRating.fromJson(Map<String, dynamic> j) =>
      BarberRating(name: j['name'] as String, average: (j['average'] as num).toDouble(), count: (j['count'] as num).toInt());
}

class ReviewsData {
  final double average;
  final int count;
  final List<BarberRating> byBarber;
  final List<ReviewItem> reviews;
  final Map<int, int> distribution; // star (1..5) -> count
  ReviewsData({required this.average, required this.count, required this.byBarber, required this.reviews, required this.distribution});
  factory ReviewsData.fromJson(Map<String, dynamic> j) {
    final s = j['summary'] as Map<String, dynamic>;
    final dist = (s['distribution'] as Map?) ?? const {};
    return ReviewsData(
      average: (s['average'] as num).toDouble(),
      count: (s['count'] as num).toInt(),
      byBarber: (s['byBarber'] as List).map((e) => BarberRating.fromJson(e as Map<String, dynamic>)).toList(),
      reviews: (j['reviews'] as List).map((e) => ReviewItem.fromJson(e as Map<String, dynamic>)).toList(),
      distribution: {for (var k = 1; k <= 5; k++) k: ((dist['$k'] ?? dist[k] ?? 0) as num).toInt()},
    );
  }
}

class WaitlistEntry {
  final String id;
  final String clientName;
  final String clientPhone;
  final String? note;
  final String createdAt;
  WaitlistEntry({required this.id, required this.clientName, required this.clientPhone, this.note, required this.createdAt});
  factory WaitlistEntry.fromJson(Map<String, dynamic> j) => WaitlistEntry(
        id: j['id'] as String,
        clientName: j['clientName'] as String,
        clientPhone: j['clientPhone'] as String,
        note: j['note'] as String?,
        createdAt: j['createdAt'] as String,
      );
}

class BriefingCard {
  final String id;
  final String kind;
  final String icon;
  final String title;
  final String body;
  final String? actionId;
  final String? actionLabel;
  final int count;

  BriefingCard({required this.id, required this.kind, required this.icon, required this.title, required this.body, this.actionId, this.actionLabel, required this.count});

  factory BriefingCard.fromJson(Map<String, dynamic> j) => BriefingCard(
        id: j['id'] as String,
        kind: j['kind'] as String? ?? '',
        icon: j['icon'] as String? ?? '',
        title: j['title'] as String? ?? '',
        body: j['body'] as String? ?? '',
        actionId: j['action']?['id'] as String?,
        actionLabel: j['action']?['label'] as String?,
        count: j['count'] as int? ?? 0,
      );
}

class CopilotAction {
  final String id;
  final String label;
  CopilotAction({required this.id, required this.label});
  factory CopilotAction.fromJson(Map<String, dynamic> j) => CopilotAction(id: j['id'] as String, label: j['label'] as String? ?? 'Executar');
}

class CopilotReply {
  final String reply;
  final bool aiPowered;
  final String note;
  final List<String> suggestions;
  final List<CopilotAction> actions;
  /// Presente quando esta resposta executou algo reversível — vira o botão
  /// "Desfazer" logo abaixo da mensagem.
  final ({String id, String label})? undo;

  CopilotReply({required this.reply, required this.aiPowered, required this.note, required this.suggestions, required this.actions, this.undo});

  factory CopilotReply.fromJson(Map<String, dynamic> j) => CopilotReply(
        reply: j['reply'] as String? ?? '',
        aiPowered: j['aiPowered'] == true,
        note: j['note'] as String? ?? '',
        suggestions: ((j['suggestions'] as List?) ?? []).map((e) => e as String).toList(),
        undo: j['undo'] == null
            ? null
            : (id: (j['undo'] as Map<String, dynamic>)['id'] as String, label: (j['undo'] as Map<String, dynamic>)['label'] as String? ?? 'Desfazer'),
        actions: ((j['actions'] as List?) ?? []).map((e) => CopilotAction.fromJson(e as Map<String, dynamic>)).toList(),
      );
}

class NetworkUnit {
  final String id;
  final String name;
  final String? city;
  final bool isPrimary;
  final bool isCurrent;
  final double monthRevenue;
  final int appointments;
  final double avgTicket;
  final double? weekDeltaPercent;
  final int staffCount;
  final int emptySlotsToday;
  final double revenuePerBarber;

  NetworkUnit({
    required this.id,
    required this.name,
    this.city,
    required this.isPrimary,
    required this.isCurrent,
    required this.monthRevenue,
    required this.appointments,
    required this.avgTicket,
    this.weekDeltaPercent,
    required this.staffCount,
    required this.emptySlotsToday,
    required this.revenuePerBarber,
  });

  factory NetworkUnit.fromJson(Map<String, dynamic> j) => NetworkUnit(
        id: j['id'] as String,
        name: j['name'] as String? ?? '',
        city: j['city'] as String?,
        isPrimary: j['isPrimary'] == true,
        isCurrent: j['isCurrent'] == true,
        monthRevenue: (j['monthRevenue'] as num?)?.toDouble() ?? 0,
        appointments: j['appointments'] as int? ?? 0,
        avgTicket: (j['avgTicket'] as num?)?.toDouble() ?? 0,
        weekDeltaPercent: (j['weekDeltaPercent'] as num?)?.toDouble(),
        staffCount: j['staffCount'] as int? ?? 0,
        emptySlotsToday: j['emptySlotsToday'] as int? ?? 0,
        revenuePerBarber: (j['revenuePerBarber'] as num?)?.toDouble() ?? 0,
      );
}

class NetworkOverview {
  final double totalRevenue;
  final int totalAppointments;
  final double avgTicket;
  final int unitCount;
  final String? best;
  final String? mostEfficient;
  final String? leastEfficient;
  final List<NetworkUnit> units;

  NetworkOverview({
    required this.totalRevenue,
    required this.totalAppointments,
    required this.avgTicket,
    required this.unitCount,
    this.best,
    this.mostEfficient,
    this.leastEfficient,
    required this.units,
  });

  factory NetworkOverview.fromJson(Map<String, dynamic> j) {
    final t = (j['totals'] as Map<String, dynamic>?) ?? {};
    return NetworkOverview(
      totalRevenue: (t['totalRevenue'] as num?)?.toDouble() ?? 0,
      totalAppointments: t['totalAppointments'] as int? ?? 0,
      avgTicket: (t['avgTicket'] as num?)?.toDouble() ?? 0,
      unitCount: t['unitCount'] as int? ?? 0,
      best: j['best'] as String?,
      mostEfficient: j['mostEfficient'] as String?,
      leastEfficient: j['leastEfficient'] as String?,
      units: ((j['units'] as List?) ?? []).map((e) => NetworkUnit.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}

class GestorRepository {
  Future<MeLite> me() async {
    final data = await ApiClient.instance.get('/me');
    return MeLite.fromJson(data as Map<String, dynamic>);
  }

  Future<({List<BriefingCard> cards, bool locked})> copilotBriefing() async {
    final data = await ApiClient.instance.get('/copilot/briefing') as Map<String, dynamic>;
    final cards = ((data['cards'] as List?) ?? []).map((e) => BriefingCard.fromJson(e as Map<String, dynamic>)).toList();
    return (cards: cards, locked: data['locked'] == true);
  }

  Future<String> copilotAction(String action) async {
    final data = await ApiClient.instance.post('/copilot/action', data: {'action': action}) as Map<String, dynamic>;
    return data['message'] as String? ?? 'Feito.';
  }

  Future<CopilotReply> copilotChat(List<Map<String, String>> messages, {String? conversationId}) async {
    final data = await ApiClient.instance.post('/copilot/chat', data: {
      'messages': messages,
      if (conversationId != null) 'conversationId': conversationId,
    }) as Map<String, dynamic>;
    return CopilotReply.fromJson(data);
  }

  Future<({String greeting, bool aiPowered, bool locked})> copilotGreeting() async {
    final data = await ApiClient.instance.get('/copilot/greeting') as Map<String, dynamic>;
    return (greeting: data['greeting'] as String? ?? '', aiPowered: data['aiPowered'] == true, locked: data['locked'] == true);
  }

  Future<({List<({String role, String text})> messages, String? conversationId})> copilotHistory() async {
    final data = await ApiClient.instance.get('/copilot/history') as Map<String, dynamic>;
    final msgs = ((data['messages'] as List?) ?? []).map((e) {
      final m = e as Map<String, dynamic>;
      return (role: m['role'] as String? ?? 'assistant', text: m['content'] as String? ?? '');
    }).toList();
    return (messages: msgs, conversationId: data['conversationId'] as String?);
  }

  Future<DashboardSummary> dashboardSummary() async {
    final data = await ApiClient.instance.get('/dashboard/summary');
    return DashboardSummary.fromJson(data as Map<String, dynamic>);
  }

  Future<ReportsData> reports({String range = 'month'}) async {
    final data = await ApiClient.instance.get('/dashboard/reports', query: {'range': range});
    return ReportsData.fromJson(data as Map<String, dynamic>);
  }

  Future<List<GestorAppointment>> appointments(String barbershopId, {String? from, String? to, String? staffId}) async {
    final query = <String, dynamic>{'barbershopId': barbershopId};
    if (from != null) query['from'] = from;
    if (to != null) query['to'] = to;
    if (staffId != null) query['staffId'] = staffId;
    final data = await ApiClient.instance.get('/appointments', query: query) as List;
    return data.map((e) => GestorAppointment.fromJson(e)).toList();
  }

  Future<List<StaffDaySchedule>> dayScheduleFor(String dateKey) async {
    final data = await ApiClient.instance.get('/staff/day-schedule', query: {'date': dateKey}) as List;
    return data.map((e) => StaffDaySchedule.fromJson(e)).toList();
  }

  Future<GestorDaySlots> slotsFor({required String barbershopId, required String staffId, required String dateKey, required int duration}) async {
    final data = await ApiClient.instance.get('/appointments/slots', query: {
      'barbershopId': barbershopId,
      'staffId': staffId,
      'date': dateKey,
      'duration': duration.toString(),
    });
    return GestorDaySlots.fromJson(data as Map<String, dynamic>);
  }

  Future<void> createAppointment({
    required String barbershopId,
    required String staffId,
    required String serviceId,
    required String dateKey,
    required String startTime,
    required String endTime,
    required String clientName,
    required String clientPhone,
    required double totalPrice,
  }) {
    return ApiClient.instance.post('/appointments', data: {
      'barbershopId': barbershopId,
      'staffId': staffId,
      'serviceId': serviceId,
      'date': dateKey,
      'startTime': startTime,
      'endTime': endTime,
      'clientName': clientName,
      'clientPhone': clientPhone,
      'totalPrice': totalPrice,
    });
  }

  Future<List<GestorClient>> clients() async {
    final data = await ApiClient.instance.get('/clients') as List;
    return data.map((e) => GestorClient.fromJson(e)).toList();
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

  Future<void> updateClientAvatar(String id, String? avatar) async {
    await ApiClient.instance.patch('/clients/$id', data: {'avatar': avatar});
  }

  // Reatribui o agendamento a outro barbeiro (arrastar-e-soltar na agenda).
  Future<void> reassignAppointmentStaff(String appointmentId, String staffId) async {
    await ApiClient.instance.patch('/appointments/$appointmentId', data: {'staffId': staffId});
  }

  Future<List<WaitlistEntry>> waitlist() async {
    final data = await ApiClient.instance.get('/waitlist') as List;
    return data.map((e) => WaitlistEntry.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> addToWaitlist({required String clientName, required String clientPhone, String? note}) async {
    await ApiClient.instance.post('/waitlist', data: {
      'clientName': clientName,
      'clientPhone': clientPhone,
      if (note != null && note.isNotEmpty) 'note': note,
    });
  }

  Future<void> removeFromWaitlist(String id) async {
    await ApiClient.instance.delete('/waitlist/$id');
  }

  Future<ReviewsData> reviews() async {
    final data = await ApiClient.instance.get('/reviews') as Map<String, dynamic>;
    return ReviewsData.fromJson(data);
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

  Future<FinanceOverview> financeOverview() async {
    final data = await ApiClient.instance.get('/finance/overview');
    return FinanceOverview.fromJson(data as Map<String, dynamic>);
  }

  Future<void> setMonthlyGoal(double? goal) async {
    await ApiClient.instance.patch('/finance/overview', data: {'goal': goal});
  }

  Future<DailyCash> dailyCash({String? date}) async {
    final data = await ApiClient.instance.get('/finance/daily', query: date != null ? {'date': date} : null);
    return DailyCash.fromJson(data as Map<String, dynamic>);
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
    double cost = 0,
    String? image,
  }) async {
    await ApiClient.instance.post('/services', data: {
      'name': name,
      'description': description,
      'category': category,
      'duration': duration,
      'price': price,
      'cost': cost,
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
    double? cost,
    String? image,
    bool? isActive,
  }) async {
    await ApiClient.instance.patch('/services/$id', data: {
      if (name != null) 'name': name,
      if (description != null) 'description': description,
      if (category != null) 'category': category,
      if (duration != null) 'duration': duration,
      if (price != null) 'price': price,
      if (cost != null) 'cost': cost,
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

  /// Payment-provider connection status for the gestor's own shop.
  Future<({String? provider, bool connected})> paymentConnection() async {
    final data = await ApiClient.instance.get('/barbershop') as Map<String, dynamic>;
    return (provider: data['paymentProvider'] as String?, connected: data['paymentConnected'] == true);
  }

  /// Connects (or, with empty values, disconnects) a payment provider so the
  /// barbershop receives client memberships straight into its own account.
  Future<void> connectPayment({required String provider, required String apiKey}) async {
    await ApiClient.instance.patch('/barbershop', data: {'paymentProvider': provider, 'paymentApiKey': apiKey});
  }

  Future<void> updateBarbershopProfile({
    required String name,
    String? phone,
    String? email,
    String? instagram,
    String? pixKey,
    String? faqText,
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
      if (pixKey != null) 'pixKey': pixKey,
      if (faqText != null) 'faqText': faqText,
      'city': city,
      'description': description,
    });
  }

  Future<void> updateBarbershopColor(String primaryColor) async {
    await ApiClient.instance.patch('/barbershop', data: {'primaryColor': primaryColor});
  }

  Future<void> updateAutomations({String? autopilotLevel, bool? autoConfirm, bool? autoBirthday, int? autoWinbackDays, bool clearWinback = false}) async {
    await ApiClient.instance.patch('/barbershop', data: {
      if (autopilotLevel != null) 'autopilotLevel': autopilotLevel,
      if (autoConfirm != null) 'autoConfirm': autoConfirm,
      if (autoBirthday != null) 'autoBirthday': autoBirthday,
      if (clearWinback) 'autoWinbackDays': null else if (autoWinbackDays != null) 'autoWinbackDays': autoWinbackDays,
    });
  }

  Future<({double recoveredTotal, int actionsThisMonth, List<({String action, String detail, double? recoveredValue, String createdAt})> feed})> autopilotFeed() async {
    final data = await ApiClient.instance.get('/copilot/autopilot-feed') as Map<String, dynamic>;
    final feed = ((data['feed'] as List?) ?? []).map((e) {
      final m = e as Map<String, dynamic>;
      return (action: m['action'] as String? ?? '', detail: m['detail'] as String? ?? '', recoveredValue: (m['recoveredValue'] as num?)?.toDouble(), createdAt: m['createdAt'] as String? ?? '');
    }).toList();
    return (recoveredTotal: (data['recoveredTotal'] as num?)?.toDouble() ?? 0, actionsThisMonth: data['actionsThisMonth'] as int? ?? 0, feed: feed);
  }

  /// Desfaz a última ação do Copiloto. Devolve a mensagem do que voltou.
  Future<String> copilotUndo(String id) async {
    final data = await ApiClient.instance.post('/copilot/undo', data: {'id': id}) as Map<String, dynamic>;
    return data['message'] as String? ?? 'Desfeito.';
  }

  // ---- Rede de unidades ----

  /// Panorama da rede: totais + desempenho de cada unidade lado a lado.
  Future<NetworkOverview> unitsOverview() async {
    final data = await ApiClient.instance.get('/units/overview') as Map<String, dynamic>;
    return NetworkOverview.fromJson(data);
  }

  /// Troca a unidade que o app está vendo. O backend devolve um access token
  /// novo (o app autentica por Bearer, não por cookie), então ele PRECISA ser
  /// salvo — senão as próximas chamadas continuariam na unidade antiga.
  Future<void> switchUnit(String barbershopId) async {
    final data = await ApiClient.instance.post('/units/switch', data: {'barbershopId': barbershopId}) as Map<String, dynamic>;
    final token = data['accessToken'] as String?;
    if (token != null) {
      final refresh = await TokenStorage.instance.refreshToken;
      await TokenStorage.instance.save(accessToken: token, refreshToken: refresh ?? '');
    }
  }

  Future<void> createUnit({required String name, String? city}) async {
    await ApiClient.instance.post('/units', data: {
      'name': name,
      if (city != null && city.trim().isNotEmpty) 'city': city.trim(),
    });
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

  Future<List<GestorSubscriptionPlan>> subscriptionPlans() async {
    final data = await ApiClient.instance.get('/subscription-plans') as List;
    return data.map((e) => GestorSubscriptionPlan.fromJson(e)).toList();
  }

  Future<void> createSubscriptionPlan({
    required String name,
    String? description,
    required double price,
    required String billingCycle,
    required String benefits,
    required String color,
  }) async {
    await ApiClient.instance.post('/subscription-plans', data: {
      'name': name,
      'description': description,
      'price': price,
      'billingCycle': billingCycle,
      'benefits': benefits,
      'color': color,
    });
  }

  Future<void> updateSubscriptionPlan(
    String id, {
    String? name,
    String? description,
    double? price,
    String? billingCycle,
    String? benefits,
    String? color,
    bool? isActive,
  }) async {
    await ApiClient.instance.patch('/subscription-plans/$id', data: {
      if (name != null) 'name': name,
      if (description != null) 'description': description,
      if (price != null) 'price': price,
      if (billingCycle != null) 'billingCycle': billingCycle,
      if (benefits != null) 'benefits': benefits,
      if (color != null) 'color': color,
      if (isActive != null) 'isActive': isActive,
    });
  }

  Future<void> deleteSubscriptionPlan(String id) async {
    await ApiClient.instance.delete('/subscription-plans/$id');
  }

  Future<void> updateSubscriberStatus(String subscriptionId, String status) async {
    await ApiClient.instance.patch('/client-subscriptions/$subscriptionId', data: {'status': status});
  }

  Future<OnboardingStatus> onboardingStatus() async {
    final data = await ApiClient.instance.get('/onboarding');
    return OnboardingStatus.fromJson(data as Map<String, dynamic>);
  }

  Future<void> dismissOnboarding() async {
    await ApiClient.instance.patch('/onboarding', data: {'dismissed': true});
  }

  Future<GestorNotificationsResult> notifications() async {
    final data = await ApiClient.instance.get('/notifications');
    return GestorNotificationsResult.fromJson(data as Map<String, dynamic>);
  }

  Future<void> markAllNotificationsRead() async {
    await ApiClient.instance.post('/notifications/read-all');
  }

  Future<List<GestorAnnouncement>> activeAnnouncements() async {
    final data = await ApiClient.instance.get('/announcements/active') as List;
    return data.map((e) => GestorAnnouncement.fromJson(e)).toList();
  }

  Future<void> dismissAnnouncement(String id) async {
    await ApiClient.instance.post('/announcements/$id/dismiss');
  }

  Future<bool> npsShouldPrompt() async {
    final data = await ApiClient.instance.get('/nps');
    return data['shouldPrompt'] as bool;
  }

  Future<void> submitNps({required int score, String? comment}) async {
    await ApiClient.instance.post('/nps', data: {
      'score': score,
      if (comment != null && comment.isNotEmpty) 'comment': comment,
    });
  }

  Future<List<SupportTicketSummary>> supportTickets() async {
    final data = await ApiClient.instance.get('/support/tickets') as List;
    return data.map((e) => SupportTicketSummary.fromJson(e)).toList();
  }

  Future<SupportTicketDetail> supportTicketDetail(String id) async {
    final data = await ApiClient.instance.get('/support/tickets/$id');
    return SupportTicketDetail.fromJson(data as Map<String, dynamic>);
  }

  Future<void> createSupportTicket({required String subject, required String body, String priority = 'NORMAL'}) async {
    await ApiClient.instance.post('/support/tickets', data: {'subject': subject, 'body': body, 'priority': priority});
  }

  Future<void> replySupportTicket(String id, String body) async {
    await ApiClient.instance.post('/support/tickets/$id', data: {'body': body});
  }

  Future<void> closeSupportTicket(String id) async {
    await ApiClient.instance.patch('/support/tickets/$id', data: {'status': 'CLOSED'});
  }
}
