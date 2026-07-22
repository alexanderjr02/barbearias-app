import { z } from "zod";
import { isValidCnpj, isValidCpf, onlyDigits } from "./br";

// Accepts formatted ("(11) 99999-9999") or plain-digit Brazilian phone
// numbers — landline (10 digits) or mobile (11 digits), area code required.
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 10 || v.length === 11, {
    message: "Telefone inválido — use DDD + número",
  });

export const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v.replace(/\D/g, "") : v))
  .refine((v) => !v || v.length === 10 || v.length === 11, {
    message: "Telefone inválido — use DDD + número",
  });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("E-mail inválido");

// At least 8 chars, at least one letter and one number — enough friction to
// discourage "12345678" without demanding a symbol nobody remembers.
export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), {
    message: "A senha deve ter letras e números",
  });

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Nome muito curto")
  .max(120, "Nome muito longo");

// Becomes part of the public booking URL — lowercase letters, numbers and
// hyphens only, can't start/end with a hyphen.
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Link precisa ter pelo menos 3 caracteres")
  .max(60, "Link muito longo")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífen");

/**
 * CNPJ obrigatório e REAL (dígitos verificadores conferidos).
 *
 * Antes era opcional e só checava o tamanho, então "00000000000000" — ou
 * nada — abria barbearia. Isso é a porta da barbearia fantasma: sem documento
 * verificável não há como distinguir negócio de cadastro descartável.
 * Guardamos só os dígitos, para busca e unicidade não dependerem de quem
 * digitou com ponto e quem digitou sem.
 */
export const cnpjSchema = z
  .string({ error: "CNPJ é obrigatório" })
  .trim()
  .min(1, "CNPJ é obrigatório")
  .transform((v) => onlyDigits(v))
  .refine((v) => v.length === 14, { message: "CNPJ inválido — deve ter 14 dígitos" })
  .refine((v) => isValidCnpj(v), { message: "CNPJ inválido — confira os números" });

// Brazilian state — the two-letter UF code. Optional at signup, but must be
// a real UF when present.
const BR_UF = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const optionalStateSchema = z
  .string()
  .trim()
  .toUpperCase()
  .optional()
  .refine((v) => !v || (BR_UF as readonly string[]).includes(v), { message: "UF inválida" });

// CEP — 8 digits when present.
export const optionalCepSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v.replace(/\D/g, "") : v))
  .refine((v) => !v || v.length === 8, { message: "CEP inválido — deve ter 8 dígitos" });

// Instagram handle — stored without the leading "@".
export const optionalInstagramSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v.replace(/^@+/, "").trim() : v))
  .refine((v) => !v || /^[a-zA-Z0-9._]{1,30}$/.test(v), { message: "@ do Instagram inválido" });

/** Vínculo do barbeiro com a barbearia — decide encargo e forma de pagamento. */
export const EMPLOYMENT_TYPES = ["CLT", "PJ", "AUTONOMO", "PARCEIRO"] as const;

/**
 * CPF opcional, mas se vier tem que ser real. Guardamos só os dígitos para a
 * busca não depender de quem digitou com ponto e quem digitou sem.
 */
export const cpfSchema = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? onlyDigits(v) : undefined))
  .refine((v) => v === undefined || isValidCpf(v), { message: "CPF inválido" });

const MIN_CLIENT_AGE = 13;
const MAX_AGE = 120;

// "YYYY-MM-DD" (native <input type="date"> format) — must be a real past
// date and imply an age between MIN_CLIENT_AGE and MAX_AGE.
export const dateOfBirthSchema = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: "Data de nascimento inválida" })
  .refine(
    (v) => {
      const date = new Date(v);
      const age = ageFromDate(date);
      return age >= MIN_CLIENT_AGE && age <= MAX_AGE;
    },
    { message: `É preciso ter entre ${MIN_CLIENT_AGE} e ${MAX_AGE} anos` }
  );

export const optionalDateOfBirthSchema = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || !Number.isNaN(new Date(v).getTime()), { message: "Data de nascimento inválida" })
  .refine(
    (v) => {
      if (!v) return true;
      const age = ageFromDate(new Date(v));
      return age >= MIN_CLIENT_AGE && age <= MAX_AGE;
    },
    { message: `É preciso ter entre ${MIN_CLIENT_AGE} e ${MAX_AGE} anos` }
  );

function ageFromDate(date: Date): number {
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) age--;
  return age;
}

// POST /api/auth/register — owner creating their account + barbershop in one
// step. Barbershop fields are mandatory: this route only ever creates an
// OWNER, and an ownerless account serves no purpose in this app.
export const registerOwnerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  // Obrigatório: conta de dono sem telefone é conta sem ninguém atrás dela.
  phone: phoneSchema,
  barbershopName: nameSchema,
  barbershopSlug: slugSchema,
  city: z.string().trim().min(1, "Cidade é obrigatória"),
  state: optionalStateSchema,
  address: z.string().trim().max(160, "Endereço muito longo").optional(),
  zipCode: optionalCepSchema,
  whatsapp: optionalPhoneSchema,
  instagram: optionalInstagramSchema,
  cnpj: cnpjSchema,
  plan: z.string().optional(),
});

// POST /api/auth/register/client — client self-signup. Not tied to a
// barbershop at creation time (that happens via BarbershopClient once they
// book/interact with a specific shop).
export const registerClientSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  dateOfBirth: dateOfBirthSchema,
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(20, "Token do Google ausente ou inválido"),
});

// POST /api/auth/forgot-password — request a reset link by e-mail.
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// POST /api/auth/reset-password — set a new password using the emailed token.
export const resetPasswordSchema = z.object({
  token: z.string().min(20, "Token de redefinição inválido"),
  password: passwordSchema,
});

// POST /api/clients — gestor pre-registering a client from the dashboard.
export const clientCreateSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: optionalPhoneSchema,
  dateOfBirth: optionalDateOfBirthSchema,
  cpf: cpfSchema,
  neighborhood: z.string().trim().max(80).optional(),
  profession: z.string().trim().max(80).optional(),
  instagram: optionalInstagramSchema,
  howFoundUs: z.string().trim().max(60).optional(),
  preferredStaffId: z.string().optional(),
});

// POST /api/staff — email/password are optional (profile-only staff has
// neither), but must be valid *when present*.
export const staffCreateSchema = z.object({
  name: nameSchema,
  role: z.string().optional(),
  specialties: z.string().optional(),
  avatar: z.string().optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  cpf: cpfSchema,
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  hireDate: z.string().optional(),
  pixKey: z.string().max(140).optional(),
});

export function firstFieldError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos";
}
