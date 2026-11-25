import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'missing-key'
);

export const VILLES = ['Lomé', 'Atakpamé', 'Kara', 'Sokodé', 'Kpalimé', 'Dapaong', 'Tsévié'];
export const CATEGORIES = ['Vêtements', 'Chaussures', 'Cosmétiques', 'Téléphones', 'Alimentaire', 'Autre'];

export const OFFRES = {
  gratuit: { nom: 'Gratuit', prix: 0, produits: 5 },
  start: { nom: 'Start', prix: 2500, produits: 30 },
  pro: { nom: 'Pro', prix: 5000, produits: Infinity },
};

export const STATUTS = {
  nouvelle: { label: 'Nouvelle', cls: 'bg-orange-100 text-orange-700' },
  confirmee: { label: 'Confirmée', cls: 'bg-blue-100 text-blue-700' },
  en_livraison: { label: 'En livraison', cls: 'bg-purple-100 text-purple-700' },
  livree: { label: 'Livrée', cls: 'bg-green-100 text-green-700' },
  annulee: { label: 'Annulée', cls: 'bg-gray-200 text-gray-600' },
};
export const SUIVANT = {
  nouvelle: { to: 'confirmee', label: 'Confirmer' },
  confirmee: { to: 'en_livraison', label: 'Mettre en livraison' },
  en_livraison: { to: 'livree', label: 'Marquer livrée' },
};

export const PAIEMENTS = {
  livraison: 'Paiement à la livraison',
  mixx: 'Mixx by Yas',
  flooz: 'Flooz',
};

export function fcfa(n) {
  const v = Math.round(Number(n) || 0);
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
}

// Garde seulement les 8 chiffres togolais. Retourne null si invalide.
export function normTel(input) {
  let d = String(input || '').replace(/\D/g, '');
  if (d.startsWith('00228')) d = d.slice(5);
  else if (d.startsWith('228') && d.length === 11) d = d.slice(3);
  if (d.length !== 8) return null;
  return '+228' + d;
}

export function fakeEmail(tel) {
  return tel.replace(/\D/g, '') + '@togoboutik.app';
}

export function slugify(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'boutique';
}

export function waLink(number, message) {
  const d = String(number || '').replace(/\D/g, '');
  return `https://wa.me/${d}?text=${encodeURIComponent(message || '')}`;
}

// Réduit la photo (max 800 px, JPEG) pour que ça passe vite en 3G
export function compressImage(file, max = 800, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * ratio);
      c.height = Math.round(img.height * ratio);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => {
        URL.revokeObjectURL(url);
        b ? resolve(b) : reject(new Error('compress'));
      }, 'image/jpeg', quality);
    };
    img.onerror = () => reject(new Error('image'));
    img.src = url;
  });
}


export async function uploadPhoto(file, userId) {
  const blob = await compressImage(file);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
  const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

// "Générer description" : modèle local, gratuit, sans service externe
export function genererDescription({ nom, categorie, prix, boutique }) {
  const n = nom || 'Ce produit';
  const intro = {
    'Vêtements': `${n} : un vêtement confortable et élégant, parfait pour tous les jours comme pour les sorties.`,
    'Chaussures': `${n} : des chaussures solides et confortables, faites pour marcher toute la journée.`,
    'Cosmétiques': `${n} : un produit de beauté de qualité pour prendre soin de ta peau et de ton style.`,
    'Téléphones': `${n} : un téléphone fiable, testé et prêt à l'emploi.`,
    'Alimentaire': `${n} : un produit frais et savoureux, préparé avec soin.`,
  }[categorie] || `${n} : un produit de qualité, choisi avec soin.`;
  return `${intro}\n\n✅ Qualité garantie\n✅ Livraison partout au Togo\n✅ Paiement à la livraison possible\n\nPrix : ${fcfa(prix)}${boutique ? `\nBoutique : ${boutique}` : ''}\n\nCommande vite sur WhatsApp, stock limité !`;
}

export function messageErreur(e) {
  const m = (e && (e.message || e.details)) || '';
  if (m.includes('LIMITE_PRODUITS')) return "Tu as atteint la limite de produits de ton offre. Passe à l'offre Start ou Pro.";
  if (m.includes('STOCK_INSUFFISANT')) return 'Stock insuffisant pour cette quantité.';
  if (m.includes('BOUTIQUE_INDISPONIBLE')) return "Cette boutique n'est pas disponible.";
  if (m.includes('INFOS_MANQUANTES')) return 'Remplis ton nom, ton téléphone et ton quartier.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ce numéro a déjà un compte. Connecte-toi.';
  if (m.includes('Invalid login')) return 'Numéro ou mot de passe incorrect.';
  if (m.includes('Failed to fetch') || m.includes('NetworkError')) return 'Pas de connexion. Réessaie.';
  return 'Une erreur est survenue. Réessaie.';
}

// Adresse du site : change seulement NEXT_PUBLIC_SITE_URL (ex : https://togoboutik.com) quand tu auras un domaine.
// Sans cette variable, l'adresse suit automatiquement le site visité (togoboutik.vercel.app).
export function siteUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://togoboutik.vercel.app';
}
