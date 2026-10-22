import { Professional } from '../types';

/**
 * Converte um texto/nome em um slug URL-friendly
 * Exemplo: "Lucas Silva Jr." -> "lucas-silva-jr"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD') // Separa acentos
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/[\s_]+/g, '-') // Converte espaços e underlines em hífen
    .replace(/-+/g, '-'); // Remove hífens duplicados
}

/**
 * Encontra um profissional a partir de um identificador (ID direto ou slug gerado a partir do nome)
 */
export function findProfessionalBySlugOrId(
  professionals: Professional[],
  identifier: string
): Professional | undefined {
  if (!identifier) return undefined;

  const cleanIdentifier = decodeURIComponent(identifier).trim().toLowerCase();

  return professionals.find((pro) => {
    // 1. Comparação exata por ID
    if (pro.id.toLowerCase() === cleanIdentifier) {
      return true;
    }

    // 2. Comparação por slug personalizado se existir
    if (pro.slug && pro.slug.toLowerCase() === cleanIdentifier) {
      return true;
    }

    // 3. Comparação pelo slug gerado a partir do nome
    const nameSlug = slugify(pro.name);
    if (nameSlug === cleanIdentifier) {
      return true;
    }

    // 4. Comparação simplificada por nome sem hífens
    const simpleName = pro.name.toLowerCase().replace(/\s+/g, '-');
    if (simpleName === cleanIdentifier) {
      return true;
    }

    return false;
  });
}
