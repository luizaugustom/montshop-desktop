const FIREBASE_STORAGE_BASE_URL = 'https://firebasestorage.googleapis.com/v0/b/montshop.appspot.com/o/';

export function getImageUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl || photoUrl.trim() === '') {
    return null;
  }

  // Se já é uma URL completa (http/https), retornar como está
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }

  // Se começa com /o/, assumir que é caminho do Firebase Storage
  if (photoUrl.startsWith('/o/')) {
    const path = photoUrl.replace('/o/', '');
    const encodedPath = encodeURIComponent(path);
    return `${FIREBASE_STORAGE_BASE_URL}${encodedPath}?alt=media`;
  }

  // Se não começa com /o/, adicionar
  if (!photoUrl.startsWith('/')) {
    const encodedPath = encodeURIComponent(photoUrl);
    return `${FIREBASE_STORAGE_BASE_URL}${encodedPath}?alt=media`;
  }

  // Tentar construir URL do Firebase Storage
  const path = photoUrl.startsWith('/') ? photoUrl.slice(1) : photoUrl;
  const encodedPath = encodeURIComponent(path);
  return `${FIREBASE_STORAGE_BASE_URL}${encodedPath}?alt=media`;
}

