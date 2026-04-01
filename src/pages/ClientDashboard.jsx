import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_MAP = {
  received:  { label: 'Demande reçue',      color: 'bg-gray-500/20 text-gray-300' },
  searching: { label: 'En recherche',        color: 'bg-blue-500/20 text-blue-300' },
  proposed:  { label: 'Prix proposé',        color: 'bg-purple-500/20 text-purple-300' },
  payment:   { label: 'Paiement en attente', color: 'bg-orange-500/20 text-orange-300' },
  confirmed: { label: 'Confirmée',           color: 'bg-teal-500/20 text-teal-300' },
  sent:      { label: 'Billets envoyés',     color: 'bg-green-500/20 text-green-300' },
}

const STEPS = ['Reçue', 'Recherche', 'Prix proposé', 'Paiement', 'Confirmée', 'Billets envoyés']
const STEP_KEYS = ['received', 'searching', 'proposed', 'payment', 'confirmed', 'sent']

function PageCGU({ onBack }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Conditions Générales d'Utilisation</h2>
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-2 rounded-lg">← Retour</button>
      </div>
      <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl p-8 text-sm text-gray-300 leading-relaxed space-y-4">
        <p className="text-gray-500 text-xs">Dernière mise à jour : janvier 2025</p>
        <section><h3 className="text-white font-semibold mb-1">1. Objet</h3><p>Les présentes CGU régissent l'utilisation de Buy Pass Tickets. En utilisant ce service, vous les acceptez sans réserve.</p></section>
        <section><h3 className="text-white font-semibold mb-1">2. Service</h3><p>Buy Pass Tickets est un intermédiaire pour l'achat de billets (concerts, matchs, festivals). Nous ne sommes pas une billetterie officielle.</p></section>
        <section><h3 className="text-white font-semibold mb-1">3. Commandes</h3><p>La soumission d'une demande n'est pas un engagement. L'engagement intervient à l'acceptation du prix. Le paiement confirme la commande définitivement.</p></section>
        <section><h3 className="text-white font-semibold mb-1">4. Prix</h3><p>Les prix incluent les frais de service et peuvent dépasser les prix officiels. Le paiement s'effectue selon les modalités communiquées par messagerie.</p></section>
        <section><h3 className="text-white font-semibold mb-1">5. Authenticité</h3><p>Nous garantissons des billets authentiques. En cas de billet invalide à l'entrée, un remboursement intégral sera proposé.</p></section>
        <section><h3 className="text-white font-semibold mb-1">6. Données personnelles</h3><p>Vos données sont traitées conformément au RGPD et utilisées uniquement pour la gestion de vos commandes. Contact : contact@buypasstickets.fr</p></section>
        <section><h3 className="text-white font-semibold mb-1">7. Responsabilité</h3><p>Buy Pass Tickets ne peut être tenu responsable des annulations décidées par les organisateurs d'événements.</p></section>
      </div>
    </div>
  )
}

