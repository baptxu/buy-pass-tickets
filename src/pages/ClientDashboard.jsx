import { useState, useEffect, useEffectEvent } from 'react'
import { supabase } from '../lib/supabase'
import CommunityHub from '../components/CommunityHub'
import ClientProfile from '../components/ClientProfile'

const STATUS_MAP = {
  received:  { label: 'Demande reçue',      color: 'bg-gray-500/20 text-gray-300' },
  searching: { label: 'En recherche',        color: 'bg-blue-500/20 text-blue-300' },
  proposed:  { label: 'Prix proposé',        color: 'bg-purple-500/20 text-purple-300' },
  payment:   { label: 'Paiement en attente', color: 'bg-orange-500/20 text-orange-300' },
  confirmed: { label: 'Commande confirmée',           color: 'bg-teal-500/20 text-teal-300' },
  obtained:  { label: 'Billets obtenus', color: 'bg-cyan-500/20 text-cyan-300' },
  sent:      { label: 'Billets envoyés',     color: 'bg-green-500/20 text-green-300' },
}

const STEPS = ['Reçue', 'Recherche', 'Prix proposé', 'Paiement', 'Confirmée', 'Billets obtenus', 'Billets envoyés']
const STEP_KEYS = ['received', 'searching', 'proposed', 'payment', 'confirmed', 'obtained', 'sent']

function PageCGU({ onBack }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Conditions Générales d'Utilisation</h2>
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-2 rounded-lg">← Retour</button>
      </div>
      <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl p-8 text-sm text-gray-300 leading-relaxed space-y-4">
        <p className="text-gray-500 text-xs">Dernière mise à jour : janvier 2025</p>
        {[
          { title: '1. Objet', content: "Les présentes CGU régissent l'utilisation de Buy Pass Tickets. En utilisant ce service, vous les acceptez sans réserve." },
          { title: '2. Service', content: "Buy Pass Tickets est un intermédiaire pour l'achat de billets. Nous ne sommes pas une billetterie officielle." },
          { title: '3. Commandes', content: "La soumission d'une demande n'est pas un engagement. Le paiement confirme la commande définitivement." },
          { title: '4. Prix', content: "Les prix incluent les frais de service. Le paiement s'effectue selon les modalités communiquées par messagerie." },
          { title: '5. Authenticité', content: "Nous garantissons des billets authentiques. En cas de billet invalide, remboursement intégral." },
          { title: '6. Données', content: "Vos données sont traitées conformément au RGPD. Contact Instagram : @buy_pass_tickets" },
        ].map(s => (
          <section key={s.title}><h3 className="text-white font-semibold mb-1">{s.title}</h3><p>{s.content}</p></section>
        ))}
      </div>
    </div>
  )
}

