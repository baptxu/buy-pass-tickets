import { useEffect, useEffectEvent, useState } from 'react'
import { supabase } from '../lib/supabase'
import AvatarBadge from './AvatarBadge'

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-[24px] border border-[#2A2D3E] bg-[#161A25] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className={`mt-3 text-4xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}

export default function ClientProfile({
  session,
  orders = [],
  onBack,
  previewMode = false,
  previewProfile = null,
}) {
  const [profile, setProfile] = useState(previewProfile)
  const [form, setForm] = useState({
    full_name: previewProfile?.full_name || '',
    phone: previewProfile?.phone || '',
  })
  const [loading, setLoading] = useState(!previewMode)
  const [saving, setSaving] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadProfile = useEffectEvent(async () => {
    if (previewMode) return

    setLoading(true)
    setError('')

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, phone, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    const nextProfile = data || {
      id: session.user.id,
      full_name: '',
      phone: '',
      avatar_url: '',
    }

    setProfile(nextProfile)
    setForm({
      full_name: nextProfile.full_name || '',
      phone: nextProfile.phone || '',
    })
    setLoading(false)
  })

  useEffect(() => {
    loadProfile()
  }, [session?.user?.id, previewMode])

  async function saveProfile() {
    if (previewMode) {
      setProfile(current => ({ ...(current || {}), ...form }))
      setSuccess('Preview mise a jour localement.')
      setTimeout(() => setSuccess(''), 2000)
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    const payload = {
      id: session.user.id,
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
    }

    const { error: saveError } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    setProfile(current => ({ ...(current || {}), ...payload }))
    setSaving(false)
    setSuccess('Profil mis a jour.')
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (previewMode) {
      const localUrl = URL.createObjectURL(file)
      setProfile(current => ({ ...(current || {}), avatar_url: localUrl }))
      setSuccess('Photo de profil mise a jour en preview.')
      return
    }

    setAvatarLoading(true)
    setError('')
    setSuccess('')

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const path = `${session.user.id}/${Date.now()}-${safeName}`

    const upload = await supabase.storage
      .from('avatars')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (upload.error) {
      setError(upload.error.message)
      setAvatarLoading(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const avatarUrl = data?.publicUrl || ''

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: session.user.id,
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          avatar_url: avatarUrl,
        },
        { onConflict: 'id' }
      )

    if (updateError) {
      setError(updateError.message)
      setAvatarLoading(false)
      return
    }

    setProfile(current => ({ ...(current || {}), avatar_url: avatarUrl }))
    setAvatarLoading(false)
    setSuccess('Photo de profil mise a jour.')
  }

  async function sendPasswordReset() {
    if (previewMode) {
      setSuccess("Bouton de changement de mot de passe visible dans la preview.")
      return
    }

    setPasswordLoading(true)
    setError('')
    setSuccess('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(session.user.email, {
      redirectTo: window.location.origin + '?reset=true',
    })

    if (resetError) {
      setError(resetError.message)
      setPasswordLoading(false)
      return
    }

    setPasswordLoading(false)
    setSuccess(`Lien de changement de mot de passe envoye a ${session.user.email}.`)
  }

  const currentProfile = profile || previewProfile || {}
  const activeOrders = orders.filter(order => !order.archived)
  const sentOrders = orders.filter(order => order.status === 'sent')

  if (loading) {
    return (
      <div className="rounded-[28px] border border-[#2A2D3E] bg-[#161A25] p-10 text-center text-gray-400">
        Chargement du profil...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Mon profil</h2>
          <p className="mt-1 text-sm text-gray-400">Informations personnelles, securite du compte et historique d'achat.</p>
        </div>
        {onBack && (
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-2 rounded-lg">
            ← Retour
          </button>
        )}
      </div>

      <div className="rounded-[28px] border border-[#2A2D3E] bg-[radial-gradient(circle_at_top_left,_rgba(79,142,247,0.18),_transparent_36%),linear-gradient(135deg,#171B28,#10131D)] p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-4">
            <AvatarBadge profile={currentProfile} size="lg" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#7D89A8]">Photo de profil</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{currentProfile.full_name || session.user.email}</h3>
              <p className="mt-1 text-sm text-gray-400">
                La photo change ici, puis elle se reaffiche dans les avis publics et dans les salons de discussion.
              </p>
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[#4F8EF7]/40 bg-[#4F8EF7]/12 px-4 py-2 text-sm font-medium text-[#9EC0FF] transition-all hover:bg-[#4F8EF7]/18">
            {avatarLoading ? 'Envoi...' : 'Changer la photo'}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarLoading} />
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Achats actifs" value={activeOrders.length} accent="text-white" />
        <StatCard label="Billets recus" value={sentOrders.length} accent="text-[#72D3B3]" />
        <StatCard label="Email du compte" value={session.user.email?.split('@')[0] || 'Compte'} accent="text-[#9EC0FF]" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="rounded-[28px] border border-[#2A2D3E] bg-[#161A25] p-6">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">Informations personnelles</h3>
            <p className="mt-1 text-sm text-gray-400">Le profil centralise les informations visibles dans le compte.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.22em] text-gray-500">Email</label>
              <input value={session.user.email || ''} disabled className="w-full rounded-2xl border border-[#2A2D3E] bg-[#0F1117] px-4 py-3 text-sm text-gray-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.22em] text-gray-500">Nom complet</label>
              <input
                value={form.full_name}
                onChange={event => setForm(current => ({ ...current, full_name: event.target.value }))}
                placeholder="Prenom Nom"
                className="w-full rounded-2xl border border-[#2A2D3E] bg-[#0F1117] px-4 py-3 text-sm text-white focus:border-[#4F8EF7] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.22em] text-gray-500">Telephone</label>
              <input
                value={form.phone}
                onChange={event => setForm(current => ({ ...current, phone: event.target.value }))}
                placeholder="+33 6 00 00 00 00"
                className="w-full rounded-2xl border border-[#2A2D3E] bg-[#0F1117] px-4 py-3 text-sm text-white focus:border-[#4F8EF7] focus:outline-none"
              />
            </div>
          </div>

          {error && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
          {success && <p className="mt-4 rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-200">{success}</p>}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="rounded-full bg-[#4F8EF7] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#3a7ae0] disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              onClick={sendPasswordReset}
              disabled={passwordLoading}
              className="rounded-full border border-[#2A2D3E] px-5 py-2.5 text-sm font-medium text-gray-300 transition-all hover:text-white disabled:opacity-50"
            >
              {passwordLoading ? 'Envoi...' : 'Changer le mot de passe'}
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#2A2D3E] bg-[#161A25] p-6">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">Historique d'achat</h3>
            <p className="mt-1 text-sm text-gray-400">Resume rapide des evenements commandes depuis le compte.</p>
          </div>

          <div className="space-y-3">
            {orders.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#2A2D3E] px-4 py-8 text-center text-sm text-gray-500">
                Aucun achat pour le moment.
              </div>
            )}
            {orders.map(order => (
              <article key={order.id} className="rounded-[22px] border border-[#2A2D3E] bg-[#0F1117] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{order.event_name}</p>
                    <p className="mt-1 text-xs text-gray-500">{order.city} · {order.event_date} · {order.category}</p>
                  </div>
                  <span className="rounded-full border border-[#2A2D3E] px-3 py-1 text-xs text-gray-300">
                    {order.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-400">
                  {order.seats} place{order.seats > 1 ? 's' : ''} {order.price ? `· ${order.price}` : ''}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
