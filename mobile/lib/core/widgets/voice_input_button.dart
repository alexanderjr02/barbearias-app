import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'app_toast.dart';

/// A microphone button that dictates speech straight into a text field using
/// the device/browser's built-in speech recognition — no external provider or
/// extra API key. Degrades gracefully where speech isn't available (some
/// browsers). Fills [controller] live as you speak; tap again to stop.
class VoiceInputButton extends StatefulWidget {
  final TextEditingController controller;
  final Color color;
  final double size;
  const VoiceInputButton({super.key, required this.controller, required this.color, this.size = 22});

  @override
  State<VoiceInputButton> createState() => _VoiceInputButtonState();
}

class _VoiceInputButtonState extends State<VoiceInputButton> {
  final SpeechToText _speech = SpeechToText();
  bool _initialized = false;
  bool _listening = false;

  @override
  void dispose() {
    _speech.stop();
    super.dispose();
  }

  Future<void> _toggle() async {
    if (_listening) {
      await _speech.stop();
      if (mounted) setState(() => _listening = false);
      return;
    }
    if (!_initialized) {
      _initialized = await _speech.initialize(
        onStatus: (s) {
          if ((s == 'done' || s == 'notListening') && mounted) setState(() => _listening = false);
        },
        onError: (_) {
          if (mounted) setState(() => _listening = false);
        },
      );
    }
    if (!_initialized) {
      if (mounted) AppToast.error(context, 'Seu dispositivo não suporta ditado por voz aqui.');
      return;
    }
    setState(() => _listening = true);
    await _speech.listen(
      listenOptions: SpeechListenOptions(localeId: 'pt_BR', partialResults: true, cancelOnError: true, listenMode: ListenMode.dictation),
      onResult: (r) {
        final words = r.recognizedWords;
        widget.controller.text = words;
        widget.controller.selection = TextSelection.collapsed(offset: words.length);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _toggle,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: _listening ? Colors.redAccent.withValues(alpha: 0.18) : Colors.transparent,
          shape: BoxShape.circle,
        ),
        child: Icon(
          _listening ? Icons.mic : Icons.mic_none_rounded,
          color: _listening ? Colors.redAccent : widget.color,
          size: widget.size,
        ),
      ),
    );
  }
}
