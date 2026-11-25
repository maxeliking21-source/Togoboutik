'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase, fcfa, waLink, normTel, messageErreur, siteUrl, CATEGORIES, PAIEMENTS } from '../../lib';

// Liens internes : la fiche produit s'ouvre avec #p-IDENTIFIANT (même page, pas de rechargement)
function Link({ href, ...p }) {
  let h = href;
  if (/^\/b\/[^/]+\/p\//.test(h)) h = '#p-' + h.split('/p/')[1];
  else if (/^\/b\/[^/]+$/.test(h)) h = '#';
  else if (h === '/boutiques') h = '/espace#boutiques';
  return <a href={h} {...p} />;
}

function PageBoutique({ slug }) {
  const [shop, setShop] = useState(undefined);
  const [produits, setProduits] = useState([]);
  const [cat, setCat] = useState('');

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from('shops').select('*').eq('slug', slug).eq('statut', 'actif').maybeSingle();
      setShop(s || null);
      if (s) {
        const { data: p } = await supabase
          .from('products')
          .select('id, nom, prix, ancien_prix, photo_url, categorie, en_rupture, stock')
          .eq('shop_id', s.id)
          .eq('actif', true)
          .order('created_at', { ascending: false });
        setProduits(p || []);
      }
    })();
  }, [slug]);

  if (shop === undefined) return <p className="p-6 text-gray-600">Chargement…</p>;
  if (shop === null)
    return (
      <main className="p-6">
        <h1 className="text-2xl font-extrabold">Boutique introuvable</h1>
        <p className="my-3 text-gray-700">Ce lien ne marche pas ou la boutique est en pause.</p>
        <Link href="/boutiques" className="btn-green">Voir les boutiques</Link>
      </main>
    );

  const cats = CATEGORIES.filter((c) => produits.some((p) => p.categorie === c));
  const liste = produits.filter((p) => !cat || p.categorie === cat);

  return (
    <main className="pb-10">
      <header className="border-b border-gray-200 px-4 py-5">
        <div className="flex items-center gap-3">
          {shop.logo_url ? (
            <img src={shop.logo_url} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-wa text-3xl font-extrabold text-white">
              {shop.nom_boutique[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold">{shop.nom_boutique}</h1>
            <p className="text-gray-600">📍 {shop.ville}</p>
          </div>
        </div>
        {shop.description && <p className="mt-3 text-gray-700">{shop.description}</p>}
        <a
          href={waLink(shop.whatsapp_number, `Bonjour ${shop.nom_boutique}, je viens de voir votre boutique.`)}
          target="_blank" rel="noreferrer"
          className="btn-green mt-4"
        >
          💬 Écrire sur WhatsApp
        </a>
        <p className="mt-2 text-center text-sm text-gray-600">🚚 Livraison partout au Togo</p>
      </header>

      {cats.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {['', ...cats].map((c) => (
            <button
              key={c || 'tout'}
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-4 py-2 font-bold ${cat === c ? 'bg-wa text-white' : 'bg-gray-100'}`}
            >
              {c || 'Tout'}
            </button>
          ))}
        </div>
      )}

      {liste.length === 0 && <p className="p-4 text-gray-600">Pas encore de produits.</p>}

      <div className="grid grid-cols-2 gap-3 px-4 pt-2">
        {liste.map((p) => (
          <div key={p.id} className="card flex flex-col p-2">
            <Link href={`/b/${slug}/p/${p.id}`} className="block">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                {p.photo_url && <img src={p.photo_url} alt={p.nom} loading="lazy" className="h-full w-full object-cover" />}
                {p.en_rupture && (
                  <span className="absolute left-1 top-1 rounded-lg bg-black/70 px-2 py-1 text-sm font-bold text-white">Rupture</span>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-base font-bold leading-tight">{p.nom}</p>
              <p className="text-lg font-extrabold">{fcfa(p.prix)}</p>
              {p.ancien_prix > p.prix && <p className="text-sm text-promo line-through">{fcfa(p.ancien_prix)}</p>}
            </Link>
            {p.en_rupture ? (
              <span className="mt-2 rounded-xl bg-gray-200 py-3 text-center font-bold text-gray-600">Épuisé</span>
            ) : (
              <Link href={`/b/${slug}/p/${p.id}`} className="mt-auto pt-2">
                <span className="btn-green py-3 text-base">Commander</span>
              </Link>
            )}
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-gray-500">
        Boutique créée avec <Link href="/" className="font-bold text-wa-dark">TogoBoutik</Link>
      </p>
    </main>
  );
}

function PageProduit({ slug, id }) {
  const [shop, setShop] = useState(undefined);
  const [prod, setProd] = useState(null);
  const [zones, setZones] = useState([]);
  const [mode, setMode] = useState(null); // null = formulaire fermé
  const [done, setDone] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from('shops').select('*').eq('slug', slug).eq('statut', 'actif').maybeSingle();
      setShop(s || null);
      if (!s) return;
      const [{ data: p }, { data: z }] = await Promise.all([
        supabase.from('products').select('*').eq('id', id).eq('shop_id', s.id).eq('actif', true).maybeSingle(),
        supabase.from('delivery_zones').select('*').eq('shop_id', s.id).order('prix'),
      ]);
      setProd(p || null);
      setZones(z || []);
    })();
  }, [slug, id]);

  if (shop === undefined) return <p className="p-6 text-gray-600">Chargement…</p>;
  if (!shop || !prod)
    return (
      <main className="p-6">
        <h1 className="text-2xl font-extrabold">Produit introuvable</h1>
        <Link href={`/b/${slug}`} className="btn-green mt-4">Retour à la boutique</Link>
      </main>
    );

  if (done) return <Confirmation done={done} shop={shop} slug={slug} />;

  const promo = prod.ancien_prix > prod.prix;
  const pct = promo ? Math.round(((prod.ancien_prix - prod.prix) / prod.ancien_prix) * 100) : 0;

  return (
    <main className="pb-10">
      <div className="px-4 py-3">
        <Link href={`/b/${slug}`} className="text-lg font-bold text-gray-600">← {shop.nom_boutique}</Link>
      </div>
      <div className="relative aspect-square w-full bg-gray-100">
        {prod.photo_url && <img src={prod.photo_url} alt={prod.nom} className="h-full w-full object-cover" />}
        {promo && <span className="absolute left-3 top-3 rounded-xl bg-promo px-3 py-1 text-lg font-extrabold text-white">-{pct}%</span>}
      </div>

      <div className="px-4 pt-4">
        <h1 className="text-2xl font-extrabold">{prod.nom}</h1>
        <p className="mt-1 text-3xl font-extrabold">
          {fcfa(prod.prix)}{' '}
          {promo && <span className="text-lg font-bold text-promo line-through">{fcfa(prod.ancien_prix)}</span>}
        </p>
        {prod.description && <p className="mt-3 whitespace-pre-line text-gray-800">{prod.description}</p>}

        {prod.en_rupture || prod.stock < 1 ? (
          <p className="err mt-5">Ce produit est en rupture de stock.</p>
        ) : mode === null ? (
          <div className="mt-5 space-y-3">
            <a
              className="btn-green"
              target="_blank" rel="noreferrer"
              href={waLink(shop.whatsapp_number, `Bonjour ${shop.nom_boutique}, je veux commander : ${prod.nom} (${fcfa(prod.prix)}).\nLien : ${siteUrl()}/b/${slug}#p-${prod.id}`)}
            >
              💬 Commander sur WhatsApp
            </a>
            <button className="btn-orange" onClick={() => setMode('livraison')}>📝 Commander par formulaire</button>
            <p className="text-center text-sm text-gray-600">Formulaire : paiement à la livraison, Mixx by Yas ou Flooz</p>
          </div>
        ) : (
          <FormCommande shop={shop} prod={prod} zones={zones} modeInitial={mode} onDone={setDone} onCancel={() => setMode(null)} />
        )}
      </div>
    </main>
  );
}

function FormCommande({ shop, prod, zones, modeInitial, onDone, onCancel }) {
  const [f, setF] = useState({ nom: '', tel: '', zone: zones[0]?.id || '', quartier: '', repere: '', qte: 1, mode: modeInitial, code: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const zone = zones.find((z) => z.id === f.zone);
  const livraison = zone ? zone.prix : 0;
  const total = prod.prix * f.qte + livraison;
  const maxQte = Math.max(1, Math.min(prod.stock, 20));

  async function envoyer(e) {
    e.preventDefault();
    setErr('');
    const tel = normTel(f.tel);
    if (f.nom.trim().length < 2) return setErr('Écris ton nom complet.');
    if (!tel) return setErr('Numéro invalide. Écris les 8 chiffres.');
    if (zones.length && !zone) return setErr('Choisis ta ville / ton quartier.');
    if (!zones.length && f.quartier.trim().length < 2) return setErr('Écris ton quartier.');
    if (f.repere.trim().length < 3) return setErr('Écris un repère pour le livreur.');
    if (f.mode !== 'livraison' && f.code.trim().length < 4) return setErr('Écris le code de la transaction reçu par SMS.');

    setBusy(true);
    const { data, error } = await supabase.rpc('place_order', {
      p_shop: shop.id,
      p_produit: prod.id,
      p_nom: f.nom.trim(),
      p_tel: tel,
      p_quartier: zone ? zone.nom : f.quartier.trim(),
      p_repere: f.repere.trim(),
      p_qte: Number(f.qte),
      p_zone: zone ? zone.id : null,
      p_mode: f.mode,
      p_code: f.mode === 'livraison' ? null : f.code.trim(),
    });
    if (error) {
      setErr(messageErreur(error));
      setBusy(false);
      return;
    }
    onDone({ id: data, nom: f.nom.trim(), tel, prod, qte: Number(f.qte), total, livraison, quartier: zone ? zone.nom : f.quartier.trim(), repere: f.repere.trim(), mode: f.mode });
  }

  return (
    <form onSubmit={envoyer} className="mt-5 space-y-4 rounded-2xl border-2 border-wa p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold">Ta commande</h2>
        <button type="button" onClick={onCancel} className="text-base font-bold text-gray-600">Fermer ✕</button>
      </div>

      <div>
        <label className="label">Nom complet</label>
        <input className="input" value={f.nom} onChange={set('nom')} autoComplete="name" />
      </div>
      <div>
        <label className="label">Téléphone (+228)</label>
        <div className="flex gap-2">
          <span className="flex items-center rounded-2xl bg-gray-100 px-4 text-lg font-bold">+228</span>
          <input className="input" inputMode="tel" value={f.tel} onChange={set('tel')} autoComplete="tel" placeholder="90 12 34 56" />
        </div>
      </div>

      {zones.length > 0 ? (
        <div>
          <label className="label">Ville / Quartier (livraison)</label>
          <select className="input" value={f.zone} onChange={set('zone')}>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.nom} : {fcfa(z.prix)}</option>)}
          </select>
        </div>
      ) : (
        <div>
          <label className="label">Ville / Quartier</label>
          <input className="input" value={f.quartier} onChange={set('quartier')} />
          <p className="mt-1 text-sm text-gray-600">Le prix de la livraison sera donné par le vendeur.</p>
        </div>
      )}

      <div>
        <label className="label">Repère / Adresse</label>
        <input className="input" value={f.repere} onChange={set('repere')} placeholder="Ex : Après le carrefour, maison bleue" />
      </div>
      <div>
        <label className="label">Quantité</label>
        <select className="input" value={f.qte} onChange={(e) => setF({ ...f, qte: Number(e.target.value) })}>
          {Array.from({ length: maxQte }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}
        </select>
      </div>

      <div>
        <p className="label">Comment tu paies ?</p>
        <div className="space-y-2">
          {Object.entries(PAIEMENTS).map(([k, v]) => (
            <label key={k} className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-lg font-bold ${f.mode === k ? 'border-wa bg-green-50' : 'border-gray-300'}`}>
              <input type="radio" name="mode" checked={f.mode === k} onChange={() => setF({ ...f, mode: k })} className="h-5 w-5 accent-green-600" />
              {v}{k === 'livraison' && <span className="text-sm font-semibold text-gray-600"> (par défaut)</span>}
            </label>
          ))}
        </div>
      </div>

      {f.mode !== 'livraison' && (
        <div className="rounded-2xl bg-orange-50 p-4">
          <p className="font-bold">
            1. Envoie <span className="text-promo">{fcfa(total)}</span> par {PAIEMENTS[f.mode]} au <span className="whitespace-nowrap">{shop.whatsapp_number}</span>
          </p>
          <p className="mt-1 font-bold">2. Écris ici le code de la transaction :</p>
          <input className="input mt-2" value={f.code} onChange={set('code')} placeholder="Code reçu par SMS" />
        </div>
      )}

      <div className="rounded-2xl bg-gray-50 p-4 text-lg">
        <div className="flex justify-between"><span>Produit</span><b>{fcfa(prod.prix * f.qte)}</b></div>
        <div className="flex justify-between"><span>Livraison</span><b>{zones.length ? fcfa(livraison) : 'À convenir'}</b></div>
        <div className="mt-1 flex justify-between border-t border-gray-300 pt-2 text-xl"><span className="font-extrabold">Total</span><b>{fcfa(total)}</b></div>
      </div>

      {err && <p className="err">{err}</p>}
      <button className="btn-green" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer ma commande'}</button>
    </form>
  );
}

function Confirmation({ done, shop, slug }) {
  const msg =
    `Bonjour ${shop.nom_boutique}, je viens de passer une commande sur TogoBoutik.\n\n` +
    `Produit : ${done.prod.nom} x${done.qte}\n` +
    `Total : ${fcfa(done.total)}\n` +
    `Paiement : ${PAIEMENTS[done.mode]}\n` +
    `Nom : ${done.nom}\nQuartier : ${done.quartier}\nRepère : ${done.repere}`;
  return (
    <main className="p-6 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-wa text-5xl text-white">✓</div>
      <h1 className="mt-4 text-3xl font-extrabold">Merci !</h1>
      <p className="mt-2 text-xl">Merci, ta commande est reçue. Le vendeur va te contacter sur WhatsApp.</p>
      <div className="card mt-5 text-left text-lg">
        <p><b>{done.prod.nom}</b> x{done.qte}</p>
        <p>Total : <b>{fcfa(done.total)}</b></p>
        <p>Paiement : {PAIEMENTS[done.mode]}</p>
      </div>
      <div className="mt-5 space-y-3">
        <a href={waLink(shop.whatsapp_number, msg)} target="_blank" rel="noreferrer" className="btn-green">
          💬 Prévenir le vendeur sur WhatsApp
        </a>
        <Link href={`/b/${slug}`} className="btn-line">Retour à la boutique</Link>
      </div>
    </main>
  );
}

export default function Page() {
  const { slug } = useParams();
  const [hash, setHash] = useState('');
  useEffect(() => {
    const lire = () => { setHash(window.location.hash); window.scrollTo(0, 0); };
    setHash(window.location.hash);
    window.addEventListener('hashchange', lire);
    return () => window.removeEventListener('hashchange', lire);
  }, []);
  return hash.startsWith('#p-') ? <PageProduit slug={slug} id={hash.slice(3)} /> : <PageBoutique slug={slug} />;
}
