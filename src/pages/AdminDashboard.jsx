import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const TICKET_STATUS = {
  received:  { label: 'Demande reçue',      color: 'bg-gray-500/20 text-gray-300' },
  searching: { label: 'En recherche',        color: 'bg-blue-500/20 text-blue-300' },
  proposed:  { label: 'Prix proposé',        color: 'bg-purple-500/20 text-purple-300' },
  payment:   { label: 'Paiement en attente', color: 'bg-orange-500/20 text-orange-300' },
  confirmed: { label: 'Commande confirmée',  color: 'bg-teal-500/20 text-teal-300' },
  obtained:  { label: 'Billets obtenus',     color: 'bg-cyan-500/20 text-cyan-300' },
  sent:      { label: 'Billets envoyés',     color: 'bg-green-500/20 text-green-300' },
}
const TICKET_STATUS_KEYS = Object.keys(TICKET_STATUS)

const PRODUCT_STATUS = {
  in_stock:  { label: 'En stock',    color: 'bg-green-500/20 text-green-300' },
  reserved:  { label: 'Réservé',     color: 'bg-yellow-500/20 text-yellow-300' },
  sold:      { label: 'Vendu',       color: 'bg-gray-500/20 text-gray-400' },
  incoming:  { label: 'En commande', color: 'bg-blue-500/20 text-blue-300' },
}

const NAV = [
  {
    section: 'TICKETS',
    icon: '🎟️',
    color: '#4F8EF7',
    items: [
      { key: 'tickets_orders',   icon: '📋', label: 'Commandes'  },
      { key: 'tickets_kanban',   icon: '🗂️', label: 'Kanban'    },
      { key: 'tickets_drop',     icon: '🎯', label: 'Drop'       },
      { key: 'tickets_analytics',icon: '📊', label: 'Analytics'  },
      { key: 'tickets_clients',  icon: '👥', label: 'Clients'    },
      { key: 'tickets_events',   icon: '🎤', label: 'Événements' },
    ]
  },
  {
    section: 'PRODUITS',
    icon: '👟',
    color: '#A78BFA',
    items: [
      { key: 'products_inventory', icon: '📦', label: 'Inventaire'  },
      { key: 'products_orders',    icon: '🛒', label: 'Commandes'   },
      { key: 'products_suppliers', icon: '🏭', label: 'Fournisseurs'},
      { key: 'products_analytics', icon: '📊', label: 'Analytics'   },
    ]
  },
  {
    section: 'POKÉMON',
    icon: '⚡',
    color: '#FBBF24',
    items: [
      { key: 'pokemon_collection', icon: '🃏', label: 'Collection'  },
      { key: 'pokemon_market',     icon: '📈', label: 'Cardmarket'  },
      { key: 'pokemon_sales',      icon: '💰', label: 'Ventes'      },
      { key: 'pokemon_analytics',  icon: '📊', label: 'Analytics'   },
    ]
  },
  {
    section: 'VINTED',
    icon: '👗',
    color: '#34D399',
    items: [
      { key: 'vinted_accounts',      icon: '👤', label: 'Comptes'      },
      { key: 'vinted_transactions',  icon: '💳', label: 'Transactions' },
      { key: 'vinted_messages',      icon: '💬', label: 'Messages'     },
      { key: 'vinted_favorites',     icon: '❤️', label: 'Favoris'      },
    ]
  },
]

const EMPTY_EVENT = { name: '', event_type: 'Concert', active: true, categories: [], dates: [] }

// ─── UTILS ──────────────────────────────────────────────────────────────────

function Card({ children, className = '' }) {
  return (
    <div className={`bg-[#1A1D27] border border-[#2A2D3E] rounded-xl ${className}`}>
      {children}
    </div>
  )
}

function StatCard({ label, value, sub, color = 'text-white' }) {
  return (
    <Card className="p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </Card>
  )
}

function SectionHeader({ title, sub, children }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {sub && <p className="text-gray-400 text-sm mt-1">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ text }) {
  return <p className="text-center text-gray-500 py-16">{text}</p>
}

