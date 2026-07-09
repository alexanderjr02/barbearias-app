import 'package:flutter/material.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/cortix_theme.dart';
import '../gestor_repository.dart';

const dayNamesShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const monthNamesShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/// Step widgets shared by the gestor's and the barbeiro's own "Novo
/// agendamento" wizards — the only difference between the two flows is
/// whether a staff-picking step is shown at all (the barbeiro's is always
/// himself), everything else (service, date/time, client, confirmation) is
/// identical UI and behavior.
class ServiceStep extends StatelessWidget {
  final List<GestorService> services;
  final GestorService? selected;
  final ValueChanged<GestorService> onSelect;
  final AppPalette palette;
  final Color accent;

  const ServiceStep({super.key, required this.services, required this.selected, required this.onSelect, required this.palette, required this.accent});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Escolha o serviço', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 14),
        if (services.isEmpty) Text('Nenhum serviço ativo cadastrado.', style: TextStyle(color: palette.textFaint)),
        ...services.map((s) {
          final isSelected = selected?.id == s.id;
          return RiseIn(
            child: GestureDetector(
              onTap: () => onSelect(s),
              child: Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: palette.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: isSelected ? accent.withValues(alpha: 0.6) : Colors.transparent, width: 1.5),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(s.name, style: TextStyle(color: isSelected ? accent : palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                          Text('${s.duration} min', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                        ],
                      ),
                    ),
                    Text('R\$ ${s.price.toStringAsFixed(2)}', style: TextStyle(color: palette.textSecondary, fontWeight: FontWeight.bold, fontSize: 13.5)),
                  ],
                ),
              ),
            ),
          );
        }),
      ],
    );
  }
}

class StaffStep extends StatelessWidget {
  final List<GestorStaff> staffList;
  final GestorStaff? selected;
  final ValueChanged<GestorStaff> onSelect;
  final AppPalette palette;
  final Color accent;
  final Color onAccent;
  final String Function(String) initials;

