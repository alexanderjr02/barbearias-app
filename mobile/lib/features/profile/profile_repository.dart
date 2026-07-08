import 'package:dio/dio.dart' as dio;
import 'package:image_picker/image_picker.dart';
import '../../core/api/api_client.dart';

class ProfileRepository {
  Future<Map<String, dynamic>> updateProfile({String? name, String? phone, String? avatar}) async {
    final data = <String, dynamic>{};
    if (name != null) data['name'] = name;
    if (phone != null) data['phone'] = phone;
    if (avatar != null) data['avatar'] = avatar;
    final result = await ApiClient.instance.patch('/me', data: data);
    return result as Map<String, dynamic>;
  }

  Future<String> uploadAvatar(XFile file) async {
    final bytes = await file.readAsBytes();
    final formData = dio.FormData.fromMap({
      'file': dio.MultipartFile.fromBytes(bytes, filename: file.name),
    });
    final result = await ApiClient.instance.post('/upload', data: formData);
    return result['url'] as String;
  }
}
