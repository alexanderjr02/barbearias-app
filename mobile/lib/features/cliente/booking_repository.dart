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

/// One candidate appointment time, tagged with why it either is or isn't
/// bookable — mirrors GET /appointments/slots on the backend, which is the
/// single source of truth for working hours, staff days off, and
/// already-booked times (no more computing this client-side).
class AppointmentSlot {
  final String time;
  final String status; // available | past | booked

  AppointmentSlot({required this.time, required this.status});

  factory AppointmentSlot.fromJson(Map<String, dynamic> json) => AppointmentSlot(time: json['time'], status: json['status']);

  bool get isAvailable => status == 'available';
}

class DaySlots {
  final bool isOpen;
  final String? openTime;
  final String? closeTime;
  final String source; // blocked | staff | shop
  final List<AppointmentSlot> slots;

  DaySlots({required this.isOpen, this.openTime, this.closeTime, required this.source, required this.slots});

  factory DaySlots.fromJson(Map<String, dynamic> json) => DaySlots(
        isOpen: json['isOpen'] as bool,
        openTime: json['openTime'] as String?,
        closeTime: json['closeTime'] as String?,
        source: json['source'] as String,
        slots: (json['slots'] as List).map((e) => AppointmentSlot.fromJson(e)).toList(),
      );
}

String _dateKey(DateTime date) =>
    '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

String _addMinutes(String time, int minutes) {
  final parts = time.split(':').map(int.parse).toList();
  final total = parts[0] * 60 + parts[1] + minutes;
  final h = (total ~/ 60) % 24;
  final m = total % 60;
  return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
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

  Future<DaySlots> fetchSlots({
    required String barbershopId,
    required String staffId,
    required DateTime date,
    required int duration,
  }) async {
    final data = await ApiClient.instance.get('/appointments/slots', query: {
      'barbershopId': barbershopId,
      'staffId': staffId,
      'date': _dateKey(date),
      'duration': duration.toString(),
    });
    return DaySlots.fromJson(data);
  }

  Future<void> joinWaitlist(String barbershopId) async {
    await ApiClient.instance.post('/client/waitlist', data: {'barbershopId': barbershopId});
  }

  Future<void> createAppointment({
    required String barbershopId,
    required String staffId,
    required String serviceId,
    required DateTime date,
    required String startTime,
    required int durationMinutes,
    required String clientName,
    required String clientPhone,
    required double totalPrice,
    String? referencePhoto,
  }) {
    return ApiClient.instance.post('/appointments', data: {
      'barbershopId': barbershopId,
      'staffId': staffId,
      'serviceId': serviceId,
      'date': _dateKey(date),
      'startTime': startTime,
      'endTime': _addMinutes(startTime, durationMinutes),
      'clientName': clientName,
      'clientPhone': clientPhone,
      'totalPrice': totalPrice,
      if (referencePhoto != null && referencePhoto.isNotEmpty) 'referencePhoto': referencePhoto,
    });
  }
}
