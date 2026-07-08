import '../../core/api/api_client.dart';

class ClientBarbershop {
  final String id;
  final String name;
  final String slug;
  final String primaryColor;

  ClientBarbershop({required this.id, required this.name, required this.slug, required this.primaryColor});

  factory ClientBarbershop.fromJson(Map<String, dynamic> json) => ClientBarbershop(
        id: json['id'],
        name: json['name'],
        slug: json['slug'],
        primaryColor: json['primaryColor'] ?? '#D4AF37',
      );
}

class ServiceOption {
  final String id;
  final String name;
  final String? description;
  final String? image;
  final int duration;
  final double price;

  ServiceOption({required this.id, required this.name, this.description, this.image, required this.duration, required this.price});

  factory ServiceOption.fromJson(Map<String, dynamic> json) => ServiceOption(
        id: json['id'],
        name: json['name'],
        description: json['description'],
        image: json['image'],
        duration: json['duration'],
        price: (json['price'] as num).toDouble(),
      );
}

class StaffOption {
  final String id;
  final String name;
  final String? avatar;
  final String? specialties;

  StaffOption({required this.id, required this.name, this.avatar, this.specialties});

  factory StaffOption.fromJson(Map<String, dynamic> json) => StaffOption(
        id: json['id'],
        name: json['name'],
        avatar: json['avatar'],
        specialties: json['specialties'],
      );
}

class WorkingHourEntry {
  final int dayOfWeek;
  final bool isOpen;
  final String openTime;
  final String closeTime;

  WorkingHourEntry({required this.dayOfWeek, required this.isOpen, required this.openTime, required this.closeTime});

  factory WorkingHourEntry.fromJson(Map<String, dynamic> json) => WorkingHourEntry(
        dayOfWeek: json['dayOfWeek'],
        isOpen: json['isOpen'],
        openTime: json['openTime'],
        closeTime: json['closeTime'],
      );
}

class BarbershopDetail {
  final String id;
  final String name;
  final String slug;
  final String? logo;
  final String? coverImage;
  final String primaryColor;
  final List<ServiceOption> services;
  final List<StaffOption> staff;
  final List<WorkingHourEntry> workingHours;

  BarbershopDetail({
    required this.id,
    required this.name,
    required this.slug,
    this.logo,
    this.coverImage,
    required this.primaryColor,
    required this.services,
    required this.staff,
    required this.workingHours,
  });

  factory BarbershopDetail.fromJson(Map<String, dynamic> json) => BarbershopDetail(
        id: json['id'],
        name: json['name'],
        slug: json['slug'],
        logo: json['logo'],
        coverImage: json['coverImage'],
        primaryColor: json['primaryColor'] ?? '#D4AF37',
        services: (json['services'] as List).map((e) => ServiceOption.fromJson(e)).toList(),
        staff: (json['staff'] as List).map((e) => StaffOption.fromJson(e)).toList(),
        workingHours: (json['workingHours'] as List).map((e) => WorkingHourEntry.fromJson(e)).toList(),
      );
}

class BookingRepository {
  Future<List<ClientBarbershop>> myBarbershops() async {
    final data = await ApiClient.instance.get('/client/barbershops') as List;
    return data.map((e) => ClientBarbershop.fromJson(e)).toList();
  }

  Future<BarbershopDetail> barbershopDetail(String slug) async {
    final data = await ApiClient.instance.get('/barbershop', query: {'slug': slug});
    return BarbershopDetail.fromJson(data);
  }

  Future<void> createAppointment({
    required String barbershopId,
    required String staffId,
    required String serviceId,
    required DateTime date,
    required String startTime,
    required String clientName,
    required String clientPhone,
    required double totalPrice,
  }) {
    final dateStr = '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    return ApiClient.instance.post('/appointments', data: {
      'barbershopId': barbershopId,
      'staffId': staffId,
      'serviceId': serviceId,
      'date': dateStr,
      'startTime': startTime,
      'clientName': clientName,
      'clientPhone': clientPhone,
      'totalPrice': totalPrice,
    });
  }
}
