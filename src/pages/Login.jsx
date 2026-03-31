import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError('')
    setLoading(true)
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: fullName,
          phone: phone,
          role: 'client'
        })
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#4F8EF7]">Buy Pass Tickets</h1>
          <p className="text-gray-400 mt-2">Votre espace billetterie personnalisé</p>
        </div>
        <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-2xl p-8">
          <div className="flex bg-[#0F1117] rounded-lg p-1 mb-6">
            <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${isLogin ? 'bg-[#4F8EF7] text-white' : 'text-gray-400'}`}>Connexion</button>
            <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${!isLogin ? 'bg-[#4F8EF7] text-white' : 'text-gray-400'}`}>Créer un compte</button>
          </div>

          {!isLogin && (
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
          <div className="mb-6">
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          <button onClick={handleSubmit} disabled={loading} className="w-full bg-[#4F8EF7] hover:bg-[#3a7ae0] text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50">
            {loading ? 'Chargement...' : isLogin ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </div>
      </div>
    </div>
  )
}