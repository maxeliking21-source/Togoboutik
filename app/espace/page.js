'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  supabase, VILLES, CATEGORIES, OFFRES, STATUTS, SUIVANT, PAIEMENTS,
  fcfa, normTel, fakeEmail, slugify, waLink, uploadPhoto, genererDescription, messageErreur, siteUrl,
} from '../lib';

// Navigation interne par #adresse : tout l'espace vendeur tient sur une seule page (/espace)
const LIENS = { '/connexion': '#connexion', '/inscription': '#inscription', '/dashboard': '#dashboard', '/admin': '#admin', '/boutiques': '#boutiques' };
function nav(p) {
  if (LIENS[p]) { window.location.hash = LIENS[p]; } else { window.location.href = p; }
}
const ROUTER = { push: nav, replace: nav };
function useRouter() { return ROUTER; }
function Link({ href, ...p }) {
  return <a href={LIENS[href] ? '/espace' + LIENS[href] : href} {...p} />;
}

function Inscription() {
  const router = useRouter();
  const [f, setF] = useState({ nom: '', tel: '', mdp: '', boutique: '', ville: 'Lomé', desc: '' });
  const [logo, setLogo] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const slugApercu = slugify(f.boutique);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    const tel = normTel(f.tel);
    if (f.nom.trim().length < 2) return setErr('Écris ton nom complet.');
    if (!tel) return setErr('Numéro invalide. Écris les 8 chiffres, ex : 90 12 34 56.');
    if (f.mdp.length < 6) return setErr('Le mot de passe doit avoir au moins 6 caractères.');
    if (f.boutique.trim().length < 2) return setErr('Écris le nom de ta boutique.');

    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: fakeEmail(tel),
        password: f.mdp,
        options: { data: { nom_complet: f.nom.trim(), telephone: tel, ville: f.ville } },
      });
      if (error) throw error;
      if (!data.session) throw new Error('Confirmation email active : désactive-la dans Supabase (voir le guide).');
      const uid = data.user.id;

      let logo_url = null;
      if (logo) {
        try { logo_url = await uploadPhoto(logo, uid); } catch (_) { /* le logo est optionnel */ }
      }

      let slug = slugify(f.boutique);
      let shop = null;
      for (let i = 0; i < 4 && !shop; i++) {
        const { data: s, error: e2 } = await supabase
          .from('shops')
          .insert({
            user_id: uid,
            nom_boutique: f.boutique.trim(),
            slug,
            description: f.desc.trim() || null,
            logo_url,
            ville: f.ville,
            whatsapp_number: tel,
          })
          .select()
          .single();
        if (!e2) shop = s;
        else if (e2.code === '23505') slug = `${slugify(f.boutique)}-${Math.floor(100 + Math.random() * 900)}`;
        else throw e2;
      }
      if (!shop) throw new Error('slug');

      // Zones de livraison de départ (modifiables ensuite)
      await supabase.from('delivery_zones').insert([
        { shop_id: shop.id, nom: `${f.ville} Centre`, prix: 1000 },
        { shop_id: shop.id, nom: `${f.ville} Autres quartiers`, prix: 1500 },
      ]);

      router.push('/dashboard');
    } catch (e2) {
      setErr(messageErreur(e2) + (e2.message && e2.message.includes('Confirmation') ? ' ' + e2.message : ''));
      setBusy(false);
    }
  }

  return (
    <main className="px-4 py-6">
      <Link href="/" className="text-lg font-bold text-gray-600">← Retour</Link>
      <h1 className="mt-3 text-3xl font-extrabold">Créer ma boutique</h1>
      <p className="mb-5 text-gray-700">C’est gratuit et ça prend 2 minutes.</p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Nom complet</label>
          <input className="input" value={f.nom} onChange={set('nom')} autoComplete="name" placeholder="Ex : Afi Mensah" />
        </div>
        <div>
          <label className="label">Numéro WhatsApp (+228)</label>
          <div className="flex gap-2">
            <span className="flex items-center rounded-2xl bg-gray-100 px-4 text-lg font-bold">+228</span>
            <input className="input" inputMode="tel" value={f.tel} onChange={set('tel')} autoComplete="tel" placeholder="90 12 34 56" />
          </div>
        </div>
        <div>
          <label className="label">Mot de passe</label>
          <input className="input" type="password" value={f.mdp} onChange={set('mdp')} autoComplete="new-password" placeholder="Au moins 6 caractères" />
        </div>
        <div>
          <label className="label">Nom de ta boutique</label>
          <input className="input" value={f.boutique} onChange={set('boutique')} placeholder="Ex : Mama Boutique" />
          {slugApercu && (
            <p className="mt-1 text-sm text-gray-600">
              Ton lien : <b>{siteUrl().replace(/^https?:\/\//, '')}/b/{slugApercu}</b>
            </p>
          )}
        </div>
        <div>
          <label className="label">Ville</label>
          <select className="input" value={f.ville} onChange={set('ville')}>
            {VILLES.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Description (facultatif)</label>
          <textarea className="input" rows={3} value={f.desc} onChange={set('desc')} placeholder="Ex : Vêtements et chaussures, livraison partout au Togo." />
        </div>
        <div>
          <label className="label">Logo (facultatif)</label>
          <input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files[0] || null)} className="w-full text-base" />
        </div>

        {err && <p className="err">{err}</p>}
        <button className="btn-green" disabled={busy}>{busy ? 'Création…' : 'Créer ma boutique'}</button>
        <p className="text-center text-base">
          Déjà un compte ? <Link href="/connexion" className="font-bold text-wa-dark underline">Connexion</Link>
        </p>
      </form>
    </main>
  );
}