export default function ClientDashboard({ session }) {
  const [orders, setOrders] = useState([])
  const [view, setView] = useState('list')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [activeTab, setActiveTab] = useState('detail')
  const [form, setForm] = useState({
    event_type: 'Concert', event_name: '', event_date: '',
    city: '', seats: 2, category: 'Fosse', budget: '', notes: ''
  })

  useEffect(() => { fetchOrders() }, [])

  async function fetchOrders() {
    const { data } = await supabase.from('orders').select('*').eq('client_id', session.user.id).order('created_at', { ascending: false })
    setOrders(data || [])
  }

  async function openOrder(order) {
    setSelectedOrder(order)
    setActiveTab('detail')
    const { data } = await supabase.from('messages').select('*').eq('order_id', order.id).order('created_at')
    setMessages(data || [])
    setView('detail')
  }

  async function sendMessage() {
    if (!newMsg.trim()) return
    await supabase.from('messages').insert({ order_id: selectedOrder.id, sender_id: session.user.id, sender_role: 'client', content: newMsg })
    setNewMsg('')
    const { data } = await supabase.from('messages').select('*').eq('order_id', selectedOrder.id).order('created_at')
    setMessages(data || [])
  }

  async function submitOrder() {
    await supabase.from('orders').insert({ ...form, client_id: session.user.id, status: 'received' })
    setForm({ event_type: 'Concert', event_name: '', event_date: '', city: '', seats: 2, category: 'Fosse', budget: '', notes: '' })
    fetchOrders()
    setView('list')
  }

  async function logout() { await supabase.auth.signOut() }

  return (
    <div className="min-h-screen bg-[#0F1117]">
      <div className="bg-[#1A1D27] border-b border-[#2A2D3E] px-6 py-4 flex items-center justify-between">
        <button onClick={() => setView('list')}>
          <img src="/buypasslogo.png" alt="Buy Pass" className="h-8" />
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => setView('cgu')} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-1 rounded-lg transition-all">CGU</button>
          <span className="text-gray-400 text-sm hidden sm:block">{session.user.email}</span>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-1 rounded-lg">Déconnexion</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {view === 'cgu' && <PageCGU onBack={() => setView('list')} />}

        {view === 'list' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Mes demandes</h2>
                <p className="text-gray-400 text-sm mt-1">Suivez l'avancement de vos commandes</p>
              </div>
              <button onClick={() => setView('new')} className="bg-[#4F8EF7] hover:bg-[#3a7ae0] text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nouvelle demande</button>
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-20 text-gray-500">Aucune demande pour l'instant</div>
            ) : (
              <div className="flex flex-col gap-4">
                {orders.map(order => {
                  const s = STATUS_MAP[order.status]
                  const idx = STEP_KEYS.indexOf(order.status)
                  return (
                    <div key={order.id} onClick={() => openOrder(order)} className="bg-[#1A1D27] border border-[#2A2D3E] hover:border-[#4F8EF7] rounded-xl p-5 cursor-pointer transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-white text-lg">{order.event_name}</h3>
                          <p className="text-gray-400 text-sm mt-1">{order.city} · {order.event_date} · {order.seats} place{order.seats > 1 ? 's' : ''} · {order.category}</p>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
                      </div>
                      <div className="flex items-center mt-4">
                        {STEPS.map((step, i) => (
                          <div key={i} className="flex items-center flex-1">
                            <div className="flex flex-col items-center">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${i < idx ? 'bg-[#1D9E75] border-[#1D9E75]' : i === idx ? 'border-[#4F8EF7] bg-[#4F8EF7]/20' : 'border-[#2A2D3E]'}`}>
                                {i < idx && <span className="text-white text-[8px]">✓</span>}
                              </div>
                              <span className="text-[9px] text-gray-500 mt-1 text-center w-12">{step}</span>
                            </div>
                            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mb-4 ${i < idx ? 'bg-[#1D9E75]' : 'bg-[#2A2D3E]'}`}></div>}
                          </div>
                        ))}
                      </div>
                      {order.price && <p className="text-sm text-gray-300 mt-3">Prix : <span className="text-[#1D9E75] font-semibold">{order.price}</span></p>}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {view === 'new' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Nouvelle demande</h2>
              <button onClick={() => setView('list')} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-2 rounded-lg">← Retour</button>
            </div>
            <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl p-6 max-w-lg">
              {[
                { label: "Type d'événement", key: 'event_type', type: 'select', options: ['Concert', 'Football', 'Festival'] },
                { label: "Nom de l'événement", key: 'event_name', type: 'text', placeholder: 'Ex : PSG vs Real Madrid' },
                { label: 'Date', key: 'event_date', type: 'date' },
                { label: 'Ville', key: 'city', type: 'text', placeholder: 'Paris' },
                { label: 'Nombre de places', key: 'seats', type: 'number' },
                { label: 'Catégorie', key: 'category', type: 'select', options: ['Fosse', 'Fosse Or', 'Catégorie 1', 'Catégorie 2', 'Catégorie 3', 'Catégorie 4', 'Carré Or', 'Loge / VIP'] },
                { label: 'Budget max (optionnel)', key: 'budget', type: 'text', placeholder: '150€ par place' },
              ].map(f => (
                <div key={f.key} className="mb-4">
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">{f.label}</label>
                  {f.type === 'select' ? (
                    <select value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]">
                      {f.options.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={f.type} value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} placeholder={f.placeholder} className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                  )}
                </div>
              ))}
              <div className="mb-6">
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} placeholder="Précisions..." className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7] resize-none" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setView('list')} className="border border-[#2A2D3E] text-gray-400 px-4 py-2 rounded-lg text-sm">Annuler</button>
                <button onClick={submitOrder} className="bg-[#4F8EF7] hover:bg-[#3a7ae0] text-white px-6 py-2 rounded-lg text-sm font-medium">Envoyer ma demande</button>
              </div>
            </div>
          </>
        )}

        {view === 'detail' && selectedOrder && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{selectedOrder.event_name}</h2>
              <button onClick={() => setView('list')} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-2 rounded-lg">← Retour</button>
            </div>
            <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl p-6">
              <div className="flex gap-4 border-b border-[#2A2D3E] mb-6">
                {['detail', 'messages'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-medium border-b-2 transition-all ${activeTab === tab ? 'border-[#4F8EF7] text-white' : 'border-transparent text-gray-400'}`}>
                    {tab === 'detail' ? 'Détail' : 'Messages'}
                  </button>
                ))}
              </div>
              {activeTab === 'detail' && (
                <div>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                      ['Événement', selectedOrder.event_name],
                      ['Type', selectedOrder.event_type],
                      ['Date', selectedOrder.event_date],
                      ['Ville', selectedOrder.city],
                      ['Places', `${selectedOrder.seats} × ${selectedOrder.category}`],
                      ['Statut', STATUS_MAP[selectedOrder.status]?.label],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-[#0F1117] rounded-lg p-3">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{k}</div>
                        <div className="text-sm font-medium text-white">{v}</div>
                      </div>
                    ))}
                  </div>
                  {selectedOrder.price && (
                    <div className="bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-300">Prix total proposé : <span className="text-[#1D9E75] font-bold text-lg">{selectedOrder.price}</span></p>
                    </div>
                  )}
                  {selectedOrder.ticket_url && (
                    <a href={selectedOrder.ticket_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#4F8EF7] hover:bg-[#3a7ae0] text-white px-4 py-2 rounded-lg text-sm">
                      🎟️ Accéder à mes billets
                    </a>
                  )}
                </div>
              )}
              {activeTab === 'messages' && (
                <div>
                  <div className="flex flex-col gap-3 max-h-64 overflow-y-auto mb-4 p-2">
                    {messages.length === 0 && <p className="text-gray-500 text-sm text-center py-8">Aucun message</p>}
                    {messages.map(m => (
                      <div key={m.id} className={`flex ${m.sender_role === 'client' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-4 py-2 rounded-xl text-sm ${m.sender_role === 'client' ? 'bg-[#4F8EF7] text-white' : 'bg-[#0F1117] border border-[#2A2D3E] text-gray-200'}`}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Votre message..." className="flex-1 bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                    <button onClick={sendMessage} className="bg-[#4F8EF7] hover:bg-[#3a7ae0] text-white px-4 py-2 rounded-lg text-sm">Envoyer</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  )
}