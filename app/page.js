import Link from 'next/link';

const ETAPES = [
  { n: '1', t: 'Crée ton compte', d: 'Ton nom, ton numéro WhatsApp et le nom de ta boutique. Pas besoin d’email.' },
  { n: '2', t: 'Ajoute tes produits', d: 'Prends une photo, mets le prix en FCFA. C’est tout.' },
  { n: '3', t: 'Partage ton lien', d: 'Envoie-le sur WhatsApp et TikTok. Les commandes arrivent dans ton téléphone.' },
];

const OFFRES = [
  { nom: 'Gratuit', prix: '0 FCFA', d: '5 produits', pop: false },
  { nom: 'Start', prix: '2 500 FCFA/mois', d: '30 produits', pop: true },
  { nom: 'Pro', prix: '5 000 FCFA/mois', d: 'Produits illimités', pop: false },
];

export default function Accueil() {
  return (
    <main>
      <header className="flex items-center justify-between px-4 py-4">
        <span className="text-2xl font-extrabold">
          Togo<span className="text-wa">Boutik</span>
        </span>
        <Link href="/espace#connexion" className="rounded-xl border-2 border-gray-300 px-4 py-2 font-bold">
          Connexion
        </Link>
      </header>

      <section className="px-4 pb-8 pt-4">
        <h1 className="text-4xl font-extrabold leading-tight">
          Crée ta boutique en ligne en <span className="text-wa">2 minutes</span>.
        </h1>
        <p className="mt-3 text-xl text-gray-700">Vends au Togo avec WhatsApp et Mobile Money.</p>
        <div className="mt-6 space-y-3">
          <Link href="/espace#inscription" className="btn-green">Créer ma boutique gratuitement</Link>
          <Link href="/espace#boutiques" className="btn-line">Voir les boutiques</Link>
        </div>
        <p className="mt-4 text-center text-base text-gray-600">
          Paiement à la livraison · Mixx by Yas · Flooz · Tout en FCFA
        </p>
      </section>

      <section className="bg-gray-50 px-4 py-8">
        <h2 className="mb-4 text-2xl font-extrabold">Comment ça marche ?</h2>
        <div className="space-y-3">
          {ETAPES.map((e) => (
            <div key={e.n} className="card flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-wa text-2xl font-extrabold text-white">
                {e.n}
              </div>
              <div>
                <p className="text-xl font-bold">{e.t}</p>
                <p className="text-gray-700">{e.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-8">
        <h2 className="mb-4 text-2xl font-extrabold">Les prix</h2>
        <div className="space-y-3">
          {OFFRES.map((o) => (
            <div key={o.nom} className={`card ${o.pop ? 'border-2 border-wa' : ''}`}>
              <div className="flex items-center justify-between">
                <p className="text-xl font-extrabold">{o.nom}</p>
                {o.pop && <span className="rounded-full bg-wa px-3 py-1 text-sm font-bold text-white">Populaire</span>}
              </div>
              <p className="mt-1 text-2xl font-extrabold text-promo">{o.prix}</p>
              <p className="text-gray-700">{o.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link href="/espace#inscription" className="btn-green">Commencer gratuitement</Link>
        </div>
      </section>

      <footer className="px-4 pb-10 text-center text-sm text-gray-500">
        © TogoBoutik · Fait au Togo 🇹🇬
      </footer>
    </main>
  );
}