function Connexion() {
  const router = useRouter();
  const [tel, setTel] = useState('');
  const [mdp, setMdp] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    const t = normTel(tel);
    if (!t) return setErr('Numéro invalide. Écris les 8 chiffres.');
    setBusy(true);
    const { data: auth, error } = await supabase.auth.signInWithPassword({ email: fakeEmail(t), password: mdp });
    if (error) {
      setErr(messageErreur(error));
      setBusy(false);
      return;
    }
    const { data: u } = await supabase.from('users').select('role').eq('id', auth.user.id).maybeSingle();
    router.push(u && u.role === 'super_admin' ? '/admin' : '/dashboard');
  }

  return (
    <main className="px-4 py-6">
      <Link href="/" className="text-lg font-bold text-gray-600">← Retour</Link>
      <h1 className="mb-5 mt-3 text-3xl font-extrabold">Connexion</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Numéro WhatsApp (+228)</label>
          <div className="flex gap-2">
            <span className="flex items-center rounded-2xl bg-gray-100 px-4 text-lg font-bold">+228</span>
            <input className="input" inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="90 12 34 56" />
          </div>
        </div>
        <div>
          <label className="label">Mot de passe</label>
          <input className="input" type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} />
        </div>
        {err && <p className="err">{err}</p>}
        <button className="btn-green" disabled={busy}>{busy ? 'Connexion…' : 'Me connecter'}</button>
        <p className="text-center text-base">
          Pas de compte ? <Link href="/inscription" className="font-bold text-wa-dark underline">Créer ma boutique</Link>
        </p>
      </form>
    </main>
  );
}

