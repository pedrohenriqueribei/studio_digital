import { Client } from '../types';
import { unmask } from './masks';

/**
 * Normaliza um número de telefone para apenas os dígitos essenciais (DDD + número).
 * Remove o código do país '55' caso presente com 12 ou 13 dígitos.
 */
export function normalizePhoneForComparison(phone: string | undefined | null): string {
  const digits = unmask(phone);
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits.slice(2);
  }
  return digits;
}

/**
 * Procura na lista de clientes se já existe algum cliente com o mesmo número de telefone.
 * Suporta correspondência exata de DDD+Número e sufixo de 8 ou 9 dígitos (para evitar discrepâncias de formato).
 */
export function findDuplicateClientByPhone(
  clients: Client[],
  phone: string | undefined | null,
  excludeClientId?: string
): Client | null {
  const target = normalizePhoneForComparison(phone);
  if (!target || target.length < 8) return null;

  return (
    clients.find((c) => {
      if (excludeClientId && c.id === excludeClientId) return false;
      const cNorm = normalizePhoneForComparison(c.phone);
      if (!cNorm || cNorm.length < 8) return false;

      // 1. Dígitos idênticos (ex: 11987654321 === 11987654321)
      if (cNorm === target) return true;

      // 2. Correspondência com DDD ou sem DDD
      if (target.length >= 8 && cNorm.length >= 8) {
        if (target.length >= 10 && cNorm.length >= 10) {
          // Ambos têm DDD completo, mas são diferentes
          return false;
        }
        // Um tem DDD e o outro não (ex: 987654321 e 11987654321)
        if (target.endsWith(cNorm) || cNorm.endsWith(target)) {
          return true;
        }
      }

      return false;
    }) || null
  );
}

/**
 * Avalia se o cadastro de um cliente está com status "Completo" e com todos os campos preenchidos,
 * ou se ainda está como "A Completar" (campos pendentes como email, senha, aniversário).
 */
export function isClientProfileComplete(client: Client | null | undefined): boolean {
  if (!client) return false;

  // 1. Se possuir status explícito de incompleto / a completar
  const isExplicitlyIncomplete =
    client.status === 'A Completar' ||
    client.profileStatus === 'A Completar';
  if (isExplicitlyIncomplete) {
    return false;
  }

  // 2. Validação dos campos essenciais
  const hasName = Boolean(client.name && client.name.trim().length > 0);
  const rawPhone = unmask(client.phone);
  const hasPhone = Boolean(client.phone && rawPhone.length >= 8);

  // E-mail preenchido e não fictício/placeholder gerado pelo sistema
  const hasValidEmail = Boolean(
    client.email &&
    client.email.trim().length > 0 &&
    !client.email.toLowerCase().endsWith('@cliente.local') &&
    client.email.includes('@')
  );

  if (!hasName || !hasPhone || !hasValidEmail) {
    return false;
  }

  // 3. Se possuir status explícito 'Completo', os campos básicos validam
  if (client.status === 'Completo' || client.profileStatus === 'Completo') {
    return true;
  }

  // 4. Caso não tenha status explícito, verifica se tem data de nascimento
  const hasBirthDate = Boolean(
    (client.birthDay && client.birthMonth) ||
    (client.birthDateFormatted && client.birthDateFormatted.includes('/'))
  );

  return hasBirthDate;
}

