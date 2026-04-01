import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onShowAbout }) {
  const [mode, setMode] = useState('login') // login | register | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError('')
    setSuccess('')
    setLoading(true)

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '?reset=true',
      })
      if (error) setError(error.message)
      else setSuccess('Un email de réinitialisation a été envoyé à ' + email)
      setLoading(false)
      return
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin }
      })
      if (error) { setError(error.message); setLoading(false); return }
      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: fullName,
          phone: phone,
          role: 'client'
        })
        setSuccess('Compte créé ! 📧 Vérifie ta boîte mail et clique sur le lien de confirmation avant de te connecter.')
        setMode('login')
        setLoading(false)
        return
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/buypasslogo.png" alt="Buy Pass" className="h-16 mx-auto" />
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={onShowAbout}
              className="rounded-full border border-[#2A2D3E] px-3 py-1.5 text-xs text-gray-400 transition-all hover:text-white"
            >
              À propos
            </button>
          </div>
        </div>
        <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-2xl p-8">

          {mode !== 'forgot' && (
            <div className="flex bg-[#0F1117] rounded-lg p-1 mb-6">
              <button onClick={() => { setMode('login'); setError(''); setSuccess('') }} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'login' ? 'bg-[#4F8EF7] text-white' : 'text-gray-400'}`}>Connexion</button>
              <button onClick={() => { setMode('register'); setError(''); setSuccess('') }} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'register' ? 'bg-[#4F8EF7] text-white' : 'text-gray-400'}`}>Créer un compte</button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-6">
              <h2 className="text-white font-semibold text-lg mb-1">Mot de passe oublié</h2>
              <p className="text-gray-400 text-sm">Entre ton email pour recevoir un lien de réinitialisation.</p>
            </div>
          )}

          {mode === 'register' && (
            <>
              <div className="mb-4">
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Prénom & Nom</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jean Dupont" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
              </div>
              <div className="mb-4">
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Téléphone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6 00 00 00 00" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
              </div>
            </>
          )}

          <div className="mb-4">
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
          </div>

          {mode !== 'forgot' && (
            <div className="mb-2">
              <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
            </div>
          )}

          {mode === 'login' && (
            <div className="mb-5 text-right">
              <button onClick={() => { setMode('forgot'); setError(''); setSuccess('') }} className="text-xs text-gray-500 hover:text-[#4F8EF7] transition-colors">
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {mode !== 'login' && <div className="mb-5" />}

          {mode === 'register' && (
            <p className="text-xs text-gray-500 mb-4 bg-[#0F1117] rounded-lg p-3 border border-[#2A2D3E]">
              📧 Un email de confirmation te sera envoyé. Tu devras cliquer sur le lien pour activer ton compte.
            </p>
          )}

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          {success && <p className="text-green-400 text-sm mb-4 bg-green-400/10 border border-green-400/20 rounded-lg p-3">{success}</p>}

          <button onClick={handleSubmit} disabled={loading} className="w-full bg-[#4F8EF7] hover:bg-[#3a7ae0] text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50">
            {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : mode === 'register' ? 'Créer mon compte' : 'Envoyer le lien'}
          </button>

          {mode === 'forgot' && (
            <div className="mt-4 text-center">
              <button onClick={() => { setMode('login'); setError(''); setSuccess('') }} className="text-xs text-gray-500 hover:text-[#4F8EF7] transition-colors">
                ← Retour à la connexion
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
