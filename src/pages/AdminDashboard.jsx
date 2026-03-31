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

export default function AdminDashboard({ session }) {
  const [orders, setOrders] = useState([])
  const [profiles, setProfiles] = useState({})
  const [view, setView] = useState('table')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [activeTab, setActiveTab] = useState('detail')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [editPrice, setEditPrice] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editTicket, setEditTicket] = useState('')

  useEffect(() => { fetchOrders() }, [])

  async function fetchOrders() {
    const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders(ordersData || [])
    const { data: profilesData } = await supabase.from('profiles').select('id, full_name, phone')
    const map = {}
    profilesData?.forEach(p => { map[p.id] = p })
    setProfiles(map)
  }

  async function openOrder(order) {
    setSelectedOrder(order)
    setEditPrice(order.price || '')
    setEditStatus(order.status)
    setEditTicket(order.ticket_url || '')
    setActiveTab('detail')
    const { data } = await supabase.from('messages').select('*').eq('order_id', order.id).order('created_at')
    setMessages(data || [])
    setView('detail')
  }

  async function saveOrder() {
    await supabase.from('orders').update({ status: editStatus, price: editPrice, ticket_url: editTicket }).eq('id', selectedOrder.id)
    fetchOrders()
    setView('table')
  }

  async function sendMessage() {
    if (!newMsg.trim()) return
    await supabase.from('messages').insert({ order_id: selectedOrder.id, sender_id: session.user.id, sender_role: 'admin', content: newMsg })
    setNewMsg('')
    const { data } = await supabase.from('messages').select('*').eq('order_id', selectedOrder.id).order('created_at')
    setMessages(data || [])
  }

  async function logout() { await supabase.auth.signOut() }

  const filtered = orders.filter(o => {
    if (filterType !== 'all' && o.event_type !== filterType) return false
    if (filterStatus !== 'all' && o.status !== filterStatus) return false
    return true
  })

  const stats = {
    active: orders.filter(o => o.status !== 'sent').length,
    waiting: orders.filter(o => o.status === 'received').length,
    payment: orders.filter(o => o.status === 'payment').length,
    sent: orders.filter(o => o.status === 'sent').length,
  }

  return (
    <div className="min-h-screen bg-[#0F1117] flex">
      <div className="w-56 bg-[#13151F] border-r border-[#2A2D3E] flex flex-col">
        <div className="px-5 py-5 border-b border-[#2A2D3E]">
          <img src="/buypasslogo.png" alt="Buy Pass" className="h-8" />
          <p className="text-xs text-gray-500 mt-2">Admin</p>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          <button onClick={() => setView('table')} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${view === 'table' || view === 'detail' ? 'bg-[#4F8EF7]/10 text-[#4F8EF7]' : 'text-gray-400 hover:text-white hover:bg-[#1A1D27]'}`}>
            📋 Commandes
          </button>
          <button onClick={() => setView('kanban')} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${view === 'kanban' ? 'bg-[#4F8EF7]/10 text-[#4F8EF7]' : 'text-gray-400 hover:text-white hover:bg-[#1A1D27]'}`}>
            🗂️ Kanban
          </button>
        </nav>
        <div className="px-3 py-4 border-t border-[#2A2D3E]">
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1A1D27] w-full">
            🚪 Déconnexion
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6">

          {view === 'table' && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Tableau de bord</h2>
                <p className="text-gray-400 text-sm mt-1">Gestion de toutes vos commandes</p>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Commandes actives', value: stats.active, color: 'text-[#4F8EF7]' },
                  { label: 'Nouvelles demandes', value: stats.waiting, color: 'text-purple-400' },
                  { label: 'Paiements attendus', value: stats.payment, color: 'text-orange-400' },
                  { label: 'Billets envoyés', value: stats.sent, color: 'text-[#1D9E75]' },
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
              <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2A2D3E]">
                      {['Client', 'Événement', 'Date', 'Places', 'Statut', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(order => {
                      const s = STATUS_MAP[order.status]
                      const profile = profiles[order.client_id]
                      return (
                        <tr key={order.id} className="border-b border-[#2A2D3E] hover:bg-[#1E2130] transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-white">{profile?.full_name || 'Client'}</p>
                            <p className="text-xs text-gray-500">{profile?.phone || ''}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-white">{order.event_name}</p>
                            <p className="text-xs text-gray-500">{order.city} · {order.event_type}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">{order.event_date}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{order.seats} × {order.category}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => openOrder(order)} className="text-xs border border-[#2A2D3E] hover:border-[#4F8EF7] text-gray-300 hover:text-[#4F8EF7] px-3 py-1.5 rounded-lg transition-all">Gérer</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && <p className="text-center text-gray-500 py-12">Aucune commande</p>}
              </div>
            </>
          )}

          {view === 'kanban' && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Vue Kanban</h2>
                <p className="text-gray-400 text-sm mt-1">Visualisez toutes vos commandes par statut</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {STATUS_KEYS.map(key => {
                  const s = STATUS_MAP[key]
                  const col = orders.filter(o => o.status === key)
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

          {view === 'detail' && selectedOrder && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">{selectedOrder.event_name}</h2>
                <button onClick={() => setView('table')} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-2 rounded-lg">← Retour</button>
              </div>
              <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl p-6 max-w-2xl">
                <div className="flex gap-4 border-b border-[#2A2D3E] mb-6">
                  {['detail', 'messages', 'actions'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-medium border-b-2 transition-all ${activeTab === tab ? 'border-[#4F8EF7] text-white' : 'border-transparent text-gray-400'}`}>
                      {tab === 'detail' ? 'Détail' : tab === 'messages' ? 'Messages' : 'Actions'}
                    </button>
                  ))}
                </div>
                {activeTab === 'detail' && (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Client', profiles[selectedOrder.client_id]?.full_name || 'N/A'],
                      ['Téléphone', profiles[selectedOrder.client_id]?.phone || 'N/A'],
                      ['Événement', selectedOrder.event_name],
                      ['Type', selectedOrder.event_type],
                      ['Date', selectedOrder.event_date],
                      ['Ville', selectedOrder.city],
                      ['Places', `${selectedOrder.seats} × ${selectedOrder.category}`],
                      ['Budget', selectedOrder.budget || 'Non précisé'],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-[#0F1117] rounded-lg p-3">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{k}</div>
                        <div className="text-sm font-medium text-white">{v}</div>
                      </div>
                    ))}
                    {selectedOrder.notes && (
                      <div className="col-span-2 bg-[#0F1117] rounded-lg p-3">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</div>
                        <div className="text-sm text-white">{selectedOrder.notes}</div>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'messages' && (
                  <div>
                    <div className="flex flex-col gap-3 max-h-64 overflow-y-auto mb-4 p-2">
                      {messages.length === 0 && <p className="text-gray-500 text-sm text-center py-8">Aucun message</p>}
                      {messages.map(m => (
                        <div key={m.id} className={`flex ${m.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs px-4 py-2 rounded-xl text-sm ${m.sender_role === 'admin' ? 'bg-[#4F8EF7] text-white' : 'bg-[#0F1117] border border-[#2A2D3E] text-gray-200'}`}>
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
                {activeTab === 'actions' && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Statut</label>
                      <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]">
                        {STATUS_KEYS.map(k => <option key={k} value={k}>{STATUS_MAP[k].label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Prix total</label>
                      <input value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="Ex : 280€" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Lien billet (Ticketmaster...)</label>
                      <input value={editTicket} onChange={e => setEditTicket(e.target.value)} placeholder="https://ticketmaster.fr/transfer/..." className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                    </div>
                    <button onClick={saveOrder} className="bg-[#4F8EF7] hover:bg-[#3a7ae0] text-white py-2.5 rounded-lg text-sm font-medium">
                      Enregistrer les modifications
                    </button>
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
