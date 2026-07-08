class Session {
  final String id;
  final String name;
  final String email;
  final String role; // SUPER_ADMIN | OWNER | MANAGER | BARBER | CLIENT
  final String? barbershopId;
  final String? staffId;
  final String? phone;
  final String? avatar;

  Session({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.barbershopId,
    required this.staffId,
    this.phone,
    this.avatar,
  });

  factory Session.fromJson(Map<String, dynamic> json) => Session(
        id: json['id'],
        name: json['name'],
        email: json['email'],
        role: json['role'],
        barbershopId: json['barbershopId'],
        staffId: json['staffId'],
        phone: json['phone'],
        avatar: json['avatar'],
      );

  Session copyWith({String? name, String? phone, String? avatar}) => Session(
        id: id,
        name: name ?? this.name,
        email: email,
        role: role,
        barbershopId: barbershopId,
        staffId: staffId,
        phone: phone ?? this.phone,
        avatar: avatar ?? this.avatar,
      );

  bool get isBarber => role == 'BARBER';
  bool get isClient => role == 'CLIENT';
  bool get isManager => role == 'OWNER' || role == 'MANAGER';
}
