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

const STATUS_KEYS = ['received', 'searching', 'proposed', 'payment', 'confirmed', 'sent']
const EMPTY_EVENT = { name: '', event_type: 'Concert', active: true, categories: [], dates: [] }

export default function AdminDashboard({ session }) {
  const [orders, setOrders] = useState([])
  const [profiles, setProfiles] = useState({})
  const [allProfiles, setAllProfiles] = useState([])
  const [events, setEvents] = useState([])
  const [view, setView] = useState('table')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [activeTab, setActiveTab] = useState('detail')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [editPrice, setEditPrice] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editTicket, setEditTicket] = useState('')
  const [editCost, setEditCost] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [eventForm, setEventForm] = useState(EMPTY_EVENT)
  const [editingEvent, setEditingEvent] = useState(null)
  const [newCatName, setNewCatName] = useState('')
  const [newCatPrice, setNewCatPrice] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newDateCity, setNewDateCity] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders(ordersData || [])
    const { data: profilesData } = await supabase.from('profiles').select('*').eq('role', 'client')
    const map = {}
    profilesData?.forEach(p => { map[p.id] = p })
    setProfiles(map)
    setAllProfiles(profilesData || [])
    const { data: eventsData } = await supabase.from('events').select('*').order('created_at', { ascending: false })
    setEvents(eventsData || [])
  }

  async function openOrder(order) {
    setSelectedOrder(order)
    setEditPrice(order.price || '')
    setEditStatus(order.status)
    setEditTicket(order.ticket_url || '')
    setEditCost(order.cost || '')
    setActiveTab('detail')
    const { data } = await supabase.from('messages').select('*').eq('order_id', order.id).order('created_at')
    setMessages(data || [])
    setView('detail')
  }

  async function saveOrder() {
    await supabase.from('orders').update({ status: editStatus, price: editPrice, ticket_url: editTicket, cost: editCost }).eq('id', selectedOrder.id)
    fetchAll()
    setView('table')
  }

  async function archiveOrder(orderId) {
    await supabase.from('orders').update({ archived: true }).eq('id', orderId)
    fetchAll()
    setView('table')
  }

  async function unarchiveOrder(orderId) {
    await supabase.from('orders').update({ archived: false }).eq('id', orderId)
    fetchAll()
  }

  async function sendMessage() {
    if (!newMsg.trim()) return
    await supabase.from('messages').insert({ order_id: selectedOrder.id, sender_id: session.user.id, sender_role: 'admin', content: newMsg })
    setNewMsg('')
    const { data } = await supabase.from('messages').select('*').eq('order_id', selectedOrder.id).order('created_at')
    setMessages(data || [])
  }

  async function saveEvent() {
    if (!eventForm.name.trim()) return
    if (editingEvent) {
      await supabase.from('events').update(eventForm).eq('id', editingEvent.id)
    } else {
      await supabase.from('events').insert(eventForm)
    }
    setEventForm(EMPTY_EVENT)
    setEditingEvent(null)
    fetchAll()
  }

  async function deleteEvent(id) {
    await supabase.from('events').delete().eq('id', id)
    fetchAll()
  }

  async function toggleEvent(event) {
    await supabase.from('events').update({ active: !event.active }).eq('id', event.id)
    fetchAll()
  }

  function startEditEvent(event) {
    setEditingEvent(event)
    setEventForm({ name: event.name, event_type: event.event_type, active: event.active, categories: event.categories || [], dates: event.dates || [] })
    setView('events')
  }

  function addCategory() {
    if (!newCatName.trim() || !newCatPrice.trim()) return
    setEventForm(f => ({ ...f, categories: [...f.categories, { name: newCatName, price: newCatPrice }] }))
    setNewCatName('')
    setNewCatPrice('')
  }

  function removeCategory(idx) {
    setEventForm(f => ({ ...f, categories: f.categories.filter((_, i) => i !== idx) }))
  }

  function addDate() {
    if (!newDate.trim() || !newDateCity.trim()) return
    setEventForm(f => ({ ...f, dates: [...(f.dates || []), { date: newDate, city: newDateCity }] }))
    setNewDate('')
    setNewDateCity('')
  }

  function removeDate(idx) {
    setEventForm(f => ({ ...f, dates: f.dates.filter((_, i) => i !== idx) }))
  }

  async function logout() { await supabase.auth.signOut() }

  const activeOrders = orders.filter(o => !o.archived)
  const archivedOrders = orders.filter(o => o.archived)
  const filtered = activeOrders.filter(o => {
    if (filterType !== 'all' && o.event_type !== filterType) return false
    if (filterStatus !== 'all' && o.status !== filterStatus) return false
    return true
  })

  const sentOrders = activeOrders.filter(o => o.status === 'sent')
  const totalCA = sentOrders.reduce((sum, o) => { const v = parseFloat((o.price||'0').replace(/[^0-9.]/g,'')); return sum+(isNaN(v)?0:v) }, 0)
  const totalCost = activeOrders.reduce((sum, o) => { const v = parseFloat((o.cost||'0').replace(/[^0-9.]/g,'')); return sum+(isNaN(v)?0:v) }, 0)
  const totalTickets = sentOrders.reduce((sum, o) => sum+(parseInt(o.seats)||0), 0)
  const totalProfit = totalCA - totalCost
  const statusStats = STATUS_KEYS.map(k => ({ key: k, label: STATUS_MAP[k].label, count: activeOrders.filter(o => o.status === k).length }))
  const clientOrders = (clientId) => activeOrders.filter(o => o.client_id === clientId)

  return (
    <div className="min-h-screen bg-[#0F1117] flex">
      <div className="w-56 bg-[#13151F] border-r border-[#2A2D3E] flex flex-col">
        <div className="px-5 py-5 border-b border-[#2A2D3E]">
          <img src="/buypasslogo.png" alt="Buy Pass" className="h-8" />
          <p className="text-xs text-gray-500 mt-2">Admin</p>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {[
            { icon: '📋', label: 'Commandes', key: 'table' },
            { icon: '🗂️', label: 'Kanban', key: 'kanban' },
            { icon: '📊', label: 'Analytics', key: 'analytics' },
            { icon: '👥', label: 'Clients', key: 'clients' },
            { icon: '🎟️', label: 'Événements', key: 'events' },
          ].map(item => (
            <button key={item.key} onClick={() => { setView(item.key); setEditingEvent(null); setEventForm(EMPTY_EVENT) }} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${view === item.key || (item.key === 'table' && view === 'detail') ? 'bg-[#4F8EF7]/10 text-[#4F8EF7]' : 'text-gray-400 hover:text-white hover:bg-[#1A1D27]'}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-[#2A2D3E]">
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1A1D27] w-full">🚪 Déconnexion</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6">

          {/* ÉVÉNEMENTS */}
          {view === 'events' && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Événements</h2>
                <p className="text-gray-400 text-sm mt-1">Gérez les événements visibles par les clients</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4">{editingEvent ? '✏️ Modifier' : '➕ Nouvel événement'}</h3>
                  <div className="mb-3">
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Nom</label>
                    <input value={eventForm.name} onChange={e => setEventForm(f => ({...f, name: e.target.value}))} placeholder="Ex : Céline Dion" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                  </div>
                  <div className="mb-3">
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Type</label>
                    <select value={eventForm.event_type} onChange={e => setEventForm(f => ({...f, event_type: e.target.value}))} className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]">
                      {['Concert', 'Football', 'Festival', 'Autre'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Dates & Villes */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Dates & Villes</label>
                    <div className="flex flex-col gap-2 mb-2">
                      {(eventForm.dates || []).map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-[#0F1117] rounded-lg px-3 py-2">
                          <span className="text-sm text-white">📅 {d.date} — 📍 {d.city}</span>
                          <button onClick={() => removeDate(idx)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={newDate} onChange={e => setNewDate(e.target.value)} placeholder="15/09/2026" className="flex-1 bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                      <input value={newDateCity} onChange={e => setNewDateCity(e.target.value)} placeholder="Paris" className="w-24 bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                      <button onClick={addDate} className="bg-[#4F8EF7]/20 text-[#4F8EF7] border border-[#4F8EF7]/30 px-3 py-2 rounded-lg text-sm hover:bg-[#4F8EF7]/30 transition-all">+</button>
                    </div>
                  </div>

                  {/* Catégories */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Catégories & Prix</label>
                    <div className="flex flex-col gap-2 mb-2">
                      {eventForm.categories.map((cat, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-[#0F1117] rounded-lg px-3 py-2">
                          <span className="text-sm text-white">{cat.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[#1D9E75] font-medium">{cat.price}€</span>
                            <button onClick={() => removeCategory(idx)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Ex : Catégorie 1" className="flex-1 bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                      <input value={newCatPrice} onChange={e => setNewCatPrice(e.target.value)} placeholder="200" className="w-20 bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                      <button onClick={addCategory} className="bg-[#4F8EF7]/20 text-[#4F8EF7] border border-[#4F8EF7]/30 px-3 py-2 rounded-lg text-sm hover:bg-[#4F8EF7]/30 transition-all">+</button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={saveEvent} className="flex-1 bg-[#4F8EF7] hover:bg-[#3a7ae0] text-white py-2.5 rounded-lg text-sm font-medium">{editingEvent ? 'Modifier' : 'Créer'}</button>
                    {editingEvent && <button onClick={() => { setEditingEvent(null); setEventForm(EMPTY_EVENT) }} className="border border-[#2A2D3E] text-gray-400 px-4 py-2.5 rounded-lg text-sm">Annuler</button>}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {events.length === 0 && <p className="text-center text-gray-500 py-16">Aucun événement créé</p>}
                  {events.map(event => (
                    <div key={event.id} className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-white font-medium">{event.name}</p>
                          <p className="text-gray-500 text-xs">{event.event_type}</p>
                        </div>
                        <button onClick={() => toggleEvent(event)} className={`text-xs px-2 py-1 rounded-full ${event.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {event.active ? '● Actif' : '○ Inactif'}
                        </button>
                      </div>
                      {event.dates?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {event.dates.map((d, i) => (
                            <span key={i} className="text-xs bg-[#4F8EF7]/10 border border-[#4F8EF7]/20 text-[#4F8EF7] px-2 py-0.5 rounded-full">📅 {d.date} — {d.city}</span>
                          ))}
                        </div>
                      )}
                      {event.categories?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {event.categories.map((cat, i) => (
                            <span key={i} className="text-xs bg-[#0F1117] border border-[#2A2D3E] text-gray-300 px-2 py-0.5 rounded-full">{cat.name} — {cat.price}€</span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => startEditEvent(event)} className="text-xs border border-[#2A2D3E] hover:border-[#4F8EF7] text-gray-300 hover:text-[#4F8EF7] px-3 py-1.5 rounded-lg transition-all">Modifier</button>
                        <button onClick={() => deleteEvent(event.id)} className="text-xs border border-[#2A2D3E] hover:border-red-400 text-gray-300 hover:text-red-400 px-3 py-1.5 rounded-lg transition-all">Supprimer</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TABLE */}
          {view === 'table' && (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div><h2 className="text-2xl font-bold text-white">Commandes</h2><p className="text-gray-400 text-sm mt-1">{activeOrders.length} commande{activeOrders.length > 1 ? 's' : ''} active{activeOrders.length > 1 ? 's' : ''}</p></div>
                <button onClick={() => setShowArchived(s => !s)} className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${showArchived ? 'border-orange-400/30 text-orange-400 bg-orange-400/10' : 'border-[#2A2D3E] text-gray-400 hover:text-white'}`}>
                  {showArchived ? '📦 Masquer archives' : `📦 Archives (${archivedOrders.length})`}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Actives', value: activeOrders.filter(o => o.status !== 'sent').length, color: 'text-[#4F8EF7]' },
                  { label: 'Nouvelles', value: activeOrders.filter(o => o.status === 'received').length, color: 'text-purple-400' },
                  { label: 'Paiements', value: activeOrders.filter(o => o.status === 'payment').length, color: 'text-orange-400' },
                  { label: 'Envoyées', value: activeOrders.filter(o => o.status === 'sent').length, color: 'text-green-400' },
                ].map(s => (
                  <div key={s.label} className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-2">{s.label}</p>
                    <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mb-4 flex-wrap">
                {['all', 'Concert', 'Football', 'Festival'].map(f => (
                  <button key={f} onClick={() => setFilterType(f)} className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${filterType === f ? 'bg-[#4F8EF7]/20 text-[#4F8EF7] border border-[#4F8EF7]/30' : 'border border-[#2A2D3E] text-gray-400 hover:text-white'}`}>
                    {f === 'all' ? 'Tous' : f}
                  </button>
                ))}
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="ml-auto bg-[#1A1D27] border border-[#2A2D3E] rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none">
                  <option value="all">Tous les statuts</option>
                  {STATUS_KEYS.map(k => <option key={k} value={k}>{STATUS_MAP[k].label}</option>)}
                </select>
              </div>
              <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl overflow-hidden mb-6">
                <table className="w-full">
                  <thead><tr className="border-b border-[#2A2D3E]">{['Client','Événement','Date','Places','Statut','Actions'].map(h=><th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                  <tbody>
                    {filtered.map(order => {
                      const s = STATUS_MAP[order.status]
                      const profile = profiles[order.client_id]
                      return (
                        <tr key={order.id} className="border-b border-[#2A2D3E] hover:bg-[#1E2130] transition-colors">
                          <td className="px-4 py-3"><p className="text-sm font-medium text-white">{profile?.full_name || 'Client'}</p><p className="text-xs text-gray-500">{profile?.phone || ''}</p></td>
                          <td className="px-4 py-3"><p className="text-sm text-white">{order.event_name}</p><p className="text-xs text-gray-500">{order.city} · {order.event_type}</p></td>
                          <td className="px-4 py-3 text-sm text-gray-300">{order.event_date}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{order.seats} × {order.category}</td>
                          <td className="px-4 py-3"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span></td>
                          <td className="px-4 py-3 flex gap-2">
                            <button onClick={() => openOrder(order)} className="text-xs border border-[#2A2D3E] hover:border-[#4F8EF7] text-gray-300 hover:text-[#4F8EF7] px-3 py-1.5 rounded-lg transition-all">Gérer</button>
                            <button onClick={() => archiveOrder(order.id)} className="text-xs border border-[#2A2D3E] hover:border-orange-400 text-gray-300 hover:text-orange-400 px-3 py-1.5 rounded-lg transition-all">Archiver</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && <p className="text-center text-gray-500 py-12">Aucune commande</p>}
              </div>
              {showArchived && (
                <div className="bg-[#1A1D27] border border-orange-400/20 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#2A2D3E]"><h3 className="text-sm font-medium text-orange-400">📦 Commandes archivées</h3></div>
                  <table className="w-full">
                    <tbody>
                      {archivedOrders.map(order => {
                        const profile = profiles[order.client_id]
                        return (
                          <tr key={order.id} className="border-b border-[#2A2D3E] opacity-60">
                            <td className="px-4 py-3 text-sm text-white">{profile?.full_name || 'Client'}</td>
                            <td className="px-4 py-3 text-sm text-gray-400">{order.event_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-400">{order.event_date}</td>
                            <td className="px-4 py-3"><button onClick={() => unarchiveOrder(order.id)} className="text-xs border border-[#2A2D3E] hover:border-green-400 text-gray-400 hover:text-green-400 px-3 py-1.5 rounded-lg transition-all">Restaurer</button></td>
                          </tr>
                        )
                      })}
                      {archivedOrders.length === 0 && <tr><td colSpan={4} className="text-center text-gray-500 py-8">Aucune commande archivée</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* KANBAN */}
          {view === 'kanban' && (
            <>
              <div className="mb-6"><h2 className="text-2xl font-bold text-white">Vue Kanban</h2></div>
              <div className="grid grid-cols-3 gap-4">
                {STATUS_KEYS.map(key => {
                  const s = STATUS_MAP[key]
                  const col = activeOrders.filter(o => o.status === key)
                  return (
                    <div key={key} className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
                        <span className="text-xs text-gray-500 bg-[#0F1117] px-2 py-0.5 rounded-full">{col.length}</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {col.map(order => (
                          <div key={order.id} onClick={() => openOrder(order)} className="bg-[#0F1117] border border-[#2A2D3E] hover:border-[#4F8EF7] rounded-lg p-3 cursor-pointer transition-all">
                            <p className="text-sm font-medium text-white mb-1">{order.event_name}</p>
                            <p className="text-xs text-gray-500">{profiles[order.client_id]?.full_name || 'Client'} · {order.seats} place{order.seats > 1 ? 's' : ''}</p>
                            {order.price && <p className="text-xs text-[#1D9E75] mt-1 font-medium">{order.price}</p>}
                          </div>
                        ))}
                        {col.length === 0 && <p className="text-xs text-gray-600 text-center py-4">Aucune commande</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ANALYTICS */}
          {view === 'analytics' && (
            <>
              <div className="mb-6"><h2 className="text-2xl font-bold text-white">Analytics</h2></div>
              <div className="grid grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'CA Total', value: totalCA.toFixed(0)+'€', sub: 'Commandes envoyées', color: 'text-green-400' },
                  { label: 'Coût Total', value: totalCost.toFixed(0)+'€', sub: 'Montant dépensé', color: 'text-red-400' },
                  { label: 'Bénéfice', value: totalProfit.toFixed(0)+'€', sub: 'CA - Coûts', color: totalProfit >= 0 ? 'text-[#4F8EF7]' : 'text-red-400' },
                  { label: 'Billets vendus', value: totalTickets, sub: 'Places envoyées', color: 'text-purple-400' },
                ].map(s => (
                  <div key={s.label} className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl p-5">
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-600 mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>
              <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl p-6 mb-6">
                <h3 className="text-white font-semibold mb-4">Commandes par statut</h3>
                <div className="flex flex-col gap-3">
                  {statusStats.map(s => (
                    <div key={s.key} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-40">{s.label}</span>
                      <div className="flex-1 bg-[#0F1117] rounded-full h-2"><div className="bg-[#4F8EF7] h-2 rounded-full" style={{ width: activeOrders.length > 0 ? `${(s.count/activeOrders.length)*100}%` : '0%' }} /></div>
                      <span className="text-xs text-white font-medium w-6 text-right">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Commandes avec prix</h3>
                <table className="w-full">
                  <thead><tr className="border-b border-[#2A2D3E]">{['Événement','Client','Prix vente','Coût','Marge'].map(h=><th key={h} className="pb-3 text-left text-xs text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                  <tbody>
                    {activeOrders.filter(o=>o.price).map(order=>{
                      const price=parseFloat((order.price||'0').replace(/[^0-9.]/g,''))
                      const cost=parseFloat((order.cost||'0').replace(/[^0-9.]/g,''))
                      const margin=price-cost
                      return(<tr key={order.id} className="border-b border-[#2A2D3E]">
                        <td className="py-3 text-sm text-white">{order.event_name}</td>
                        <td className="py-3 text-sm text-gray-400">{profiles[order.client_id]?.full_name||'Client'}</td>
                        <td className="py-3 text-sm text-green-400">{order.price||'-'}</td>
                        <td className="py-3 text-sm text-red-400">{order.cost||'-'}</td>
                        <td className={`py-3 text-sm font-medium ${margin>=0?'text-[#4F8EF7]':'text-red-400'}`}>{order.cost?margin.toFixed(0)+'€':'-'}</td>
                      </tr>)
                    })}
                  </tbody>
                </table>
                {activeOrders.filter(o=>o.price).length===0&&<p className="text-center text-gray-500 py-8">Aucune commande avec prix</p>}
              </div>
            </>
          )}

          {/* CLIENTS */}
          {view === 'clients' && (
            <>
              <div className="mb-6"><h2 className="text-2xl font-bold text-white">Clients</h2><p className="text-gray-400 text-sm mt-1">{allProfiles.length} client{allProfiles.length>1?'s':''} enregistré{allProfiles.length>1?'s':''}</p></div>
              <div className="grid grid-cols-1 gap-4">
                {allProfiles.map(client => {
                  const cOrders = clientOrders(client.id)
                  const lastOrder = cOrders[0]
                  return (
                    <div key={client.id} onClick={() => { setSelectedClient(client); setView('clientdetail') }} className="bg-[#1A1D27] border border-[#2A2D3E] hover:border-[#4F8EF7] rounded-xl p-5 cursor-pointer transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#4F8EF7]/20 flex items-center justify-center text-[#4F8EF7] font-bold">{client.full_name?.[0]?.toUpperCase()||'?'}</div>
                          <div><p className="text-white font-medium">{client.full_name||'Client inconnu'}</p><p className="text-gray-500 text-xs">{client.phone||'Pas de téléphone'}</p></div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white">{cOrders.length} commande{cOrders.length>1?'s':''}</p>
                          {lastOrder&&<p className="text-xs text-gray-500 mt-0.5">Dernière : {lastOrder.event_name}</p>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {allProfiles.length===0&&<p className="text-center text-gray-500 py-16">Aucun client</p>}
              </div>
            </>
          )}

          {/* FICHE CLIENT */}
          {view === 'clientdetail' && selectedClient && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#4F8EF7]/20 flex items-center justify-center text-[#4F8EF7] font-bold text-lg">{selectedClient.full_name?.[0]?.toUpperCase()||'?'}</div>
                  <div><h2 className="text-xl font-bold text-white">{selectedClient.full_name||'Client'}</h2><p className="text-gray-400 text-sm">{selectedClient.phone||'Pas de téléphone'}</p></div>
                </div>
                <button onClick={() => setView('clients')} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-2 rounded-lg">← Retour</button>
              </div>
              <div className="flex flex-col gap-4">
                {clientOrders(selectedClient.id).map(order => {
                  const s = STATUS_MAP[order.status]
                  return (
                    <div key={order.id} onClick={() => openOrder(order)} className="bg-[#1A1D27] border border-[#2A2D3E] hover:border-[#4F8EF7] rounded-xl p-5 cursor-pointer transition-all">
                      <div className="flex items-start justify-between">
                        <div><p className="text-white font-medium">{order.event_name}</p><p className="text-gray-500 text-xs mt-1">{order.city} · {order.event_date} · {order.seats} place{order.seats>1?'s':''}</p></div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
                      </div>
                      {order.price&&<p className="text-sm text-[#1D9E75] font-medium mt-2">{order.price}</p>}
                    </div>
                  )
                })}
                {clientOrders(selectedClient.id).length===0&&<p className="text-center text-gray-500 py-16">Aucune commande</p>}
              </div>
            </>
          )}

          {/* DETAIL COMMANDE */}
          {view === 'detail' && selectedOrder && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">{selectedOrder.event_name}</h2>
                <button onClick={() => setView('table')} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-2 rounded-lg">← Retour</button>
              </div>
              <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl p-6 max-w-2xl">
                <div className="flex gap-4 border-b border-[#2A2D3E] mb-6">
                  {['detail','messages','actions'].map(tab=>(
                    <button key={tab} onClick={()=>setActiveTab(tab)} className={`pb-3 text-sm font-medium border-b-2 transition-all ${activeTab===tab?'border-[#4F8EF7] text-white':'border-transparent text-gray-400'}`}>
                      {tab==='detail'?'Détail':tab==='messages'?'Messages':'Actions'}
                    </button>
                  ))}
                </div>
                {activeTab==='detail'&&(
                  <div className="grid grid-cols-2 gap-3">
                    {[['Client',profiles[selectedOrder.client_id]?.full_name||'N/A'],['Téléphone',profiles[selectedOrder.client_id]?.phone||'N/A'],['Événement',selectedOrder.event_name],['Type',selectedOrder.event_type],['Date',selectedOrder.event_date],['Ville',selectedOrder.city],['Places',`${selectedOrder.seats} × ${selectedOrder.category}`],['Budget',selectedOrder.budget||'Non précisé']].map(([k,v])=>(
                      <div key={k} className="bg-[#0F1117] rounded-lg p-3"><div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{k}</div><div className="text-sm font-medium text-white">{v}</div></div>
                    ))}
                    {selectedOrder.notes&&<div className="col-span-2 bg-[#0F1117] rounded-lg p-3"><div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</div><div className="text-sm text-white">{selectedOrder.notes}</div></div>}
                  </div>
                )}
                {activeTab==='messages'&&(
                  <div>
                    <div className="flex flex-col gap-3 max-h-64 overflow-y-auto mb-4 p-2">
                      {messages.length===0&&<p className="text-gray-500 text-sm text-center py-8">Aucun message</p>}
                      {messages.map(m=>(
                        <div key={m.id} className={`flex ${m.sender_role==='admin'?'justify-end':'justify-start'}`}>
                          <div className={`max-w-xs px-4 py-2 rounded-xl text-sm ${m.sender_role==='admin'?'bg-[#4F8EF7] text-white':'bg-[#0F1117] border border-[#2A2D3E] text-gray-200'}`}>{m.content}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage()} placeholder="Votre message..." className="flex-1 bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                      <button onClick={sendMessage} className="bg-[#4F8EF7] hover:bg-[#3a7ae0] text-white px-4 py-2 rounded-lg text-sm">Envoyer</button>
                    </div>
                  </div>
                )}
                {activeTab==='actions'&&(
                  <div className="flex flex-col gap-4">
                    <div><label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Statut</label>
                      <select value={editStatus} onChange={e=>setEditStatus(e.target.value)} className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]">
                        {STATUS_KEYS.map(k=><option key={k} value={k}>{STATUS_MAP[k].label}</option>)}
                      </select>
                    </div>
                    <div><label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Prix de vente</label><input value={editPrice} onChange={e=>setEditPrice(e.target.value)} placeholder="Ex : 280€" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" /></div>
                    <div><label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Coût d'achat</label><input value={editCost} onChange={e=>setEditCost(e.target.value)} placeholder="Ex : 200€" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" /></div>
                    <div><label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Lien billet</label><input value={editTicket} onChange={e=>setEditTicket(e.target.value)} placeholder="https://ticketmaster.fr/transfer/..." className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" /></div>
                    <div className="flex gap-3">
                      <button onClick={saveOrder} className="flex-1 bg-[#4F8EF7] hover:bg-[#3a7ae0] text-white py-2.5 rounded-lg text-sm font-medium">Enregistrer</button>
                      <button onClick={()=>archiveOrder(selectedOrder.id)} className="border border-orange-400/30 text-orange-400 hover:bg-orange-400/10 px-4 py-2.5 rounded-lg text-sm transition-all">📦 Archiver</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}