import { useEffect, useEffectEvent, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import ClientDashboard from './pages/ClientDashboard'
import CommunityPreview from './pages/CommunityPreview'

function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleReset() {
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6) { setError('Minimum 6 caractères.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else {
      setSuccess('Mot de passe changé ! Redirection...')
      setTimeout(() => supabase.auth.signOut(), 2000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/buypasslogo.png" alt="Buy Pass" className="h-16 mx-auto" />
        </div>
        <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-2xl p-8">
          <h2 className="text-white font-semibold text-lg mb-1">Nouveau mot de passe</h2>
          <p className="text-gray-400 text-sm mb-6">Choisis un nouveau mot de passe sécurisé.</p>
          <div className="mb-4">
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Nouveau mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
          </div>
          <div className="mb-6">
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Confirmer</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
          </div>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          {success && <p className="text-green-400 text-sm mb-4 bg-green-400/10 border border-green-400/20 rounded-lg p-3">{success}</p>}
          <button onClick={handleReset} disabled={loading || !password} className="w-full bg-[#4F8EF7] hover:bg-[#3a7ae0] text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50">
            {loading ? 'Chargement...' : 'Changer le mot de passe'}
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const searchParams = new URLSearchParams(window.location.search)
  const previewMode = searchParams.get('preview')
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isReset, setIsReset] = useState(false)

  const fetchRole = useEffectEvent(async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    setRole(data?.role || 'client')
    setLoading(false)
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchRole(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Détecter le lien de reset de mot de passe
      if (event === 'PASSWORD_RECOVERY') {
        setIsReset(true)
        setSession(session)
        setLoading(false)
        return
      }
      setSession(session)
      if (session) fetchRole(session.user.id)
      else { setRole(null); setLoading(false); setIsReset(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0F1117]">
      <div className="text-[#4F8EF7] text-lg">Chargement...</div>
    </div>
  )

  if (previewMode === 'community') {
    return <CommunityPreview section={searchParams.get('section') || 'all'} />
  }

  // Si l'utilisateur vient d'un lien reset → formulaire nouveau mdp
  if (isReset) return <ResetPassword />

  if (!session) return <Login />
  if (role === 'admin') return <AdminDashboard session={session} />
  return <ClientDashboard session={session} />
}

export default App