function Boutiques() {
  const [shops, setShops] = useState(null);
  const [ville, setVille] = useState('');

  useEffect(() => {
    supabase
      .from('shops')
      .select('id, nom_boutique, slug, logo_url, ville, description')
      .eq('statut', 'actif')
      .order('created_at', { ascending: false })
      .limit(60)
      .then(({ data }) => setShops(data || []));
  }, []);

  const liste = (shops || []).filter((s) => !ville || s.ville === ville);

  return (
    <main className="px-4 py-6">
      <Link href="/" className="text-lg font-bold text-gray-600">← Accueil</Link>
      <h1 className="mb-4 mt-3 text-3xl font-extrabold">Les boutiques</h1>
      <select className="input mb-4" value={ville} onChange={(e) => setVille(e.target.value)}>
        <option value="">Toutes les villes</option>
        {VILLES.map((v) => <option key={v}>{v}</option>)}
      </select>

      {shops === null && <p className="text-gray-600">Chargement…</p>}
      {shops && liste.length === 0 && <p className="text-gray-600">Aucune boutique pour le moment.</p>}

      <div className="space-y-3">
        {liste.map((s) => (
          <Link key={s.id} href={`/b/${s.slug}`} className="card flex items-center gap-3">
            {s.logo_url ? (
              <img src={s.logo_url} alt="" loading="lazy" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-wa text-2xl font-extrabold text-white">
                {s.nom_boutique[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xl font-bold">{s.nom_boutique}</p>
              <p className="text-gray-600">{s.ville}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

function ProductForm({ shop, uid, produit, onClose, onSaved }) {
  const edition = !!produit;
  const [f, setF] = useState({
    nom: produit?.nom || '',
    prix: produit?.prix ?? '',
    ancien: produit?.ancien_prix ?? '',
    stock: produit?.stock ?? 1,
    categorie: produit?.categorie || 'Vêtements',
    description: produit?.description || '',
  });
  const [photoUrl, setPhotoUrl] = useState(produit?.photo_url || '');
  const [up, setUp] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function choisirPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUp(true);
    try {
      setPhotoUrl(await uploadPhoto(file, uid));
    } catch (_) {
      setErr("La photo n'a pas pu être envoyée. Réessaie.");
    }
    setUp(false);
  }

  async function enregistrer(e) {
    e.preventDefault();
    setErr('');
    const prix = parseInt(f.prix, 10);
    const ancien = f.ancien === '' ? null : parseInt(f.ancien, 10);
    const stock = parseInt(f.stock, 10);
    if (f.nom.trim().length < 2) return setErr('Écris le nom du produit.');
    if (!(prix >= 0)) return setErr('Écris le prix en FCFA.');
    if (ancien !== null && !(ancien >= 0)) return setErr('Ancien prix invalide.');
    if (!(stock >= 0)) return setErr('Écris le stock.');

    const row = {
      nom: f.nom.trim(),
      prix,
      ancien_prix: ancien,
      stock,
      categorie: f.categorie,
      description: f.description.trim() || null,
      photo_url: photoUrl || null,
      en_rupture: stock === 0,
    };
    setBusy(true);
    const { error } = edition
      ? await supabase.from('products').update(row).eq('id', produit.id)
      : await supabase.from('products').insert({ ...row, shop_id: shop.id });
    if (error) {
      setErr(messageErreur(error));
      setBusy(false);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-white">
      <form onSubmit={enregistrer} className="mx-auto max-w-xl space-y-4 px-4 py-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">{edition ? 'Modifier le produit' : 'Ajouter un produit'}</h2>
          <button type="button" onClick={onClose} className="text-lg font-bold text-gray-600">✕</button>
        </div>

        <div>
          <label className="label">Photo</label>
          <label className="flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50">
            {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-lg font-bold text-gray-500">{up ? 'Envoi…' : '📷 Prendre / choisir une photo'}</span>}
            <input type="file" accept="image/*" onChange={choisirPhoto} className="hidden" />
          </label>
          {photoUrl && <p className="mt-1 text-sm text-gray-600">{up ? 'Envoi…' : 'Touche la photo pour la changer.'}</p>}
        </div>

        <div>
          <label className="label">Nom du produit</label>
          <input className="input" value={f.nom} onChange={set('nom')} placeholder="Ex : Robe wax rouge" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Prix (FCFA)</label>
            <input className="input" inputMode="numeric" value={f.prix} onChange={set('prix')} placeholder="5000" />
          </div>
          <div>
            <label className="label">Ancien prix</label>
            <input className="input" inputMode="numeric" value={f.ancien} onChange={set('ancien')} placeholder="Facultatif" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Stock</label>
            <input className="input" inputMode="numeric" value={f.stock} onChange={set('stock')} />
          </div>
          <div>
            <label className="label">Catégorie</label>
            <select className="input" value={f.categorie} onChange={set('categorie')}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="label !mb-0">Description</label>
            <button
              type="button"
              onClick={() => setF({ ...f, description: genererDescription({ nom: f.nom, categorie: f.categorie, prix: f.prix, boutique: shop.nom_boutique }) })}
              className="btn-sm bg-orange-100 text-promo"
            >
              ✨ Générer description
            </button>
          </div>
          <textarea className="input" rows={6} value={f.description} onChange={set('description')} />
        </div>

        {err && <p className="err">{err}</p>}
        <button className="btn-green" disabled={busy || up}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
      </form>
    </div>
  );
}

function BoutiqueTab({ shop, uid, onShopChange }) {
  const [produits, setProduits] = useState([]);
  const [form, setForm] = useState(null); // null | 'new' | produit
  const [copie, setCopie] = useState(false);
  const plan = OFFRES[shop.abonnement];

  const charger = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false });
    setProduits(data || []);
  }, [shop.id]);
  useEffect(() => { charger(); }, [charger]);

  const lien = `${siteUrl()}/b/${shop.slug}`;
  const limiteAtteinte = produits.length >= plan.produits;

  async function copier() {
    try { await navigator.clipboard.writeText(lien); setCopie(true); setTimeout(() => setCopie(false), 2000); }
    catch (_) { window.prompt('Copie ce lien :', lien); }
  }

  async function basculerRupture(p) {
    await supabase.from('products').update({ en_rupture: !p.en_rupture, stock: p.en_rupture && p.stock === 0 ? 1 : p.stock }).eq('id', p.id);
    charger();
  }
  async function supprimer(p) {
    if (!confirm(`Supprimer "${p.nom}" ?`)) return;
    await supabase.from('products').delete().eq('id', p.id);
    charger();
  }

  return (
    <div className="space-y-4">
      <div className="card bg-green-50">
        <p className="font-bold">🔗 Ton lien à partager</p>
        <p className="break-all text-sm text-gray-700">{lien}</p>
        <div className="mt-3 flex gap-2">
          <button onClick={copier} className="btn-sm flex-1 bg-wa text-white">{copie ? '✓ Copié' : 'Copier le lien'}</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Découvre ma boutique ${shop.nom_boutique} : ${lien}`)}`} target="_blank" rel="noreferrer" className="btn-sm flex-1 border-2 border-wa text-wa-dark">Partager WhatsApp</a>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold">Mes produits <span className="text-base text-gray-500">({produits.length}{plan.produits !== Infinity ? `/${plan.produits}` : ''})</span></h2>
      </div>

      {limiteAtteinte ? (
        <p className="err">Limite de {plan.produits} produits atteinte. Passe à une offre supérieure plus bas.</p>
      ) : (
        <button className="btn-green" onClick={() => setForm('new')}>➕ Ajouter un produit</button>
      )}

      {produits.length === 0 && <p className="text-gray-600">Tu n’as pas encore de produits. Ajoute le premier !</p>}

      {produits.map((p) => (
        <div key={p.id} className="card flex gap-3">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
            {p.photo_url && <img src={p.photo_url} alt="" loading="lazy" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{p.nom}</p>
            <p className="font-extrabold">{fcfa(p.prix)} {p.ancien_prix > p.prix && <span className="text-sm font-bold text-promo line-through">{fcfa(p.ancien_prix)}</span>}</p>
            <p className="text-sm text-gray-600">Stock : {p.stock} {p.en_rupture && <b className="text-promo">· Rupture</b>}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => setForm(p)} className="btn-sm bg-gray-100 !px-3 !py-2">Modifier</button>
              <button onClick={() => basculerRupture(p)} className="btn-sm bg-orange-100 !px-3 !py-2 text-promo">{p.en_rupture ? 'Remettre' : 'Rupture'}</button>
              <button onClick={() => supprimer(p)} className="btn-sm bg-red-50 !px-3 !py-2 text-red-700">Supprimer</button>
            </div>
          </div>
        </div>
      ))}

      <Reglages shop={shop} uid={uid} onShopChange={onShopChange} nbProduits={produits.length} />

      {form && (
        <ProductForm
          shop={shop}
          uid={uid}
          produit={form === 'new' ? null : form}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); charger(); }}
        />
      )}
    </div>
  );
}

function Reglages({ shop, uid, onShopChange }) {
  return (
    <div className="space-y-3 pt-4">
      <h2 className="text-2xl font-extrabold">Réglages</h2>
      <Section titre="🏪 Profil de la boutique"><Profil shop={shop} uid={uid} onShopChange={onShopChange} /></Section>
      <Section titre="🚚 Zones de livraison"><Zones shop={shop} /></Section>
      <Section titre="⭐ Mon abonnement"><Abonnement shop={shop} /></Section>
    </div>
  );
}

function Section({ titre, children }) {
  return (
    <details className="card">
      <summary className="cursor-pointer text-lg font-bold">{titre}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function Profil({ shop, uid, onShopChange }) {
  const [f, setF] = useState({ nom: shop.nom_boutique, desc: shop.description || '', ville: shop.ville || 'Lomé', quartier: shop.quartier || '', wa: shop.whatsapp_number.replace('+228', '') });
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function sauver(e) {
    e.preventDefault();
    const digits = f.wa.replace(/\D/g, '').replace(/^228/, '');
    if (digits.length !== 8) return setMsg('Numéro WhatsApp invalide.');
    const { error } = await supabase.from('shops').update({
      nom_boutique: f.nom.trim(), description: f.desc.trim() || null, ville: f.ville, quartier: f.quartier.trim() || null, whatsapp_number: '+228' + digits,
    }).eq('id', shop.id);
    setMsg(error ? messageErreur(error) : '✓ Enregistré');
    if (!error) onShopChange();
  }
  async function logo(e) {
    const file = e.target.files[0];
    if (!file) return;
    setMsg('Envoi du logo…');
    try {
      const url = await uploadPhoto(file, uid);
      await supabase.from('shops').update({ logo_url: url }).eq('id', shop.id);
      setMsg('✓ Logo changé');
      onShopChange();
    } catch (_) { setMsg("Le logo n'a pas pu être envoyé."); }
  }

  return (
    <form onSubmit={sauver} className="space-y-3">
      <div className="flex items-center gap-3">
        {shop.logo_url ? <img src={shop.logo_url} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-2xl">🏪</div>}
        <label className="btn-sm cursor-pointer bg-gray-100">Changer le logo<input type="file" accept="image/*" className="hidden" onChange={logo} /></label>
      </div>
      <div><label className="label">Nom de la boutique</label><input className="input" value={f.nom} onChange={set('nom')} /></div>
      <div><label className="label">Description</label><textarea className="input" rows={3} value={f.desc} onChange={set('desc')} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Ville</label><select className="input" value={f.ville} onChange={set('ville')}>{VILLES.map((v) => <option key={v}>{v}</option>)}</select></div>
        <div><label className="label">Quartier</label><input className="input" value={f.quartier} onChange={set('quartier')} /></div>
      </div>
      <div><label className="label">Numéro WhatsApp</label><input className="input" inputMode="tel" value={f.wa} onChange={set('wa')} /></div>
      {msg && <p className="font-bold text-wa-dark">{msg}</p>}
      <button className="btn-green">Enregistrer</button>
    </form>
  );
}

function Zones({ shop }) {
  const [zones, setZones] = useState([]);
  const [nom, setNom] = useState('');
  const [prix, setPrix] = useState('');
  const charger = useCallback(async () => {
    const { data } = await supabase.from('delivery_zones').select('*').eq('shop_id', shop.id).order('prix');
    setZones(data || []);
  }, [shop.id]);
  useEffect(() => { charger(); }, [charger]);

  async function ajouter(e) {
    e.preventDefault();
    const p = parseInt(prix, 10);
    if (nom.trim().length < 2 || !(p >= 0)) return;
    await supabase.from('delivery_zones').insert({ shop_id: shop.id, nom: nom.trim(), prix: p });
    setNom(''); setPrix(''); charger();
  }
  async function modifier(z) {
    const v = window.prompt(`Nouveau prix de livraison pour ${z.nom} (FCFA) :`, z.prix);
    const p = parseInt(v, 10);
    if (v === null || !(p >= 0)) return;
    await supabase.from('delivery_zones').update({ prix: p }).eq('id', z.id);
    charger();
  }
  async function suppr(z) {
    if (!confirm(`Supprimer la zone ${z.nom} ?`)) return;
    await supabase.from('delivery_zones').delete().eq('id', z.id);
    charger();
  }

  return (
    <div className="space-y-3">
      <p className="text-gray-700">Le client choisit sa zone et le prix de livraison s’ajoute au total.</p>
      {zones.map((z) => (
        <div key={z.id} className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 p-3">
          <div className="min-w-0"><p className="truncate font-bold">{z.nom}</p><p>{fcfa(z.prix)}</p></div>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => modifier(z)} className="btn-sm bg-white !px-3 !py-2">Prix</button>
            <button onClick={() => suppr(z)} className="btn-sm bg-red-50 !px-3 !py-2 text-red-700">✕</button>
          </div>
        </div>
      ))}
      <form onSubmit={ajouter} className="space-y-2">
        <input className="input" placeholder="Zone (ex : Agoè)" value={nom} onChange={(e) => setNom(e.target.value)} />
        <input className="input" inputMode="numeric" placeholder="Prix livraison (ex : 1500)" value={prix} onChange={(e) => setPrix(e.target.value)} />
        <button className="btn-green">Ajouter la zone</button>
      </form>
    </div>
  );
}

function Abonnement({ shop }) {
  const [subs, setSubs] = useState([]);
  const [msg, setMsg] = useState('');
  const admin = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || '';
  const payNum = process.env.NEXT_PUBLIC_ADMIN_PAY_NUMBER || admin;

  const charger = useCallback(async () => {
    const { data } = await supabase.from('subscriptions').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(5);
    setSubs(data || []);
  }, [shop.id]);
  useEffect(() => { charger(); }, [charger]);

  async function demander(offre) {
    const o = OFFRES[offre];
    const { error } = await supabase.from('subscriptions').insert({ shop_id: shop.id, offre, montant: o.prix, statut_paiement: 'impaye' });
    if (error) return setMsg(messageErreur(error));
    charger();
    setMsg(`Demande envoyée. Paie ${fcfa(o.prix)} par Mixx by Yas ou Flooz au ${payNum}, puis envoie la preuve sur WhatsApp.`);
    if (admin) window.open(waLink(admin, `Bonjour, je veux l'offre ${o.nom} (${fcfa(o.prix)}/mois) pour ma boutique "${shop.nom_boutique}" (${shop.slug}). Je viens de payer. Code de transaction : `), '_blank');
  }

  return (
    <div className="space-y-3">
      <p className="text-lg">Offre actuelle : <b className="text-wa-dark">{OFFRES[shop.abonnement].nom}</b></p>
      {['start', 'pro'].filter((k) => k !== shop.abonnement).map((k) => (
        <div key={k} className="rounded-xl border-2 border-gray-200 p-3">
          <p className="text-lg font-extrabold">{OFFRES[k].nom} : <span className="text-promo">{fcfa(OFFRES[k].prix)}/mois</span></p>
          <p className="text-gray-700">{OFFRES[k].produits === Infinity ? 'Produits illimités' : `${OFFRES[k].produits} produits`}</p>
          <button onClick={() => demander(k)} className="btn-orange mt-2 py-3 text-base">Passer à {OFFRES[k].nom}</button>
        </div>
      ))}
      {msg && <p className="rounded-xl bg-orange-50 p-3 font-bold">{msg}</p>}
      {subs.length > 0 && (
        <div>
          <p className="font-bold">Mes demandes</p>
          {subs.map((s) => (
            <p key={s.id} className="text-sm text-gray-700">
              {OFFRES[s.offre].nom} · {fcfa(s.montant)} · {s.statut_paiement === 'paye' ? '✅ Payé' : '⏳ En attente'}
            </p>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-500">V1 : le paiement est vérifié à la main par TogoBoutik. Le paiement automatique (FedaPay / PayGate) viendra en V2.</p>
    </div>
  );
}

const FILTRES = [['', 'Toutes'], ['nouvelle', 'Nouvelles'], ['confirmee', 'Confirmées'], ['en_livraison', 'En livraison'], ['livree', 'Livrées'], ['annulee', 'Annulées']];

function OrdersTab({ shop, orders, reload }) {
  const [filtre, setFiltre] = useState('');
  const [busy, setBusy] = useState(null);
  const liste = orders.filter((o) => !filtre || o.statut === filtre);

  async function changer(o, statut) {
    setBusy(o.id);
    await supabase.from('orders').update({ statut }).eq('id', o.id);
    await reload();
    setBusy(null);
  }

  function msgWhatsapp(o) {
    return (
      `Bonjour ${o.nom_client}, c'est ${shop.nom_boutique}.\n` +
      `J'ai bien reçu ta commande : ${o.produit_nom || 'produit'} x${o.quantite}.\n` +
      `Total : ${fcfa(o.total)} (livraison ${fcfa(o.livraison_prix)} comprise).\n` +
      `Livraison : ${o.quartier}, ${o.repere || ''}.\n` +
      (o.mode_paiement === 'livraison' ? 'Paiement à la livraison.' : `Paiement ${PAIEMENTS[o.mode_paiement]} (code : ${o.code_transaction || '?'}).`) +
      `\nPeux-tu me confirmer ?`
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-extrabold">Commandes</h2>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTRES.map(([k, l]) => (
          <button key={k} onClick={() => setFiltre(k)} className={`shrink-0 rounded-full px-4 py-2 font-bold ${filtre === k ? 'bg-wa text-white' : 'bg-gray-100'}`}>{l}</button>
        ))}
      </div>

      {liste.length === 0 && (
        <div className="card text-center text-gray-600">
          <p className="text-4xl">📭</p>
          <p className="mt-1">Aucune commande ici. Partage ton lien pour en recevoir !</p>
        </div>
      )}

      {liste.map((o) => {
        const st = STATUTS[o.statut];
        const next = SUIVANT[o.statut];
        return (
          <div key={o.id} className="card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold">{o.nom_client}</p>
                <p className="text-sm text-gray-600">{new Date(o.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-extrabold ${st.cls}`}>{st.label}</span>
            </div>
            <p className="font-bold">{o.produit_nom || 'Produit'} x{o.quantite}</p>
            <p className="text-xl font-extrabold text-wa-dark">{fcfa(o.total)}</p>
            <p className="text-sm text-gray-700">📍 {o.quartier}{o.repere ? ` : ${o.repere}` : ''}</p>
            <p className="text-sm text-gray-700">📞 {o.telephone_client}</p>
            <p className="text-sm text-gray-700">
              💳 {PAIEMENTS[o.mode_paiement]}{o.code_transaction ? ` · code ${o.code_transaction}` : ''}
            </p>

            <a href={waLink(o.telephone_client, msgWhatsapp(o))} target="_blank" rel="noreferrer" className="btn-green py-3 text-base">
              💬 Contacter sur WhatsApp
            </a>
            <div className="flex gap-2">
              {next && (
                <button disabled={busy === o.id} onClick={() => changer(o, next.to)} className="btn-sm flex-1 bg-promo text-white">
                  {next.label}
                </button>
              )}
              {o.statut !== 'annulee' && o.statut !== 'livree' && (
                <button
                  disabled={busy === o.id}
                  onClick={() => confirm('Annuler cette commande ?') && changer(o, 'annulee')}
                  className="btn-sm bg-gray-100"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const cle = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function StatsTab({ orders }) {
  const valides = orders.filter((o) => o.statut !== 'annulee');
  const now = new Date();
  const auj = cle(now);

  const ventesAujourdhui = valides.filter((o) => cle(new Date(o.date)) === auj).reduce((s, o) => s + o.total, 0);
  const ventesMois = valides
    .filter((o) => { const d = new Date(o.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((s, o) => s + o.total, 0);

  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const total = valides.filter((o) => cle(new Date(o.date)) === cle(d)).reduce((s, o) => s + o.total, 0);
    return { label: JOURS[d.getDay()], total };
  });
  const max = Math.max(...jours.map((j) => j.total), 1);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-extrabold">Dashboard</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-sm font-bold text-gray-600">Ventes aujourd’hui</p>
          <p className="text-2xl font-extrabold text-wa-dark">{fcfa(ventesAujourdhui)}</p>
        </div>
        <div className="card">
          <p className="text-sm font-bold text-gray-600">Ventes ce mois</p>
          <p className="text-2xl font-extrabold text-wa-dark">{fcfa(ventesMois)}</p>
        </div>
      </div>
      <div className="card">
        <p className="text-sm font-bold text-gray-600">Nombre de commandes</p>
        <p className="text-3xl font-extrabold">{valides.length}</p>
        <p className="text-sm text-gray-600">
          {orders.filter((o) => o.statut === 'nouvelle').length} nouvelle(s) à traiter
        </p>
      </div>

      <div className="card">
        <p className="mb-3 text-lg font-extrabold">Les 7 derniers jours</p>
        <div className="flex h-40 items-end gap-2">
          {jours.map((j, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
              <span className="mb-1 text-[11px] font-bold text-gray-600">{j.total ? Math.round(j.total / 1000) + 'k' : ''}</span>
              <div
                className={`w-full rounded-t-lg ${i === 6 ? 'bg-wa' : 'bg-green-200'}`}
                style={{ height: `${Math.max((j.total / max) * 100, j.total ? 6 : 2)}%` }}
              />
              <span className="mt-1 text-xs font-bold">{j.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">Montants en milliers de FCFA (k). Commandes annulées non comptées.</p>
      </div>
    </div>
  );
}

const ONGLETS = [
  { id: 'boutique', label: 'Boutique', icon: '🛍️' },
  { id: 'commandes', label: 'Commandes', icon: '📦' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
];

function Dashboard() {
  const router = useRouter();
  const [uid, setUid] = useState(null);
  const [shop, setShop] = useState(undefined);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('boutique');

  const chargerShop = useCallback(async (userId) => {
    const { data } = await supabase.from('shops').select('*').eq('user_id', userId).maybeSingle();
    setShop(data || null);
    return data;
  }, []);

  const chargerOrders = useCallback(async (shopId) => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('shop_id', shopId)
      .order('date', { ascending: false })
      .limit(300);
    setOrders(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace('/connexion');
      setUid(data.session.user.id);
      const s = await chargerShop(data.session.user.id);
      if (s) chargerOrders(s.id);
    })();
  }, [router, chargerShop, chargerOrders]);

  // Notifications in-app : on vérifie les nouvelles commandes toutes les 30 secondes
  useEffect(() => {
    if (!shop) return;
    const t = setInterval(() => chargerOrders(shop.id), 30000);
    return () => clearInterval(t);
  }, [shop, chargerOrders]);

  async function quitter() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (shop === undefined) return <p className="p-6 text-gray-600">Chargement…</p>;
  if (shop === null)
    return (
      <main className="p-6">
        <p className="err">Aucune boutique trouvée pour ce compte.</p>
        <button onClick={quitter} className="btn-line mt-4">Me déconnecter</button>
      </main>
    );

  const nouvelles = orders.filter((o) => o.statut === 'nouvelle').length;

  return (
    <div className="pb-28">
      <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-xl font-extrabold">{shop.nom_boutique}</p>
          {shop.statut !== 'actif' && <p className="text-sm font-bold text-promo">Boutique {shop.statut === 'bloque' ? 'bloquée' : 'en pause'}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href={`/b/${shop.slug}`} className="btn-sm bg-gray-100">Voir</Link>
          <button onClick={quitter} className="btn-sm bg-gray-100">Sortir</button>
        </div>
      </header>

      <main className="px-4 py-4">
        {tab === 'boutique' && <BoutiqueTab shop={shop} uid={uid} onShopChange={() => chargerShop(uid)} />}
        {tab === 'commandes' && <OrdersTab shop={shop} orders={orders} reload={() => chargerOrders(shop.id)} />}
        {tab === 'dashboard' && <StatsTab orders={orders} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-xl">
          {ONGLETS.map((o) => (
            <button
              key={o.id}
              onClick={() => setTab(o.id)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-3 text-sm font-bold ${tab === o.id ? 'text-wa-dark' : 'text-gray-500'}`}
            >
              <span className="text-2xl">{o.icon}</span>
              {o.label}
              {o.id === 'commandes' && nouvelles > 0 && (
                <span className="absolute right-[22%] top-1 rounded-full bg-promo px-2 text-xs font-extrabold text-white">{nouvelles}</span>
              )}
              {tab === o.id && <span className="absolute top-0 h-1 w-12 rounded-b bg-wa" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function Admin() {
  const router = useRouter();
  const [ok, setOk] = useState(undefined);
  const [shops, setShops] = useState([]);
  const [subs, setSubs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [q, setQ] = useState('');

  const charger = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      supabase.from('shops').select('*, users(nom_complet, telephone)').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*, shops(nom_boutique, slug)').order('created_at', { ascending: false }),
      supabase.from('orders').select('shop_id, total, statut, date'),
    ]);
    setShops(a.data || []);
    setSubs(b.data || []);
    setOrders(c.data || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace('/connexion');
      const { data: u } = await supabase.from('users').select('role').eq('id', data.session.user.id).maybeSingle();
      if (!u || u.role !== 'super_admin') return setOk(false);
      setOk(true);
      charger();
    })();
  }, [router, charger]);

  async function statut(s, v) {
    await supabase.from('shops').update({ statut: v }).eq('id', s.id);
    charger();
  }
  async function offre(s, v) {
    await supabase.from('shops').update({ abonnement: v }).eq('id', s.id);
    charger();
  }
  async function marquerPaye(sub) {
    const debut = new Date();
    const fin = new Date(); fin.setDate(fin.getDate() + 30);
    const iso = (d) => d.toISOString().slice(0, 10);
    await supabase.from('subscriptions').update({ statut_paiement: 'paye', date_debut: iso(debut), date_fin: iso(fin) }).eq('id', sub.id);
    await supabase.from('shops').update({ abonnement: sub.offre }).eq('id', sub.shop_id);
    charger();
  }

  if (ok === undefined) return <p className="p-6 text-gray-600">Chargement…</p>;
  if (!ok)
    return (
      <main className="p-6">
        <p className="err">Accès réservé au super admin.</p>
        <Link href="/dashboard" className="btn-line mt-4">Retour</Link>
      </main>
    );

  const revenuVentes = (id) => orders.filter((o) => o.shop_id === id && o.statut !== 'annulee').reduce((s, o) => s + o.total, 0);
  const moisCle = new Date().toISOString().slice(0, 7);
  const payes = subs.filter((s) => s.statut_paiement === 'paye');
  const revenuMois = payes.filter((s) => (s.date_debut || '').startsWith(moisCle)).reduce((t, x) => t + x.montant, 0);
  const ventesMois = orders.filter((o) => o.statut !== 'annulee' && (o.date || '').startsWith(moisCle)).reduce((t, o) => t + o.total, 0);
  const impayes = subs.filter((s) => s.statut_paiement === 'impaye');
  const liste = shops.filter((s) => !q || (s.nom_boutique + s.slug + (s.users?.telephone || '')).toLowerCase().includes(q.toLowerCase()));

  return (
    <main className="space-y-4 px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Super admin</h1>
        <button onClick={async () => { await supabase.auth.signOut(); router.replace('/'); }} className="btn-sm bg-gray-100">Sortir</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card"><p className="text-sm font-bold text-gray-600">Boutiques</p><p className="text-3xl font-extrabold">{shops.length}</p></div>
        <div className="card"><p className="text-sm font-bold text-gray-600">Actives</p><p className="text-3xl font-extrabold text-wa-dark">{shops.filter((s) => s.statut === 'actif').length}</p></div>
        <div className="card col-span-2"><p className="text-sm font-bold text-gray-600">Revenus du mois (abonnements payés)</p><p className="text-3xl font-extrabold text-wa-dark">{fcfa(revenuMois)}</p></div>
        <div className="card"><p className="text-sm font-bold text-gray-600">Abonnements payés</p><p className="text-3xl font-extrabold text-wa-dark">{payes.length}</p></div>
        <div className="card"><p className="text-sm font-bold text-gray-600">Abonnements impayés</p><p className="text-3xl font-extrabold text-promo">{impayes.length}</p></div>
        <div className="card col-span-2"><p className="text-sm font-bold text-gray-600">Ventes des boutiques ce mois</p><p className="text-xl font-extrabold">{fcfa(ventesMois)}</p></div>
      </div>

      {impayes.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-extrabold">Demandes d’abonnement à valider</h2>
          {impayes.map((s) => (
            <div key={s.id} className="card flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-bold">{s.shops?.nom_boutique}</p>
                <p className="text-sm text-gray-600">{OFFRES[s.offre].nom} · {fcfa(s.montant)}</p>
              </div>
              <button onClick={() => marquerPaye(s)} className="btn-sm shrink-0 bg-wa text-white">Marquer payé</button>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xl font-extrabold">Toutes les boutiques</h2>
        <input className="input" placeholder="Chercher (nom, lien, téléphone)" value={q} onChange={(e) => setQ(e.target.value)} />
        {liste.map((s) => (
          <div key={s.id} className="card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/b/${s.slug}`} className="block truncate text-lg font-extrabold underline">{s.nom_boutique}</Link>
                <p className="text-sm text-gray-600">{s.users?.nom_complet} · {s.users?.telephone} · {s.ville}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-extrabold ${s.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.statut}</span>
            </div>
            <p className="text-sm">Ventes de la boutique : <b>{fcfa(revenuVentes(s.id))}</b></p>
            <div className="flex gap-2">
              <select className="input !py-3 !text-base" value={s.abonnement} onChange={(e) => offre(s, e.target.value)}>
                {Object.entries(OFFRES).map(([k, v]) => <option key={k} value={k}>{v.nom}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              {s.statut !== 'actif' && <button onClick={() => statut(s, 'actif')} className="btn-sm bg-wa text-white">Activer</button>}
              {s.statut !== 'pause' && <button onClick={() => statut(s, 'pause')} className="btn-sm bg-orange-100 text-promo">Mettre en pause</button>}
              {s.statut !== 'bloque' && <button onClick={() => confirm('Bloquer cette boutique ?') && statut(s, 'bloque')} className="btn-sm bg-red-50 text-red-700">Bloquer</button>}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2 pb-10">
        <h2 className="text-xl font-extrabold">Abonnements</h2>
        {subs.length === 0 && <p className="text-gray-600">Aucune demande.</p>}
        {subs.map((s) => (
          <p key={s.id} className="text-sm">
            {s.shops?.nom_boutique} · {OFFRES[s.offre].nom} · {fcfa(s.montant)} · {s.statut_paiement === 'paye' ? `✅ payé (jusqu’au ${s.date_fin})` : '⏳ impayé'}
          </p>
        ))}
      </section>
    </main>
  );
}

const VUES = ['inscription', 'connexion', 'boutiques', 'dashboard', 'admin'];

export default function Espace() {
  const [vue, setVue] = useState(null);
  useEffect(() => {
    const lire = () => {
      const v = window.location.hash.replace('#', '');
      setVue(VUES.includes(v) ? v : 'connexion');
      window.scrollTo(0, 0);
    };
    lire();
    window.addEventListener('hashchange', lire);
    return () => window.removeEventListener('hashchange', lire);
  }, []);
  if (!vue) return null;
  if (vue === 'inscription') return <Inscription />;
  if (vue === 'boutiques') return <Boutiques />;
  if (vue === 'dashboard') return <Dashboard />;
  if (vue === 'admin') return <Admin />;
  return <Connexion />;
}
