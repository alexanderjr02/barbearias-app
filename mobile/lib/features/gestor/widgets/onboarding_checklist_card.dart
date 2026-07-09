import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../gestor_repository.dart';

/// "Primeiros passos" card — mirrors the web Dashboard's OnboardingChecklist,
/// same 4 signals from /api/onboarding (has staff, has services, 1st
/// appointment, 1st completed). Hidden once all steps are done or dismissed.
class OnboardingChecklistCard extends StatefulWidget {
  const OnboardingChecklistCard({super.key});

  @override
  State<OnboardingChecklistCard> createState() => _OnboardingChecklistCardState();
}

class _OnboardingChecklistCardState extends State<OnboardingChecklistCard> {
  final _repository = GestorRepository();
  OnboardingStatus? _status;
  bool _dismissedLocally = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final status = await _repository.onboardingStatus();
      if (mounted) setState(() => _status = status);
    } catch (_) {
      // Non-critical — the card simply doesn't show if this fails.
    }
  }

  Future<void> _dismiss() async {
    setState(() => _dismissedLocally = true);
    await _repository.dismissOnboarding();
  }

  @override
  Widget build(BuildContext context) {
    final status = _status;
    if (status == null || status.dismissed || status.allDone || _dismissedLocally) return const SizedBox.shrink();

    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    final pct = status.completedCount / status.totalCount;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [accent.withValues(alpha: 0.14), palette.surface]),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accent.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.rocket_launch_rounded, size: 16, color: accent),
              const SizedBox(width: 8),
              Expanded(child: Text('Primeiros passos', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 14))),
              GestureDetector(
                onTap: _dismiss,
                child: Icon(Icons.close, size: 16, color: palette.textFaint),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(value: pct, minHeight: 5, backgroundColor: palette.surfaceAlt, valueColor: AlwaysStoppedAnimation(accent)),
          ),
          const SizedBox(height: 12),
          ...status.steps.map((s) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Icon(s.done ? Icons.check_circle_rounded : Icons.circle_outlined, size: 15, color: s.done ? const Color(0xFF34D399) : palette.textFaint),
                    const SizedBox(width: 8),
                    Text(
                      s.label,
                      style: TextStyle(
                        color: s.done ? palette.textFaint : palette.textSecondary,
                        fontSize: 12.5,
                        decoration: s.done ? TextDecoration.lineThrough : null,
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}
