// Shared shapes for the two "bell" concepts used by every role's app:
// platform Avisos (gestor/barbeiro only, from /announcements/active) and the
// personal Notification feed (/notifications for gestor+barbeiro,
// /client/notifications for cliente — same JSON shape, different scope).

class GestorAnnouncement {
  final String id;
  final String title;
  final String body;
  final DateTime createdAt;

  GestorAnnouncement({required this.id, required this.title, required this.body, required this.createdAt});

  factory GestorAnnouncement.fromJson(Map<String, dynamic> json) => GestorAnnouncement(
        id: json['id'],
        title: json['title'],
        body: json['body'],
        createdAt: DateTime.parse(json['createdAt']),
      );
}

class GestorNotification {
  final String id;
  final String type;
  final String title;
  final String body;
  final String? link;
  final bool read;
  final DateTime createdAt;

  GestorNotification({required this.id, required this.type, required this.title, required this.body, required this.link, required this.read, required this.createdAt});

  factory GestorNotification.fromJson(Map<String, dynamic> json) => GestorNotification(
        id: json['id'],
        type: json['type'],
        title: json['title'],
        body: json['body'],
        link: json['link'],
        read: json['read'] == true,
        createdAt: DateTime.parse(json['createdAt']),
      );
}

class GestorNotificationsResult {
  final List<GestorNotification> notifications;
  final int unreadCount;

  GestorNotificationsResult({required this.notifications, required this.unreadCount});

  factory GestorNotificationsResult.fromJson(Map<String, dynamic> json) => GestorNotificationsResult(
        notifications: (json['notifications'] as List).map((e) => GestorNotification.fromJson(e)).toList(),
        unreadCount: json['unreadCount'] as int,
      );
}
