/// Simple keyword-matched assistant, mirroring the same pattern used by the
/// web landing chatbot — no external AI call, just a curated set of answers
/// tuned for a client who's already inside the app (booking, points, promos).
class ChatbotResponse {
  final List<String> keywords;
  final String answer;
  const ChatbotResponse(this.keywords, this.answer);
}

const List<ChatbotResponse> chatbotResponses = [
  ChatbotResponse(
    ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem'],
    'Olá! 👋 Posso te ajudar a marcar um horário, ver seus pontos ou tirar dúvidas rápidas. O que você precisa?',
  ),
  ChatbotResponse(
    ['marcar', 'agendar', 'agendamento', 'horário', 'horario', 'reservar'],
    'Pra marcar um horário, toque no botão "Agendar" na tela inicial — você escolhe o serviço, o barbeiro e o horário em menos de um minuto.',
  ),
  ChatbotResponse(
    ['cancelar', 'remarcar', 'desmarcar', 'trocar horário', 'trocar horario'],
    'Você pode cancelar ou remarcar direto no card do seu próximo agendamento, na tela inicial. É só tocar em "Cancelar" ou "Remarcar".',
  ),
  ChatbotResponse(
    ['ponto', 'pontos', 'fidelidade', 'nível', 'nivel', 'ouro', 'prata', 'bronze'],
    'Seus pontos aparecem na tela inicial. Você ganha pontos automaticamente sempre que um atendimento é concluído — quanto mais você visita, mais alto seu nível (Bronze → Prata → Ouro), com descontos crescentes.',
  ),
  ChatbotResponse(
    ['avaliar', 'avaliação', 'avaliacao', 'nota', 'estrela'],
    'Depois que um atendimento é concluído, aparece um botão "Avaliar" no seu histórico — dá pra dar de 1 a 5 estrelas e deixar um comentário pro barbeiro.',
  ),
  ChatbotResponse(
    ['promoção', 'promocao', 'desconto', 'oferta', 'cupom'],
    'As promoções da sua barbearia aparecem por aqui e também contam pontos em dobro em alguns períodos — fique de olho na sua tela inicial!',
  ),
  ChatbotResponse(
    ['perfil', 'foto', 'telefone', 'editar', 'nome'],
    'Pra editar seu nome, telefone ou foto, toque na aba "Perfil" — dá pra trocar a qualquer momento.',
  ),
  ChatbotResponse(
    ['obrigado', 'obrigada', 'valeu', 'ok', 'blz'],
    'Disponha! Qualquer coisa é só chamar por aqui. ✂️',
  ),
];

const String chatbotDefaultResponse =
    'Ainda não sei responder isso direito 🙏 Mas posso ajudar com: marcar horário, cancelar/remarcar, pontos de fidelidade e avaliações.';

const List<String> chatbotQuickReplies = [
  'Como marcar um horário?',
  'Como funcionam os pontos?',
  'Quero cancelar',
];

String? matchChatbotResponse(String text) {
  final lower = text.toLowerCase();
  for (final r in chatbotResponses) {
    if (r.keywords.any((k) => lower.contains(k))) return r.answer;
  }
  return null;
}