export default function ClientDashboard({ session }) {
  const [orders, setOrders] = useState([])
  const [events, setEvents] = useState([])
  const [view, setView] = useState('list')
  const [communityNotice, setCommunityNotice] = useState('')
  const [communityFocusGroupId, setCommunityFocusGroupId] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [activeTab, setActiveTab] = useState('detail')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [isCustom, setIsCustom] = useState(false)
  const [form, setForm] = useState({
    event_type: 'Concert', event_name: '', event_date: '',
    city: '', seats: 2, category: '', budget: '', notes: ''
  })

  async function fetchOrders() {
    const { data } = await supabase.from('orders').select('*').eq('client_id', session.user.id).order('created_at', { ascending: false })
    setOrders(data || [])
  }

  async function fetchEvents() {
    const { data } = await supabase.from('events').select('*').eq('active', true).order('created_at', { ascending: false })
    setEvents(data || [])
  }

  const loadDashboardData = useEffectEvent(() => {
    fetchOrders()
    fetchEvents()
  })

  const acceptInviteFromUrl = useEffectEvent(async () => {
    const params = new URLSearchParams(window.location.search)
    const inviteToken = params.get('groupInvite')
    if (!inviteToken) return

    const { data, error } = await supabase.rpc('accept_group_invite', {
      invite_token: inviteToken,
    })

    if (error) {
      setCommunityNotice(`Invitation non acceptee: ${error.message}`)
      setView('community')
    } else {
      setCommunityFocusGroupId(data)
      setCommunityNotice('Invitation acceptee. Vous avez rejoint le groupe.')
      setView('community')
    }

    params.delete('groupInvite')
    const nextSearch = params.toString()
    window.history.replaceState({}, '', `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`)
  })

  useEffect(() => {
    loadDashboardData()
  }, [session.user.id])

  useEffect(() => {
    acceptInviteFromUrl()
  }, [session.user.id])

  function selectEvent(event) {
    setSelectedEvent(event)
    setIsCustom(false)
    setForm(f => ({
      ...f,
      event_name: event.name,
      event_type: event.event_type,
      event_date: '',
      city: '',
      category: '',
      budget: '',
    }))
  }

  function selectCustom() {
    setSelectedEvent(null)
    setIsCustom(true)
    setForm({ event_type: 'Concert', event_name: '', event_date: '', city: '', seats: 2, category: '', budget: '', notes: '' })
  }

  function selectDate(d) {
    setForm(f => ({ ...f, event_date: d.date, city: d.city }))
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
    setForm({ event_type: 'Concert', event_name: '', event_date: '', city: '', seats: 2, category: '', budget: '', notes: '' })
    setSelectedEvent(null)
    setIsCustom(false)
    fetchOrders()
    setView('list')
  }

  async function logout() { await supabase.auth.signOut() }

  const selectedDates = selectedEvent?.dates || []
  const selectedCats = selectedEvent?.categories || []

  return (
    <div className="min-h-screen bg-[#0F1117]">
      <div className="bg-[#1A1D27] border-b border-[#2A2D3E] px-6 py-4 flex items-center justify-between">
        <button onClick={() => setView('list')}><img src="/buypasslogo.png" alt="Buy Pass" className="h-8" /></button>
        <div className="flex items-center gap-3">
          <button onClick={() => setView('cgu')} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-1 rounded-lg transition-all">CGU</button>
          <button onClick={() => setView('profile')} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-1 rounded-lg transition-all">Profil</button>
          <button onClick={() => setView('community')} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-1 rounded-lg transition-all">Communauté</button>
          <span className="text-gray-400 text-sm hidden sm:block">{session.user.email}</span>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-1 rounded-lg">Déconnexion</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {view === 'cgu' && <PageCGU onBack={() => setView('list')} />}

        {view === 'profile' && (
          <ClientProfile
            session={session}
            orders={orders}
            onBack={() => setView('list')}
          />
        )}

        {view === 'community' && (
          <CommunityHub
            session={session}
            orders={orders}
            focusGroupId={communityFocusGroupId}
            entryNotice={communityNotice}
            onClearEntryNotice={() => setCommunityNotice('')}
            onBack={() => setView('list')}
          />
        )}

        {view === 'list' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div><h2 className="text-2xl font-bold text-white">Mes demandes</h2><p className="text-gray-400 text-sm mt-1">Suivez l'avancement de vos commandes</p></div>
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
                        <div><h3 className="font-semibold text-white text-lg">{order.event_name}</h3><p className="text-gray-400 text-sm mt-1">{order.city} · {order.event_date} · {order.seats} place{order.seats > 1 ? 's' : ''} · {order.category}</p></div>
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
              <button onClick={() => { setView('list'); setSelectedEvent(null); setIsCustom(false) }} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-2 rounded-lg">← Retour</button>
            </div>

            {/* Étape 1 : Choisir un événement */}
            {!selectedEvent && !isCustom && (
              <div>
                <p className="text-gray-400 text-sm mb-4">Sélectionnez un événement disponible ou créez une demande personnalisée :</p>
                <div className="grid grid-cols-1 gap-3 mb-4">
                  {events.map(event => (
                    <div key={event.id} onClick={() => selectEvent(event)} className="bg-[#1A1D27] border border-[#2A2D3E] hover:border-[#4F8EF7] rounded-xl p-4 cursor-pointer transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-white font-semibold">{event.name}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{event.event_type}</p>
                        </div>
                        <span className="text-xs bg-[#4F8EF7]/10 text-[#4F8EF7] border border-[#4F8EF7]/20 px-2 py-0.5 rounded-full">{event.event_type}</span>
                      </div>
                      {event.dates?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {event.dates.map((d, i) => (
                            <span key={i} className="text-xs bg-[#4F8EF7]/10 border border-[#4F8EF7]/20 text-[#4F8EF7] px-2 py-0.5 rounded-full">📅 {d.date} — {d.city}</span>
                          ))}
                        </div>
                      )}
                      {event.categories?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {event.categories.map((cat, i) => (
                            <span key={i} className="text-xs bg-[#0F1117] border border-[#2A2D3E] text-gray-300 px-2 py-0.5 rounded-full">{cat.name} — {cat.price}€</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={selectCustom} className="w-full border border-dashed border-[#2A2D3E] hover:border-[#4F8EF7] text-gray-400 hover:text-[#4F8EF7] py-4 rounded-xl text-sm transition-all">
                  ✏️ Autre événement (demande personnalisée)
                </button>
              </div>
            )}

            {/* Étape 2 : Formulaire */}
            {(selectedEvent || isCustom) && (
              <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl p-6 max-w-lg">
                {selectedEvent && (
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#2A2D3E]">
                    <p className="text-white font-semibold">{selectedEvent.name}</p>
                    <button onClick={() => { setSelectedEvent(null); setIsCustom(false) }} className="text-xs text-gray-500 hover:text-white border border-[#2A2D3E] px-2 py-1 rounded-lg">Changer</button>
                  </div>
                )}

                {isCustom && (
                  <>
                    <div className="mb-4">
                      <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Type</label>
                      <select value={form.event_type} onChange={e => setForm({...form, event_type: e.target.value})} className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]">
                        {['Concert', 'Football', 'Festival', 'Autre'].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Nom de l'événement</label>
                      <input type="text" value={form.event_name} onChange={e => setForm({...form, event_name: e.target.value})} placeholder="Ex : PSG vs Real Madrid" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                    </div>
                    <div className="mb-4">
                      <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Date</label>
                      <input type="text" value={form.event_date} onChange={e => setForm({...form, event_date: e.target.value})} placeholder="Ex : 15/09/2026" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                    </div>
                    <div className="mb-4">
                      <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Ville</label>
                      <input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Paris" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                    </div>
                  </>
                )}

                {/* Sélection date si événement prédéfini */}
                {selectedEvent && selectedDates.length > 0 && (
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Choisir une date</label>
                    <div className="flex flex-col gap-2">
                      {selectedDates.map((d, i) => (
                        <div key={i} onClick={() => selectDate(d)} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${form.event_date === d.date && form.city === d.city ? 'border-[#4F8EF7] bg-[#4F8EF7]/10' : 'border-[#2A2D3E] bg-[#0F1117] hover:border-[#4F8EF7]/50'}`}>
                          <span className="text-sm text-white">📅 {d.date}</span>
                          <span className="text-sm text-gray-400">📍 {d.city}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Nombre de places</label>
                  <input type="number" value={form.seats} onChange={e => setForm({...form, seats: e.target.value})} min="1" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                </div>

                {/* Sélection catégorie */}
                <div className="mb-4">
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Catégorie</label>
                  {selectedCats.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {selectedCats.map((cat, i) => (
                        <div key={i} onClick={() => setForm(f => ({ ...f, category: cat.name, budget: cat.price + '€' }))} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${form.category === cat.name ? 'border-[#4F8EF7] bg-[#4F8EF7]/10' : 'border-[#2A2D3E] bg-[#0F1117] hover:border-[#4F8EF7]/50'}`}>
                          <span className="text-sm text-white">{cat.name}</span>
                          <span className="text-sm font-semibold text-[#1D9E75]">{cat.price}€ / place</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <input type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Ex : Fosse, Cat 1..." className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                  )}
                </div>

                {/* Récapitulatif prix */}
                {form.category && form.budget && (
                  <div className="mb-4 bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded-lg p-3">
                    <p className="text-sm text-gray-300">💰 Prix estimé : <span className="text-[#1D9E75] font-bold">{parseInt(form.budget) * parseInt(form.seats) || form.budget}€</span> pour {form.seats} place{form.seats > 1 ? 's' : ''}</p>
                  </div>
                )}

                {isCustom && (
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Budget max (optionnel)</label>
                    <input type="text" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} placeholder="150€ par place" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                  </div>
                )}

                <div className="mb-6">
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Notes (optionnel)</label>
                  <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} placeholder="Précisions..." className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7] resize-none" />
                </div>

                <div className="flex gap-3 justify-end">
                  <button onClick={() => { setSelectedEvent(null); setIsCustom(false) }} className="border border-[#2A2D3E] text-gray-400 px-4 py-2 rounded-lg text-sm">← Retour</button>
                  <button onClick={submitOrder} disabled={!form.event_name || !form.category} className="bg-[#4F8EF7] hover:bg-[#3a7ae0] text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">Envoyer ma demande</button>
                </div>
              </div>
            )}
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
                    {[['Événement', selectedOrder.event_name], ['Type', selectedOrder.event_type], ['Date', selectedOrder.event_date], ['Ville', selectedOrder.city], ['Places', `${selectedOrder.seats} × ${selectedOrder.category}`], ['Statut', STATUS_MAP[selectedOrder.status]?.label]].map(([k, v]) => (
                      <div key={k} className="bg-[#0F1117] rounded-lg p-3"><div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{k}</div><div className="text-sm font-medium text-white">{v}</div></div>
                    ))}
                  </div>
                  {selectedOrder.price && <div className="bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded-lg p-4 mb-4"><p className="text-sm text-gray-300">Prix total proposé : <span className="text-[#1D9E75] font-bold text-lg">{selectedOrder.price}</span></p></div>}
                  {selectedOrder.ticket_url && <a href={selectedOrder.ticket_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#4F8EF7] hover:bg-[#3a7ae0] text-white px-4 py-2 rounded-lg text-sm">🎟️ Accéder à mes billets</a>}
                </div>
              )}
              {activeTab === 'messages' && (
                <div>
                  <div className="flex flex-col gap-3 max-h-64 overflow-y-auto mb-4 p-2">
                    {messages.length === 0 && <p className="text-gray-500 text-sm text-center py-8">Aucun message</p>}
                    {messages.map(m => (
                      <div key={m.id} className={`flex ${m.sender_role === 'client' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-4 py-2 rounded-xl text-sm ${m.sender_role === 'client' ? 'bg-[#4F8EF7] text-white' : 'bg-[#0F1117] border border-[#2A2D3E] text-gray-200'}`}>{m.content}</div>
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