function Badge({ label, color }) {
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${color}`}>{label}</span>
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function AdminDashboard({ session }) {
  const [view, setView] = useState('tickets_orders')

  // Tickets state
  const [orders, setOrders] = useState([])
  const [profiles, setProfiles] = useState({})
  const [allProfiles, setAllProfiles] = useState([])
  const [events, setEvents] = useState([])
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
  const [checkedOrders, setCheckedOrders] = useState({})

  // Products state
  const [products, setProducts] = useState([])
  const [productForm, setProductForm] = useState({ name: '', brand: '', size: '', buy_price: '', sell_price: '', status: 'in_stock', stock: 1, notes: '' })
  const [editingProduct, setEditingProduct] = useState(null)
  const [productTab, setProductTab] = useState('list')

  // Pokémon state
  const [pokeCards, setPokeCards] = useState([])
  const [pokeForm, setPokeForm] = useState({ name: '', set: '', condition: 'NM', buy_price: '', market_price: '', quantity: 1, notes: '' })
  const [editingPoke, setEditingPoke] = useState(null)
  const [pokeTab, setPokeTab] = useState('list')

  // Vinted state
  const [vintedAccounts, setVintedAccounts] = useState([])
  const [vintedTransactions, setVintedTransactions] = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [accountForm, setAccountForm] = useState({ username: '', email: '', wallet: '', notes: '' })
  const [editingAccount, setEditingAccount] = useState(null)

  useEffect(() => { fetchAll() }, [])

  // ── FETCH ──────────────────────────────────────────────────────────────────

  async function fetchAll() {
    // Tickets
    const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders(ordersData || [])
    const { data: profilesData } = await supabase.from('profiles').select('*')
    const map = {}
    profilesData?.forEach(p => { map[p.id] = p })
    setProfiles(map)
    setAllProfiles((profilesData || []).filter(p => p.role === 'client'))
    const { data: eventsData } = await supabase.from('events').select('*').order('created_at', { ascending: false })
    setEvents(eventsData || [])

    // Products
    const { data: productsData } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    setProducts(productsData || [])

    // Pokémon
    const { data: pokeData } = await supabase.from('pokemon_cards').select('*').order('created_at', { ascending: false })
    setPokeCards(pokeData || [])

    // Vinted
    const { data: accountsData } = await supabase.from('vinted_accounts').select('*').order('created_at', { ascending: false })
    setVintedAccounts(accountsData || [])
    const { data: txData } = await supabase.from('vinted_transactions').select('*').order('created_at', { ascending: false })
    setVintedTransactions(txData || [])
  }

  // ── TICKETS HANDLERS ───────────────────────────────────────────────────────

  async function openOrder(order) {
    setSelectedOrder(order)
    setEditPrice(order.price || '')
    setEditStatus(order.status)
    setEditTicket(order.ticket_url || '')
    setEditCost(order.cost || '')
    setActiveTab('detail')
    const { data } = await supabase.from('messages').select('*').eq('order_id', order.id).order('created_at')
    setMessages(data || [])
    setView('tickets_detail')
  }

  async function saveOrder() {
    await supabase.from('orders').update({ status: editStatus, price: editPrice, ticket_url: editTicket, cost: editCost }).eq('id', selectedOrder.id)
    fetchAll(); setView('tickets_orders')
  }

  async function archiveOrder(orderId) {
    await supabase.from('orders').update({ archived: true }).eq('id', orderId)
    fetchAll(); setView('tickets_orders')
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

  async function toggleCheck(orderId) {
    if (checkedOrders[orderId]) return
    setCheckedOrders(prev => ({ ...prev, [orderId]: true }))
    await supabase.from('orders').update({ status: 'obtained' }).eq('id', orderId)
    fetchAll()
  }

  async function saveEvent() {
    if (!eventForm.name.trim()) return
    if (editingEvent) await supabase.from('events').update(eventForm).eq('id', editingEvent.id)
    else await supabase.from('events').insert(eventForm)
    setEventForm(EMPTY_EVENT); setEditingEvent(null); fetchAll()
  }

  async function deleteEvent(id) { await supabase.from('events').delete().eq('id', id); fetchAll() }
  async function toggleEvent(event) { await supabase.from('events').update({ active: !event.active }).eq('id', event.id); fetchAll() }

  function startEditEvent(event) {
    setEditingEvent(event)
    setEventForm({ name: event.name, event_type: event.event_type, active: event.active, categories: event.categories || [], dates: event.dates || [] })
    setView('tickets_events')
  }

  function addCategory() {
    if (!newCatName.trim() || !newCatPrice.trim()) return
    setEventForm(f => ({ ...f, categories: [...f.categories, { name: newCatName, price: newCatPrice }] }))
    setNewCatName(''); setNewCatPrice('')
  }

  function addDate() {
    if (!newDate.trim() || !newDateCity.trim()) return
    setEventForm(f => ({ ...f, dates: [...(f.dates || []), { date: newDate, city: newDateCity }] }))
    setNewDate(''); setNewDateCity('')
  }

  // ── PRODUCTS HANDLERS ──────────────────────────────────────────────────────

  async function saveProduct() {
    if (!productForm.name.trim()) return
    if (editingProduct) await supabase.from('products').update(productForm).eq('id', editingProduct.id)
    else await supabase.from('products').insert(productForm)
    setProductForm({ name: '', brand: '', size: '', buy_price: '', sell_price: '', status: 'in_stock', stock: 1, notes: '' })
    setEditingProduct(null); setProductTab('list'); fetchAll()
  }

  async function deleteProduct(id) { await supabase.from('products').delete().eq('id', id); fetchAll() }

  function startEditProduct(p) {
    setEditingProduct(p)
    setProductForm({ name: p.name, brand: p.brand || '', size: p.size || '', buy_price: p.buy_price || '', sell_price: p.sell_price || '', status: p.status || 'in_stock', stock: p.stock || 1, notes: p.notes || '' })
    setProductTab('form')
  }

  // ── POKÉMON HANDLERS ───────────────────────────────────────────────────────

  async function savePoke() {
    if (!pokeForm.name.trim()) return
    if (editingPoke) await supabase.from('pokemon_cards').update(pokeForm).eq('id', editingPoke.id)
    else await supabase.from('pokemon_cards').insert(pokeForm)
    setPokeForm({ name: '', set: '', condition: 'NM', buy_price: '', market_price: '', quantity: 1, notes: '' })
    setEditingPoke(null); setPokeTab('list'); fetchAll()
  }

  async function deletePoke(id) { await supabase.from('pokemon_cards').delete().eq('id', id); fetchAll() }

  function startEditPoke(c) {
    setEditingPoke(c)
    setPokeForm({ name: c.name, set: c.set || '', condition: c.condition || 'NM', buy_price: c.buy_price || '', market_price: c.market_price || '', quantity: c.quantity || 1, notes: c.notes || '' })
    setPokeTab('form')
  }

  // ── VINTED HANDLERS ────────────────────────────────────────────────────────

  async function saveAccount() {
    if (!accountForm.username.trim()) return
    if (editingAccount) await supabase.from('vinted_accounts').update(accountForm).eq('id', editingAccount.id)
    else await supabase.from('vinted_accounts').insert(accountForm)
    setAccountForm({ username: '', email: '', wallet: '', notes: '' })
    setEditingAccount(null); fetchAll()
  }

  async function deleteAccount(id) { await supabase.from('vinted_accounts').delete().eq('id', id); fetchAll() }

  async function logout() { await supabase.auth.signOut() }

  // ── COMPUTED ───────────────────────────────────────────────────────────────

  const activeOrders = orders.filter(o => !o.archived)
  const archivedOrders = orders.filter(o => o.archived)
  const filtered = activeOrders.filter(o => {
    if (filterType !== 'all' && o.event_type !== filterType) return false
    if (filterStatus !== 'all' && o.status !== filterStatus) return false
    return true
  })
  const sentOrders = activeOrders.filter(o => o.status === 'sent')
  const totalCA = sentOrders.reduce((sum, o) => { const v = parseFloat((o.price || '0').replace(/[^0-9.]/g, '')); return sum + (isNaN(v) ? 0 : v) }, 0)
  const totalCost = activeOrders.reduce((sum, o) => { const v = parseFloat((o.cost || '0').replace(/[^0-9.]/g, '')); return sum + (isNaN(v) ? 0 : v) }, 0)
  const totalTickets = sentOrders.reduce((sum, o) => sum + (parseInt(o.seats) || 0), 0)
  const totalProfit = totalCA - totalCost
  const statusStats = TICKET_STATUS_KEYS.map(k => ({ key: k, label: TICKET_STATUS[k].label, count: activeOrders.filter(o => o.status === k).length }))
  const confirmedOrders = activeOrders.filter(o => o.status === 'confirmed')
  const dropGroups = {}
  confirmedOrders.forEach(order => {
    const key = `${order.event_name}|||${order.category}|||${order.event_date}`
    if (!dropGroups[key]) dropGroups[key] = { event_name: order.event_name, category: order.category, event_date: order.event_date, city: order.city, orders: [] }
    dropGroups[key].orders.push(order)
  })
  const dropGroupList = Object.values(dropGroups)

  const productStats = {
    total: products.length,
    inStock: products.filter(p => p.status === 'in_stock').length,
    sold: products.filter(p => p.status === 'sold').length,
    totalBuy: products.reduce((s, p) => s + (parseFloat(p.buy_price) || 0), 0),
    totalSell: products.filter(p => p.status === 'sold').reduce((s, p) => s + (parseFloat(p.sell_price) || 0), 0),
  }

  const pokeStats = {
    total: pokeCards.length,
    totalQty: pokeCards.reduce((s, c) => s + (parseInt(c.quantity) || 0), 0),
    totalBuy: pokeCards.reduce((s, c) => s + (parseFloat(c.buy_price) || 0) * (parseInt(c.quantity) || 1), 0),
    totalMarket: pokeCards.reduce((s, c) => s + (parseFloat(c.market_price) || 0) * (parseInt(c.quantity) || 1), 0),
  }

  const vintedStats = {
    accounts: vintedAccounts.length,
    totalTx: vintedTransactions.length,
    totalSales: vintedTransactions.filter(t => t.type === 'sale').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0),
    totalWallet: vintedAccounts.reduce((s, a) => s + (parseFloat(a.wallet) || 0), 0),
  }

  // ── CURRENT MODULE ─────────────────────────────────────────────────────────

  const currentModule = view.split('_')[0]
  const moduleColors = { tickets: '#4F8EF7', products: '#A78BFA', pokemon: '#FBBF24', vinted: '#34D399' }
  const accentColor = moduleColors[currentModule] || '#4F8EF7'

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0F1117] flex">

      {/* ── SIDEBAR ── */}
      <div className="w-60 bg-[#13151F] border-r border-[#2A2D3E] flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-[#2A2D3E]">
          <img src="/buypasslogo.png" alt="Buy Pass" className="h-12 object-contain" />
          <p className="text-xs text-gray-500 mt-0.5">Admin · Workspace</p>
        </div>

        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {NAV.map(module => (
            <div key={module.section} className="mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
                <span className="text-xs font-semibold tracking-widest" style={{ color: module.color }}>{module.section}</span>
              </div>
              {module.items.map(item => {
                const isActive = view === item.key || (item.key === 'tickets_orders' && view === 'tickets_detail') || (item.key === 'tickets_clients' && view === 'tickets_clientdetail')
                return (
                  <button
                    key={item.key}
                    onClick={() => { setView(item.key); setEditingEvent(null); setEventForm(EMPTY_EVENT) }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all w-full text-left mb-0.5 ${isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-[#1A1D27]'}`}
                    style={isActive ? { backgroundColor: `${module.color}15`, color: module.color } : {}}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                    {item.key === 'tickets_drop' && confirmedOrders.length > 0 && (
                      <span className="ml-auto text-xs bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded-full">{confirmedOrders.length}</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="px-2 py-3 border-t border-[#2A2D3E]">
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1A1D27] w-full">
            🚪 Déconnexion
          </button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6">

          {/* ════════════════════ TICKETS ════════════════════ */}

          {/* Tickets — Commandes */}
          {view === 'tickets_orders' && (
            <>
              <SectionHeader title="Commandes" sub={`${activeOrders.length} commande${activeOrders.length > 1 ? 's' : ''} active${activeOrders.length > 1 ? 's' : ''}`}>
                <button onClick={() => setShowArchived(s => !s)} className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${showArchived ? 'border-orange-400/30 text-orange-400 bg-orange-400/10' : 'border-[#2A2D3E] text-gray-400 hover:text-white'}`}>
                  {showArchived ? '📦 Masquer archives' : `📦 Archives (${archivedOrders.length})`}
                </button>
              </SectionHeader>

              <div className="grid grid-cols-4 gap-4 mb-6">
                <StatCard label="Actives" value={activeOrders.filter(o => o.status !== 'sent').length} color="text-[#4F8EF7]" />
                <StatCard label="Nouvelles" value={activeOrders.filter(o => o.status === 'received').length} color="text-purple-400" />
                <StatCard label="Paiements" value={activeOrders.filter(o => o.status === 'payment').length} color="text-orange-400" />
                <StatCard label="Envoyées" value={sentOrders.length} color="text-green-400" />
              </div>

              <div className="flex gap-3 mb-4 flex-wrap">
                {['all', 'Concert', 'Football', 'Festival'].map(f => (
                  <button key={f} onClick={() => setFilterType(f)} className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${filterType === f ? 'bg-[#4F8EF7]/20 text-[#4F8EF7] border border-[#4F8EF7]/30' : 'border border-[#2A2D3E] text-gray-400 hover:text-white'}`}>
                    {f === 'all' ? 'Tous' : f}
                  </button>
                ))}
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="ml-auto bg-[#1A1D27] border border-[#2A2D3E] rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none">
                  <option value="all">Tous les statuts</option>
                  {TICKET_STATUS_KEYS.map(k => <option key={k} value={k}>{TICKET_STATUS[k].label}</option>)}
                </select>
              </div>

              <Card className="overflow-hidden mb-6">
                <table className="w-full">
                  <thead><tr className="border-b border-[#2A2D3E]">{['Client', 'Événement', 'Date', 'Places', 'Statut', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                  <tbody>
                    {filtered.map(order => {
                      const s = TICKET_STATUS[order.status]
                      const profile = profiles[order.client_id]
                      return (
                        <tr key={order.id} className="border-b border-[#2A2D3E] hover:bg-[#1E2130] transition-colors">
                          <td className="px-4 py-3"><p className="text-sm font-medium text-white">{profile?.full_name || 'Client'}</p><p className="text-xs text-gray-500">{profile?.phone || ''}</p></td>
                          <td className="px-4 py-3"><p className="text-sm text-white">{order.event_name}</p><p className="text-xs text-gray-500">{order.city} · {order.event_type}</p></td>
                          <td className="px-4 py-3 text-sm text-gray-300">{order.event_date}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{order.seats} × {order.category}</td>
                          <td className="px-4 py-3"><Badge label={s.label} color={s.color} /></td>
                          <td className="px-4 py-3 flex gap-2">
                            <button onClick={() => openOrder(order)} className="text-xs border border-[#2A2D3E] hover:border-[#4F8EF7] text-gray-300 hover:text-[#4F8EF7] px-3 py-1.5 rounded-lg transition-all">Gérer</button>
                            <button onClick={() => archiveOrder(order.id)} className="text-xs border border-[#2A2D3E] hover:border-orange-400 text-gray-300 hover:text-orange-400 px-3 py-1.5 rounded-lg transition-all">Archiver</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && <EmptyState text="Aucune commande" />}
              </Card>

              {showArchived && (
                <Card className="overflow-hidden border-orange-400/20">
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
                </Card>
              )}
            </>
          )}

          {/* Tickets — Kanban */}
          {view === 'tickets_kanban' && (
            <>
              <SectionHeader title="Vue Kanban" />
              <div className="grid grid-cols-3 gap-4">
                {TICKET_STATUS_KEYS.map(key => {
                  const s = TICKET_STATUS[key]
                  const col = activeOrders.filter(o => o.status === key)
                  return (
                    <Card key={key} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge label={s.label} color={s.color} />
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
                    </Card>
                  )
                })}
              </div>
            </>
          )}

          {/* Tickets — Drop */}
          {view === 'tickets_drop' && (
            <>
              <SectionHeader title="🎯 Drop" sub="Commandes confirmées — cochez les places trouvées pour notifier les clients" />
              {dropGroupList.length === 0 ? <EmptyState text="Aucune commande confirmée pour l'instant" /> : (
                <div className="flex flex-col gap-6">
                  {dropGroupList.map((group, gi) => (
                    <Card key={gi} className="overflow-hidden">
                      <div className="px-5 py-4 border-b border-[#2A2D3E] flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold text-lg">{group.event_name}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{group.event_date} · {group.city}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-[#4F8EF7]/10 text-[#4F8EF7] border border-[#4F8EF7]/20 px-2.5 py-1 rounded-full font-medium">{group.category}</span>
                          <span className="text-xs bg-[#0F1117] text-gray-400 border border-[#2A2D3E] px-2.5 py-1 rounded-full">{group.orders.length} demande{group.orders.length > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <table className="w-full">
                        <thead><tr className="border-b border-[#2A2D3E]">{['Client', 'Places', 'Prix vendu', 'Notes', 'Trouvé ✓'].map(h => <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                        <tbody>
                          {group.orders.map(order => {
                            const isChecked = checkedOrders[order.id] || order.status === 'obtained' || order.status === 'sent'
                            const profile = profiles[order.client_id]
                            return (
                              <tr key={order.id} className={`border-b border-[#2A2D3E] transition-all ${isChecked ? 'opacity-40 bg-[#0F1117]' : 'hover:bg-[#1E2130]'}`}>
                                <td className="px-4 py-3"><p className={`text-sm font-medium text-white ${isChecked ? 'line-through' : ''}`}>{profile?.full_name || 'Client'}</p><p className="text-xs text-gray-500">{profile?.phone || ''}</p></td>
                                <td className={`px-4 py-3 text-sm text-gray-300 ${isChecked ? 'line-through' : ''}`}>{order.seats} place{order.seats > 1 ? 's' : ''}</td>
                                <td className={`px-4 py-3 text-sm font-medium ${isChecked ? 'line-through text-gray-500' : 'text-[#1D9E75]'}`}>{order.price || '—'}</td>
                                <td className={`px-4 py-3 text-sm text-gray-400 ${isChecked ? 'line-through' : ''}`}>{order.notes || '—'}</td>
                                <td className="px-4 py-3">
                                  <button onClick={() => !isChecked && toggleCheck(order.id)} disabled={isChecked} className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-[#1D9E75] border-[#1D9E75] cursor-default' : 'border-[#2A2D3E] hover:border-[#1D9E75] hover:bg-[#1D9E75]/10 cursor-pointer'}`}>
                                    {isChecked && <span className="text-white text-xs font-bold">✓</span>}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Tickets — Analytics */}
          {view === 'tickets_analytics' && (
            <>
              <SectionHeader title="Analytics Tickets" />
              <div className="grid grid-cols-4 gap-4 mb-8">
                <StatCard label="CA Total" value={totalCA.toFixed(0) + '€'} sub="Commandes envoyées" color="text-green-400" />
                <StatCard label="Coût Total" value={totalCost.toFixed(0) + '€'} sub="Montant dépensé" color="text-red-400" />
                <StatCard label="Bénéfice" value={totalProfit.toFixed(0) + '€'} sub="CA - Coûts" color={totalProfit >= 0 ? 'text-[#4F8EF7]' : 'text-red-400'} />
                <StatCard label="Billets vendus" value={totalTickets} sub="Places envoyées" color="text-purple-400" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-white font-semibold mb-4">Commandes par statut</h3>
                  <div className="flex flex-col gap-3">
                    {statusStats.map(s => (
                      <div key={s.key} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-40">{s.label}</span>
                        <div className="flex-1 bg-[#0F1117] rounded-full h-2"><div className="bg-[#4F8EF7] h-2 rounded-full" style={{ width: activeOrders.length > 0 ? `${(s.count / activeOrders.length) * 100}%` : '0%' }} /></div>
                        <span className="text-xs text-white font-medium w-6 text-right">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-6">
                  <h3 className="text-white font-semibold mb-4">Commandes avec prix</h3>
                  <table className="w-full">
                    <thead><tr className="border-b border-[#2A2D3E]">{['Événement', 'Prix', 'Coût', 'Marge'].map(h => <th key={h} className="pb-3 text-left text-xs text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                    <tbody>
                      {activeOrders.filter(o => o.price).map(order => {
                        const price = parseFloat((order.price || '0').replace(/[^0-9.]/g, ''))
                        const cost = parseFloat((order.cost || '0').replace(/[^0-9.]/g, ''))
                        const margin = price - cost
                        return (
                          <tr key={order.id} className="border-b border-[#2A2D3E]">
                            <td className="py-3 text-sm text-white">{order.event_name}</td>
                            <td className="py-3 text-sm text-green-400">{order.price || '-'}</td>
                            <td className="py-3 text-sm text-red-400">{order.cost || '-'}</td>
                            <td className={`py-3 text-sm font-medium ${margin >= 0 ? 'text-[#4F8EF7]' : 'text-red-400'}`}>{order.cost ? margin.toFixed(0) + '€' : '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {activeOrders.filter(o => o.price).length === 0 && <EmptyState text="Aucune commande avec prix" />}
                </Card>
              </div>
            </>
          )}

          {/* Tickets — Clients */}
          {view === 'tickets_clients' && (
            <>
              <SectionHeader title="Clients" sub={`${allProfiles.length} client${allProfiles.length > 1 ? 's' : ''} enregistré${allProfiles.length > 1 ? 's' : ''}`} />
              <div className="grid grid-cols-1 gap-4">
                {allProfiles.map(client => {
                  const cOrders = activeOrders.filter(o => o.client_id === client.id)
                  const lastOrder = cOrders[0]
                  return (
                    <Card key={client.id} className="p-5 hover:border-[#4F8EF7] cursor-pointer transition-all" onClick={() => { setSelectedClient(client); setView('tickets_clientdetail') }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#4F8EF7]/20 flex items-center justify-center text-[#4F8EF7] font-bold">{client.full_name?.[0]?.toUpperCase() || '?'}</div>
                          <div><p className="text-white font-medium">{client.full_name || 'Client inconnu'}</p><p className="text-gray-500 text-xs">{client.phone || 'Pas de téléphone'}</p></div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white">{cOrders.length} commande{cOrders.length > 1 ? 's' : ''}</p>
                          {lastOrder && <p className="text-xs text-gray-500 mt-0.5">Dernière : {lastOrder.event_name}</p>}
                        </div>
                      </div>
                    </Card>
                  )
                })}
                {allProfiles.length === 0 && <EmptyState text="Aucun client" />}
              </div>
            </>
          )}

          {/* Tickets — Client détail */}
          {view === 'tickets_clientdetail' && selectedClient && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#4F8EF7]/20 flex items-center justify-center text-[#4F8EF7] font-bold text-lg">{selectedClient.full_name?.[0]?.toUpperCase() || '?'}</div>
                  <div><h2 className="text-xl font-bold text-white">{selectedClient.full_name || 'Client'}</h2><p className="text-gray-400 text-sm">{selectedClient.phone || 'Pas de téléphone'}</p></div>
                </div>
                <button onClick={() => setView('tickets_clients')} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-2 rounded-lg">← Retour</button>
              </div>
              <div className="flex flex-col gap-4">
                {activeOrders.filter(o => o.client_id === selectedClient.id).map(order => {
                  const s = TICKET_STATUS[order.status]
                  return (
                    <Card key={order.id} className="p-5 hover:border-[#4F8EF7] cursor-pointer transition-all" onClick={() => openOrder(order)}>
                      <div className="flex items-start justify-between">
                        <div><p className="text-white font-medium">{order.event_name}</p><p className="text-gray-500 text-xs mt-1">{order.city} · {order.event_date} · {order.seats} place{order.seats > 1 ? 's' : ''}</p></div>
                        <Badge label={s.label} color={s.color} />
                      </div>
                      {order.price && <p className="text-sm text-[#1D9E75] font-medium mt-2">{order.price}</p>}
                    </Card>
                  )
                })}
              </div>
            </>
          )}

          {/* Tickets — Événements */}
          {view === 'tickets_events' && (
            <>
              <SectionHeader title="Événements" sub="Gérez les événements visibles par les clients" />
              <div className="grid grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-white font-semibold mb-4">{editingEvent ? '✏️ Modifier' : '➕ Nouvel événement'}</h3>
                  <div className="mb-3">
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Nom</label>
                    <input value={eventForm.name} onChange={e => setEventForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex : Céline Dion" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                  </div>
                  <div className="mb-3">
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Type</label>
                    <select value={eventForm.event_type} onChange={e => setEventForm(f => ({ ...f, event_type: e.target.value }))} className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]">
                      {['Concert', 'Football', 'Festival', 'Autre'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Dates & Villes</label>
                    <div className="flex flex-col gap-2 mb-2">
                      {(eventForm.dates || []).map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-[#0F1117] rounded-lg px-3 py-2">
                          <span className="text-sm text-white">📅 {d.date} — 📍 {d.city}</span>
                          <button onClick={() => setEventForm(f => ({ ...f, dates: f.dates.filter((_, i) => i !== idx) }))} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={newDate} onChange={e => setNewDate(e.target.value)} placeholder="15/09/2026" className="flex-1 bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                      <input value={newDateCity} onChange={e => setNewDateCity(e.target.value)} placeholder="Paris" className="w-24 bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                      <button onClick={addDate} className="bg-[#4F8EF7]/20 text-[#4F8EF7] border border-[#4F8EF7]/30 px-3 py-2 rounded-lg text-sm hover:bg-[#4F8EF7]/30">+</button>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Catégories & Prix</label>
                    <div className="flex flex-col gap-2 mb-2">
                      {eventForm.categories.map((cat, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-[#0F1117] rounded-lg px-3 py-2">
                          <span className="text-sm text-white">{cat.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[#1D9E75] font-medium">{cat.price}€</span>
                            <button onClick={() => setEventForm(f => ({ ...f, categories: f.categories.filter((_, i) => i !== idx) }))} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Ex : Catégorie 1" className="flex-1 bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                      <input value={newCatPrice} onChange={e => setNewCatPrice(e.target.value)} placeholder="200" className="w-20 bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" />
                      <button onClick={addCategory} className="bg-[#4F8EF7]/20 text-[#4F8EF7] border border-[#4F8EF7]/30 px-3 py-2 rounded-lg text-sm hover:bg-[#4F8EF7]/30">+</button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEvent} className="flex-1 bg-[#4F8EF7] hover:bg-[#3a7ae0] text-white py-2.5 rounded-lg text-sm font-medium">{editingEvent ? 'Modifier' : 'Créer'}</button>
                    {editingEvent && <button onClick={() => { setEditingEvent(null); setEventForm(EMPTY_EVENT) }} className="border border-[#2A2D3E] text-gray-400 px-4 py-2.5 rounded-lg text-sm">Annuler</button>}
                  </div>
                </Card>
                <div className="flex flex-col gap-3">
                  {events.length === 0 && <EmptyState text="Aucun événement créé" />}
                  {events.map(event => (
                    <Card key={event.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div><p className="text-white font-medium">{event.name}</p><p className="text-gray-500 text-xs">{event.event_type}</p></div>
                        <button onClick={() => toggleEvent(event)} className={`text-xs px-2 py-1 rounded-full ${event.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{event.active ? '● Actif' : '○ Inactif'}</button>
                      </div>
                      {event.dates?.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{event.dates.map((d, i) => <span key={i} className="text-xs bg-[#4F8EF7]/10 border border-[#4F8EF7]/20 text-[#4F8EF7] px-2 py-0.5 rounded-full">📅 {d.date} — {d.city}</span>)}</div>}
                      {event.categories?.length > 0 && <div className="flex flex-wrap gap-1 mb-3">{event.categories.map((cat, i) => <span key={i} className="text-xs bg-[#0F1117] border border-[#2A2D3E] text-gray-300 px-2 py-0.5 rounded-full">{cat.name} — {cat.price}€</span>)}</div>}
                      <div className="flex gap-2">
                        <button onClick={() => startEditEvent(event)} className="text-xs border border-[#2A2D3E] hover:border-[#4F8EF7] text-gray-300 hover:text-[#4F8EF7] px-3 py-1.5 rounded-lg transition-all">Modifier</button>
                        <button onClick={() => deleteEvent(event.id)} className="text-xs border border-[#2A2D3E] hover:border-red-400 text-gray-300 hover:text-red-400 px-3 py-1.5 rounded-lg transition-all">Supprimer</button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Tickets — Détail commande */}
          {view === 'tickets_detail' && selectedOrder && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">{selectedOrder.event_name}</h2>
                <button onClick={() => setView('tickets_orders')} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-2 rounded-lg">← Retour</button>
              </div>
              <Card className="p-6 max-w-2xl">
                <div className="flex gap-4 border-b border-[#2A2D3E] mb-6">
                  {['detail', 'messages', 'actions'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-medium border-b-2 transition-all ${activeTab === tab ? 'border-[#4F8EF7] text-white' : 'border-transparent text-gray-400'}`}>
                      {tab === 'detail' ? 'Détail' : tab === 'messages' ? 'Messages' : 'Actions'}
                    </button>
                  ))}
                </div>
                {activeTab === 'detail' && (
                  <div className="grid grid-cols-2 gap-3">
                    {[['Client', profiles[selectedOrder.client_id]?.full_name || 'N/A'], ['Téléphone', profiles[selectedOrder.client_id]?.phone || 'N/A'], ['Événement', selectedOrder.event_name], ['Type', selectedOrder.event_type], ['Date', selectedOrder.event_date], ['Ville', selectedOrder.city], ['Places', `${selectedOrder.seats} × ${selectedOrder.category}`], ['Budget', selectedOrder.budget || 'Non précisé']].map(([k, v]) => (
                      <div key={k} className="bg-[#0F1117] rounded-lg p-3"><div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{k}</div><div className="text-sm font-medium text-white">{v}</div></div>
                    ))}
                    {selectedOrder.notes && <div className="col-span-2 bg-[#0F1117] rounded-lg p-3"><div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</div><div className="text-sm text-white">{selectedOrder.notes}</div></div>}
                  </div>
                )}
                {activeTab === 'messages' && (
                  <div>
                    <div className="flex flex-col gap-3 max-h-64 overflow-y-auto mb-4 p-2">
                      {messages.length === 0 && <p className="text-gray-500 text-sm text-center py-8">Aucun message</p>}
                      {messages.map(m => (
                        <div key={m.id} className={`flex ${m.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs px-4 py-2 rounded-xl text-sm ${m.sender_role === 'admin' ? 'bg-[#4F8EF7] text-white' : 'bg-[#0F1117] border border-[#2A2D3E] text-gray-200'}`}>{m.content}</div>
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
                    <div><label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Statut</label>
                      <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]">
                        {TICKET_STATUS_KEYS.map(k => <option key={k} value={k}>{TICKET_STATUS[k].label}</option>)}
                      </select>
                    </div>
                    <div><label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Prix de vente</label><input value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="Ex : 280€" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" /></div>
                    <div><label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Coût d'achat</label><input value={editCost} onChange={e => setEditCost(e.target.value)} placeholder="Ex : 200€" className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" /></div>
                    <div><label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Lien billet</label><input value={editTicket} onChange={e => setEditTicket(e.target.value)} placeholder="https://ticketmaster.fr/transfer/..." className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]" /></div>
                    <div className="flex gap-3">
                      <button onClick={saveOrder} className="flex-1 bg-[#4F8EF7] hover:bg-[#3a7ae0] text-white py-2.5 rounded-lg text-sm font-medium">Enregistrer</button>
                      <button onClick={() => archiveOrder(selectedOrder.id)} className="border border-orange-400/30 text-orange-400 hover:bg-orange-400/10 px-4 py-2.5 rounded-lg text-sm transition-all">📦 Archiver</button>
                    </div>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* ════════════════════ PRODUITS ════════════════════ */}

          {view === 'products_inventory' && (
            <>
              <SectionHeader title="Inventaire" sub={`${products.length} produit${products.length > 1 ? 's' : ''}`}>
                <button onClick={() => { setProductTab('form'); setEditingProduct(null); setProductForm({ name: '', brand: '', size: '', buy_price: '', sell_price: '', status: 'in_stock', stock: 1, notes: '' }) }} className="text-xs bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30 px-3 py-1.5 rounded-lg hover:bg-[#A78BFA]/30 transition-all">+ Ajouter</button>
              </SectionHeader>

              <div className="grid grid-cols-4 gap-4 mb-6">
                <StatCard label="Total produits" value={productStats.total} color="text-[#A78BFA]" />
                <StatCard label="En stock" value={productStats.inStock} color="text-green-400" />
                <StatCard label="Vendus" value={productStats.sold} color="text-gray-400" />
                <StatCard label="Valeur achat" value={productStats.totalBuy.toFixed(0) + '€'} color="text-orange-400" />
              </div>

              {productTab === 'form' && (
                <Card className="p-6 mb-6 max-w-xl">
                  <h3 className="text-white font-semibold mb-4">{editingProduct ? '✏️ Modifier le produit' : '➕ Nouveau produit'}</h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[['Nom', 'name', 'Air Jordan 1 Retro'], ['Marque', 'brand', 'Nike'], ['Taille', 'size', 'EU 42'], ['Prix achat (€)', 'buy_price', '120'], ['Prix vente (€)', 'sell_price', '200'], ['Stock', 'stock', '1']].map(([label, field, ph]) => (
                      <div key={field}>
                        <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">{label}</label>
                        <input value={productForm[field]} onChange={e => setProductForm(f => ({ ...f, [field]: e.target.value }))} placeholder={ph} className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#A78BFA]" />
                      </div>
                    ))}
                  </div>
                  <div className="mb-3">
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Statut</label>
                    <select value={productForm.status} onChange={e => setProductForm(f => ({ ...f, status: e.target.value }))} className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#A78BFA]">
                      {Object.entries(PRODUCT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Notes</label>
                    <input value={productForm.notes} onChange={e => setProductForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes..." className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#A78BFA]" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveProduct} className="flex-1 bg-[#A78BFA] hover:bg-[#9061f9] text-white py-2.5 rounded-lg text-sm font-medium">{editingProduct ? 'Modifier' : 'Créer'}</button>
                    <button onClick={() => setProductTab('list')} className="border border-[#2A2D3E] text-gray-400 px-4 py-2.5 rounded-lg text-sm">Annuler</button>
                  </div>
                </Card>
              )}

              <Card className="overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-[#2A2D3E]">{['Produit', 'Marque', 'Taille', 'Stock', 'Achat', 'Vente', 'Marge', 'Statut', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                  <tbody>
                    {products.map(p => {
                      const s = PRODUCT_STATUS[p.status] || PRODUCT_STATUS.in_stock
                      const buy = parseFloat(p.buy_price) || 0
                      const sell = parseFloat(p.sell_price) || 0
                      const margin = sell - buy
                      return (
                        <tr key={p.id} className="border-b border-[#2A2D3E] hover:bg-[#1E2130] transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-white">{p.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">{p.brand || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">{p.size || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{p.stock || 1}</td>
                          <td className="px-4 py-3 text-sm text-red-400">{buy > 0 ? buy + '€' : '—'}</td>
                          <td className="px-4 py-3 text-sm text-green-400">{sell > 0 ? sell + '€' : '—'}</td>
                          <td className={`px-4 py-3 text-sm font-medium ${margin > 0 ? 'text-[#A78BFA]' : margin < 0 ? 'text-red-400' : 'text-gray-500'}`}>{sell > 0 && buy > 0 ? (margin > 0 ? '+' : '') + margin.toFixed(0) + '€' : '—'}</td>
                          <td className="px-4 py-3"><Badge label={s.label} color={s.color} /></td>
                          <td className="px-4 py-3 flex gap-2">
                            <button onClick={() => startEditProduct(p)} className="text-xs border border-[#2A2D3E] hover:border-[#A78BFA] text-gray-300 hover:text-[#A78BFA] px-3 py-1.5 rounded-lg transition-all">Modifier</button>
                            <button onClick={() => deleteProduct(p.id)} className="text-xs border border-[#2A2D3E] hover:border-red-400 text-gray-300 hover:text-red-400 px-3 py-1.5 rounded-lg transition-all">Suppr.</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {products.length === 0 && <EmptyState text="Aucun produit dans l'inventaire" />}
              </Card>
            </>
          )}

          {view === 'products_orders' && (
            <>
              <SectionHeader title="Commandes Produits" sub="Suivi ACO, précommandes et abonnements" />
              <Card className="p-12 flex flex-col items-center justify-center gap-3">
                <div className="text-4xl">🛒</div>
                <p className="text-white font-medium">Module Commandes Produits</p>
                <p className="text-gray-500 text-sm">ACO, précommandes, paiements — à connecter à votre base Supabase</p>
              </Card>
            </>
          )}

          {view === 'products_suppliers' && (
            <>
              <SectionHeader title="Fournisseurs" sub="Suivi colis et logistique intégrée" />
              <Card className="p-12 flex flex-col items-center justify-center gap-3">
                <div className="text-4xl">🏭</div>
                <p className="text-white font-medium">Module Fournisseurs</p>
                <p className="text-gray-500 text-sm">Fournisseurs, suivi colis, logistique — à connecter à votre base Supabase</p>
              </Card>
            </>
          )}

          {view === 'products_analytics' && (
            <>
              <SectionHeader title="Analytics Produits" />
              <div className="grid grid-cols-4 gap-4 mb-8">
                <StatCard label="Total produits" value={productStats.total} color="text-[#A78BFA]" />
                <StatCard label="En stock" value={productStats.inStock} color="text-green-400" />
                <StatCard label="Vendus" value={productStats.sold} color="text-gray-400" />
                <StatCard label="CA réalisé" value={productStats.totalSell.toFixed(0) + '€'} sub="Produits vendus" color="text-green-400" />
              </div>
              <Card className="p-6">
                <h3 className="text-white font-semibold mb-4">Marges par produit</h3>
                <table className="w-full">
                  <thead><tr className="border-b border-[#2A2D3E]">{['Produit', 'Marque', 'Achat', 'Vente', 'Marge', 'Statut'].map(h => <th key={h} className="pb-3 text-left text-xs text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                  <tbody>
                    {products.filter(p => p.sell_price).map(p => {
                      const s = PRODUCT_STATUS[p.status] || PRODUCT_STATUS.in_stock
                      const buy = parseFloat(p.buy_price) || 0
                      const sell = parseFloat(p.sell_price) || 0
                      return (
                        <tr key={p.id} className="border-b border-[#2A2D3E]">
                          <td className="py-3 text-sm text-white">{p.name}</td>
                          <td className="py-3 text-sm text-gray-400">{p.brand || '—'}</td>
                          <td className="py-3 text-sm text-red-400">{buy > 0 ? buy + '€' : '—'}</td>
                          <td className="py-3 text-sm text-green-400">{sell > 0 ? sell + '€' : '—'}</td>
                          <td className={`py-3 text-sm font-medium ${sell - buy > 0 ? 'text-[#A78BFA]' : 'text-red-400'}`}>{(sell - buy > 0 ? '+' : '') + (sell - buy).toFixed(0)}€</td>
                          <td className="py-3"><Badge label={s.label} color={s.color} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {products.filter(p => p.sell_price).length === 0 && <EmptyState text="Aucun produit avec prix de vente" />}
              </Card>
            </>
          )}

          {/* ════════════════════ POKÉMON ════════════════════ */}

          {view === 'pokemon_collection' && (
            <>
              <SectionHeader title="Collection Pokémon" sub={`${pokeStats.totalQty} carte${pokeStats.totalQty > 1 ? 's' : ''} · ${pokeCards.length} références`}>
                <button onClick={() => { setPokeTab('form'); setEditingPoke(null); setPokeForm({ name: '', set: '', condition: 'NM', buy_price: '', market_price: '', quantity: 1, notes: '' }) }} className="text-xs bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/30 px-3 py-1.5 rounded-lg hover:bg-[#FBBF24]/30 transition-all">+ Ajouter</button>
              </SectionHeader>

              <div className="grid grid-cols-4 gap-4 mb-6">
                <StatCard label="Références" value={pokeCards.length} color="text-[#FBBF24]" />
                <StatCard label="Cartes total" value={pokeStats.totalQty} color="text-yellow-300" />
                <StatCard label="Valeur achat" value={pokeStats.totalBuy.toFixed(0) + '€'} color="text-red-400" />
                <StatCard label="Valeur marché" value={pokeStats.totalMarket.toFixed(0) + '€'} color="text-green-400" />
              </div>

              {pokeTab === 'form' && (
                <Card className="p-6 mb-6 max-w-xl">
                  <h3 className="text-white font-semibold mb-4">{editingPoke ? '✏️ Modifier la carte' : '➕ Nouvelle carte'}</h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[['Nom de la carte', 'name', 'Charizard VMAX'], ['Set / Extension', 'set', 'Épée et Bouclier'], ['Condition', 'condition', 'NM'], ['Prix achat (€)', 'buy_price', '45'], ['Cours Cardmarket (€)', 'market_price', '80'], ['Quantité', 'quantity', '1']].map(([label, field, ph]) => (
                      <div key={field}>
                        <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">{label}</label>
                        {field === 'condition' ? (
                          <select value={pokeForm[field]} onChange={e => setPokeForm(f => ({ ...f, [field]: e.target.value }))} className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FBBF24]">
                            {['M', 'NM', 'EX', 'GD', 'LP', 'PL', 'P'].map(c => <option key={c}>{c}</option>)}
                          </select>
                        ) : (
                          <input value={pokeForm[field]} onChange={e => setPokeForm(f => ({ ...f, [field]: e.target.value }))} placeholder={ph} className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FBBF24]" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Notes</label>
                    <input value={pokeForm.notes} onChange={e => setPokeForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes..." className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FBBF24]" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={savePoke} className="flex-1 bg-[#FBBF24] hover:bg-[#f59e0b] text-black py-2.5 rounded-lg text-sm font-medium">{editingPoke ? 'Modifier' : 'Créer'}</button>
                    <button onClick={() => setPokeTab('list')} className="border border-[#2A2D3E] text-gray-400 px-4 py-2.5 rounded-lg text-sm">Annuler</button>
                  </div>
                </Card>
              )}

              <Card className="overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-[#2A2D3E]">{['Carte', 'Set', 'Condition', 'Qté', 'Achat', 'Cardmarket', 'Plus-value', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                  <tbody>
                    {pokeCards.map(card => {
                      const buy = parseFloat(card.buy_price) || 0
                      const market = parseFloat(card.market_price) || 0
                      const qty = parseInt(card.quantity) || 1
                      const pnl = (market - buy) * qty
                      return (
                        <tr key={card.id} className="border-b border-[#2A2D3E] hover:bg-[#1E2130] transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-white">{card.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">{card.set || '—'}</td>
                          <td className="px-4 py-3"><span className="text-xs bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/20 px-2 py-0.5 rounded-full">{card.condition || 'NM'}</span></td>
                          <td className="px-4 py-3 text-sm text-gray-300">{qty}</td>
                          <td className="px-4 py-3 text-sm text-red-400">{buy > 0 ? buy + '€' : '—'}</td>
                          <td className="px-4 py-3 text-sm text-green-400">{market > 0 ? market + '€' : '—'}</td>
                          <td className={`px-4 py-3 text-sm font-medium ${pnl > 0 ? 'text-[#FBBF24]' : pnl < 0 ? 'text-red-400' : 'text-gray-500'}`}>{buy > 0 && market > 0 ? (pnl > 0 ? '+' : '') + pnl.toFixed(0) + '€' : '—'}</td>
                          <td className="px-4 py-3 flex gap-2">
                            <button onClick={() => startEditPoke(card)} className="text-xs border border-[#2A2D3E] hover:border-[#FBBF24] text-gray-300 hover:text-[#FBBF24] px-3 py-1.5 rounded-lg transition-all">Modifier</button>
                            <button onClick={() => deletePoke(card.id)} className="text-xs border border-[#2A2D3E] hover:border-red-400 text-gray-300 hover:text-red-400 px-3 py-1.5 rounded-lg transition-all">Suppr.</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {pokeCards.length === 0 && <EmptyState text="Aucune carte dans la collection" />}
              </Card>
            </>
          )}

          {view === 'pokemon_market' && (
            <>
              <SectionHeader title="Cardmarket" sub="Cours et valorisation du stock" />
              <div className="grid grid-cols-2 gap-4 mb-6">
                <StatCard label="Valeur achat totale" value={pokeStats.totalBuy.toFixed(0) + '€'} sub="Coût d'acquisition" color="text-red-400" />
                <StatCard label="Valeur marché totale" value={pokeStats.totalMarket.toFixed(0) + '€'} sub="Prix Cardmarket actuel" color="text-green-400" />
              </div>
              <Card className="p-6">
                <h3 className="text-white font-semibold mb-4">Plus-values par carte</h3>
                <table className="w-full">
                  <thead><tr className="border-b border-[#2A2D3E]">{['Carte', 'Set', 'Qté', 'Achat unitaire', 'Cours CM', 'PnL total'].map(h => <th key={h} className="pb-3 text-left text-xs text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                  <tbody>
                    {[...pokeCards].sort((a, b) => ((parseFloat(b.market_price) || 0) - (parseFloat(b.buy_price) || 0)) * (parseInt(b.quantity) || 1) - ((parseFloat(a.market_price) || 0) - (parseFloat(a.buy_price) || 0)) * (parseInt(a.quantity) || 1)).map(card => {
                      const buy = parseFloat(card.buy_price) || 0
                      const market = parseFloat(card.market_price) || 0
                      const qty = parseInt(card.quantity) || 1
                      const pnl = (market - buy) * qty
                      return (
                        <tr key={card.id} className="border-b border-[#2A2D3E]">
                          <td className="py-3 text-sm text-white font-medium">{card.name}</td>
                          <td className="py-3 text-sm text-gray-400">{card.set || '—'}</td>
                          <td className="py-3 text-sm text-gray-300">{qty}</td>
                          <td className="py-3 text-sm text-red-400">{buy > 0 ? buy + '€' : '—'}</td>
                          <td className="py-3 text-sm text-green-400">{market > 0 ? market + '€' : '—'}</td>
                          <td className={`py-3 text-sm font-bold ${pnl > 0 ? 'text-[#FBBF24]' : pnl < 0 ? 'text-red-400' : 'text-gray-500'}`}>{buy > 0 && market > 0 ? (pnl > 0 ? '+' : '') + pnl.toFixed(0) + '€' : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {pokeCards.length === 0 && <EmptyState text="Aucune carte à valoriser" />}
              </Card>
            </>
          )}

          {view === 'pokemon_sales' && (
            <>
              <SectionHeader title="Ventes Pokémon" sub="Historique des ventes TCG" />
              <Card className="p-12 flex flex-col items-center justify-center gap-3">
                <div className="text-4xl">💰</div>
                <p className="text-white font-medium">Module Ventes Pokémon</p>
                <p className="text-gray-500 text-sm">Ventes, abonnements TCG — à connecter à votre base Supabase</p>
              </Card>
            </>
          )}

          {view === 'pokemon_analytics' && (
            <>
              <SectionHeader title="Analytics Pokémon" />
              <div className="grid grid-cols-4 gap-4 mb-8">
                <StatCard label="Références" value={pokeCards.length} color="text-[#FBBF24]" />
                <StatCard label="Cartes total" value={pokeStats.totalQty} color="text-yellow-300" />
                <StatCard label="Valeur achat" value={pokeStats.totalBuy.toFixed(0) + '€'} color="text-red-400" />
                <StatCard label="Valeur marché" value={pokeStats.totalMarket.toFixed(0) + '€'} sub={`PnL : ${(pokeStats.totalMarket - pokeStats.totalBuy) > 0 ? '+' : ''}${(pokeStats.totalMarket - pokeStats.totalBuy).toFixed(0)}€`} color="text-green-400" />
              </div>
              <Card className="p-6">
                <h3 className="text-white font-semibold mb-4">Répartition par set</h3>
                {Array.from(new Set(pokeCards.map(c => c.set || 'Sans set'))).map(set => {
                  const cards = pokeCards.filter(c => (c.set || 'Sans set') === set)
                  const qty = cards.reduce((s, c) => s + (parseInt(c.quantity) || 1), 0)
                  const value = cards.reduce((s, c) => s + (parseFloat(c.market_price) || 0) * (parseInt(c.quantity) || 1), 0)
                  return (
                    <div key={set} className="flex items-center gap-4 py-3 border-b border-[#2A2D3E]">
                      <span className="text-sm text-white w-48">{set}</span>
                      <div className="flex-1 bg-[#0F1117] rounded-full h-2"><div className="bg-[#FBBF24] h-2 rounded-full" style={{ width: pokeCards.length > 0 ? `${(cards.length / pokeCards.length) * 100}%` : '0%' }} /></div>
                      <span className="text-xs text-gray-400 w-20 text-right">{qty} carte{qty > 1 ? 's' : ''}</span>
                      <span className="text-xs text-[#FBBF24] font-medium w-20 text-right">{value.toFixed(0)}€</span>
                    </div>
                  )
                })}
                {pokeCards.length === 0 && <EmptyState text="Aucune carte à analyser" />}
              </Card>
            </>
          )}

          {/* ════════════════════ VINTED ════════════════════ */}

          {view === 'vinted_accounts' && (
            <>
              <SectionHeader title="Comptes Vinted" sub={`${vintedAccounts.length} compte${vintedAccounts.length > 1 ? 's' : ''} actif${vintedAccounts.length > 1 ? 's' : ''}`}>
                <button onClick={() => { setEditingAccount(null); setAccountForm({ username: '', email: '', wallet: '', notes: '' }) }} className="text-xs bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 px-3 py-1.5 rounded-lg hover:bg-[#34D399]/30 transition-all">+ Ajouter</button>
              </SectionHeader>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <StatCard label="Comptes" value={vintedStats.accounts} color="text-[#34D399]" />
                <StatCard label="Transactions" value={vintedStats.totalTx} color="text-blue-400" />
                <StatCard label="Wallet total" value={vintedStats.totalWallet.toFixed(2) + '€'} color="text-yellow-400" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-white font-semibold mb-4">{editingAccount ? '✏️ Modifier le compte' : '➕ Nouveau compte'}</h3>
                  {[['Pseudo Vinted', 'username', '@mon_compte'], ['Email', 'email', 'email@exemple.com'], ['Wallet (€)', 'wallet', '0.00'], ['Notes', 'notes', 'Notes...']].map(([label, field, ph]) => (
                    <div key={field} className="mb-3">
                      <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">{label}</label>
                      <input value={accountForm[field]} onChange={e => setAccountForm(f => ({ ...f, [field]: e.target.value }))} placeholder={ph} className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#34D399]" />
                    </div>
                  ))}
                  <div className="flex gap-2 mt-4">
                    <button onClick={saveAccount} className="flex-1 bg-[#34D399] hover:bg-[#10b981] text-black py-2.5 rounded-lg text-sm font-medium">{editingAccount ? 'Modifier' : 'Créer'}</button>
                    {editingAccount && <button onClick={() => setEditingAccount(null)} className="border border-[#2A2D3E] text-gray-400 px-4 py-2.5 rounded-lg text-sm">Annuler</button>}
                  </div>
                </Card>

                <div className="flex flex-col gap-3">
                  {vintedAccounts.length === 0 && <EmptyState text="Aucun compte Vinted" />}
                  {vintedAccounts.map(account => {
                    const acTx = vintedTransactions.filter(t => t.account_id === account.id)
                    const acSales = acTx.filter(t => t.type === 'sale').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
                    return (
                      <Card key={account.id} className="p-4 hover:border-[#34D399] cursor-pointer transition-all" onClick={() => setSelectedAccount(account)}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#34D399]/20 flex items-center justify-center text-[#34D399] font-bold">{account.username?.[0]?.toUpperCase() || 'V'}</div>
                            <div><p className="text-white font-medium">{account.username}</p><p className="text-gray-500 text-xs">{account.email || 'Pas d\'email'}</p></div>
                          </div>
                          <div className="text-right">
                            <p className="text-[#34D399] font-medium text-sm">{parseFloat(account.wallet || 0).toFixed(2)}€</p>
                            <p className="text-xs text-gray-500">Wallet</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-[#2A2D3E]">
                          <span className="text-xs text-gray-400">{acTx.length} transaction{acTx.length > 1 ? 's' : ''}</span>
                          <span className="text-xs text-green-400">{acSales.toFixed(0)}€ de ventes</span>
                          <button onClick={e => { e.stopPropagation(); deleteAccount(account.id) }} className="ml-auto text-xs text-red-400 hover:text-red-300">Suppr.</button>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {view === 'vinted_transactions' && (
            <>
              <SectionHeader title="Transactions Vinted" sub={`${vintedTransactions.length} transaction${vintedTransactions.length > 1 ? 's' : ''}`} />
              <div className="grid grid-cols-3 gap-4 mb-6">
                <StatCard label="Total transactions" value={vintedStats.totalTx} color="text-[#34D399]" />
                <StatCard label="Total ventes" value={vintedStats.totalSales.toFixed(0) + '€'} color="text-green-400" />
                <StatCard label="Comptes actifs" value={vintedStats.accounts} color="text-blue-400" />
              </div>
              <Card className="overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-[#2A2D3E]">{['Compte', 'Type', 'Montant', 'Description', 'Date'].map(h => <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                  <tbody>
                    {vintedTransactions.map(tx => {
                      const account = vintedAccounts.find(a => a.id === tx.account_id)
                      return (
                        <tr key={tx.id} className="border-b border-[#2A2D3E] hover:bg-[#1E2130]">
                          <td className="px-4 py-3 text-sm text-white">{account?.username || '—'}</td>
                          <td className="px-4 py-3"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${tx.type === 'sale' ? 'bg-green-500/20 text-green-300' : tx.type === 'purchase' ? 'bg-red-500/20 text-red-300' : 'bg-gray-500/20 text-gray-300'}`}>{tx.type === 'sale' ? 'Vente' : tx.type === 'purchase' ? 'Achat' : tx.type || '—'}</span></td>
                          <td className={`px-4 py-3 text-sm font-medium ${tx.type === 'sale' ? 'text-green-400' : 'text-red-400'}`}>{tx.type === 'sale' ? '+' : '-'}{parseFloat(tx.amount || 0).toFixed(2)}€</td>
                          <td className="px-4 py-3 text-sm text-gray-400">{tx.description || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{tx.created_at ? new Date(tx.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {vintedTransactions.length === 0 && <EmptyState text="Aucune transaction" />}
              </Card>
            </>
          )}

          {view === 'vinted_messages' && (
            <>
              <SectionHeader title="Messages Vinted" sub="Gestion des conversations multi-comptes" />
              <Card className="p-12 flex flex-col items-center justify-center gap-3">
                <div className="text-4xl">💬</div>
                <p className="text-white font-medium">Module Messages Vinted</p>
                <p className="text-gray-500 text-sm">Import, notifications, conversations — à connecter à votre base Supabase</p>
              </Card>
            </>
          )}

          {view === 'vinted_favorites' && (
            <>
              <SectionHeader title="Favoris Vinted" sub="Articles favoris multi-comptes" />
              <Card className="p-12 flex flex-col items-center justify-center gap-3">
                <div className="text-4xl">❤️</div>
                <p className="text-white font-medium">Module Favoris Vinted</p>
                <p className="text-gray-500 text-sm">Favoris, cycle achat/vente — à connecter à votre base Supabase</p>
              </Card>
            </>
          )}

        </div>
      </div>
    </div>
  )
}