  const StaffStep({
    super.key,
    required this.staffList,
    required this.selected,
    required this.onSelect,
    required this.palette,
    required this.accent,
    required this.onAccent,
    required this.initials,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Escolha o barbeiro', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 14),
        if (staffList.isEmpty) Text('Nenhum barbeiro ativo cadastrado.', style: TextStyle(color: palette.textFaint)),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.15,
          children: staffList.map((s) {
            final isSelected = selected?.id == s.id;
            final url = resolveAssetUrl(s.avatar);
            return GestureDetector(
              onTap: () => onSelect(s),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                decoration: BoxDecoration(
                  color: palette.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isSelected ? accent : Colors.transparent, width: 2),
                ),
                padding: const EdgeInsets.all(12),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircleAvatar(
                      radius: 26,
                      backgroundColor: isSelected ? accent : palette.surfaceAlt,
                      backgroundImage: url != null ? NetworkImage(url) : null,
                      child: url == null ? Text(initials(s.name), style: TextStyle(color: isSelected ? onAccent : palette.textSecondary, fontWeight: FontWeight.bold)) : null,
                    ),
                    const SizedBox(height: 8),
                    Text(s.name, style: TextStyle(color: isSelected ? accent : palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 12.5), textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

class DateTimeStep extends StatelessWidget {
  final DateTime? date;
  final String? time;
  final GestorDaySlots? daySlots;
  final bool loadingSlots;
  final VoidCallback onPickDate;
  final ValueChanged<String> onPickTime;
  final AppPalette palette;
  final Color accent;
  final Color onAccent;

  const DateTimeStep({
    super.key,
    required this.date,
    required this.time,
    required this.daySlots,
    required this.loadingSlots,
    required this.onPickDate,
    required this.onPickTime,
    required this.palette,
    required this.accent,
    required this.onAccent,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Data', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 10),
        GestureDetector(
          onTap: onPickDate,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(12)),
            child: Row(
              children: [
                Icon(Icons.calendar_today_outlined, size: 18, color: palette.textSecondary),
                const SizedBox(width: 10),
                Text(
                  date == null ? 'Escolher data' : '${dayNamesShort[date!.weekday % 7]}, ${date!.day} ${monthNamesShort[date!.month - 1]}',
                  style: TextStyle(color: date == null ? palette.textFaint : palette.textPrimary, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 22),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Horário', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
            if (daySlots?.isOpen == true && daySlots?.openTime != null)
              Text('${daySlots!.openTime} às ${daySlots!.closeTime}', style: TextStyle(color: palette.textFaint, fontSize: 12)),
          ],
        ),
        const SizedBox(height: 10),
        if (date == null)
          Text('Escolha uma data para ver os horários.', style: TextStyle(color: palette.textFaint))
        else if (loadingSlots)
          Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: accent)))
        else if (daySlots == null)
          const SizedBox.shrink()
        else if (!daySlots!.isOpen)
          Text(daySlots!.source == 'blocked' ? 'Você está de folga nesse dia.' : 'Fechado nesse dia.', style: TextStyle(color: palette.textFaint))
        else if (daySlots!.slots.isEmpty)
          Text('Nenhum horário disponível nesse dia.', style: TextStyle(color: palette.textFaint))
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: daySlots!.slots.map((slot) {
              final isSelected = time == slot.time;
              final disabled = !slot.isAvailable;
              return GestureDetector(
                onTap: disabled ? null : () => onPickTime(slot.time),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                  decoration: BoxDecoration(
                    color: disabled ? palette.surfaceAlt.withValues(alpha: 0.5) : (isSelected ? accent : palette.surfaceAlt),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    slot.time,
                    style: TextStyle(
                      color: disabled ? palette.textFaint : (isSelected ? onAccent : palette.textSecondary),
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      decoration: disabled ? TextDecoration.lineThrough : null,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
      ],
    );
  }
}

class ClientStep extends StatelessWidget {
  final TextEditingController nameController;
  final TextEditingController phoneController;
  final GestorService service;
  final GestorStaff staff;
  final DateTime date;
  final String time;
  final String? error;
  final VoidCallback onChanged;
  final AppPalette palette;
  final Color accent;

  const ClientStep({
    super.key,
    required this.nameController,
    required this.phoneController,
    required this.service,
    required this.staff,
    required this.date,
    required this.time,
    required this.error,
    required this.onChanged,
    required this.palette,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Dados do cliente', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 14),
        Text('Nome completo', style: TextStyle(color: palette.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        TextField(
          controller: nameController,
          onChanged: (_) => onChanged(),
          style: TextStyle(color: palette.textPrimary),
          decoration: InputDecoration(
            hintText: 'Ex: Lucas Mendes',
            filled: true,
            fillColor: palette.surfaceAlt,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          ),
        ),
        const SizedBox(height: 14),
        Text('WhatsApp', style: TextStyle(color: palette.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        TextField(
          controller: phoneController,
          onChanged: (_) => onChanged(),
          keyboardType: TextInputType.phone,
          style: TextStyle(color: palette.textPrimary),
          decoration: InputDecoration(
            hintText: '(11) 99999-9999',
            filled: true,
            fillColor: palette.surfaceAlt,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          ),
        ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: palette.surfaceAlt.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(12)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Resumo', style: TextStyle(color: palette.textFaint, fontSize: 11, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              SummaryRow(label: 'Serviço', value: service.name, palette: palette),
              SummaryRow(label: 'Barbeiro', value: staff.name, palette: palette),
              SummaryRow(label: 'Data', value: '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')} às $time', palette: palette),
              Divider(color: palette.border, height: 18),
              SummaryRow(label: 'Total', value: 'R\$ ${service.price.toStringAsFixed(2)}', palette: palette, emphasize: true, accent: accent),
            ],
          ),
        ),
        if (error != null) ...[
          const SizedBox(height: 12),
          Text(error!, style: const TextStyle(color: Colors.redAccent, fontSize: 12.5)),
        ],
      ],
    );
  }
}

class SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final AppPalette palette;
  final bool emphasize;
  final Color? accent;

  const SummaryRow({super.key, required this.label, required this.value, required this.palette, this.emphasize = false, this.accent});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: palette.textFaint, fontSize: 12.5)),
          Text(value, style: TextStyle(color: emphasize ? accent : palette.textPrimary, fontWeight: emphasize ? FontWeight.bold : FontWeight.w600, fontSize: emphasize ? 14 : 12.5)),
        ],
      ),
    );
  }
}

class AppointmentDoneView extends StatelessWidget {
  final GestorService service;
  final GestorStaff staff;
  final DateTime date;
  final String time;
  final String clientName;
  final VoidCallback onClose;

  const AppointmentDoneView({super.key, required this.service, required this.staff, required this.date, required this.time, required this.clientName, required this.onClose});

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(color: const Color(0xFF34D399).withValues(alpha: 0.12), shape: BoxShape.circle),
              child: const Icon(Icons.check_circle, color: Color(0xFF34D399), size: 40),
            ),
            const SizedBox(height: 18),
            Text('Agendamento criado!', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 19)),
            const SizedBox(height: 8),
            Text('Já aparece na sua agenda.', style: TextStyle(color: palette.textFaint), textAlign: TextAlign.center),
            const SizedBox(height: 20),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
              child: Column(
                children: [
                  SummaryRow(label: 'Cliente', value: clientName, palette: palette),
                  SummaryRow(label: 'Serviço', value: service.name, palette: palette),
                  SummaryRow(label: 'Barbeiro', value: staff.name, palette: palette),
                  SummaryRow(label: 'Data e hora', value: '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')} às $time', palette: palette),
                ],
              ),
            ),
            const SizedBox(height: 22),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onClose,
                style: ElevatedButton.styleFrom(backgroundColor: accent, padding: const EdgeInsets.symmetric(vertical: 14)),
                child: Text('Fechar', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
