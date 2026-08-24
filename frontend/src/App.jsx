import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { Activity, ArrowDown, ArrowUp, BarChart3, Bot, Check, ChevronDown, Clock3, Loader2, Package, RefreshCw, ShoppingCart, Sparkles, TrendingUp, X, Zap } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
const api = axios.create({ baseURL: API, timeout: 8000 })

const triggerStyle = {
  INVENTORY_LOW: 'bg-amber-50 text-amber-700 border-amber-200',
  DEMAND_SPIKE: 'bg-rose-50 text-rose-700 border-rose-200',
  MANUAL: 'bg-slate-50 text-slate-600 border-slate-200',
  INITIAL: 'bg-blue-50 text-blue-700 border-blue-200',
}

function TriggerBadge({ value }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${triggerStyle[value] || triggerStyle.MANUAL}`}>{value?.replaceAll('_', ' ')}</span>
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [products, setProducts] = useState([])
  const [pricing, setPricing] = useState([])
  const [reorders, setReorders] = useState([])
  const [strategy, setStrategy] = useState('RULE_BASED')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [p, ps, rs, s] = await Promise.all([
        api.get('/products'), api.get('/pricing-suggestions'), api.get('/reorder-suggestions'), api.get('/strategy')
      ])
      setProducts(p.data); setPricing(ps.data); setReorders(rs.data); setStrategy(s.data.strategy)
      setError('')
    } catch (e) { setError(e.response?.data?.message || 'Backend is unreachable. Start Spring Boot or check VITE_API_URL.') }
    finally { if (!silent) setLoading(false) }
  }, [])

  useEffect(() => { refresh(); const id = setInterval(() => refresh(true), 2000); return () => clearInterval(id) }, [refresh])

  const switchStrategy = async () => {
    const next = strategy === 'AI' ? 'RULE_BASED' : 'AI'
    setWorking('strategy')
    try { const r = await api.put('/strategy', { strategy: next }); setStrategy(r.data.strategy) }
    catch (e) { setError('Could not switch strategy.') }
    finally { setWorking('') }
  }

  const sale = async (id) => {
    setWorking(`sale-${id}`)
    try { await api.post(`/products/${id}/orders`); setTimeout(() => refresh(true), 250) }
    catch { setError('Sale simulation failed.') }
    finally { setWorking('') }
  }

  const suggest = async (id, type) => {
    setWorking(`${type}-${id}`)
    try { await api.post(`/products/${id}/suggest-${type}`); setTimeout(() => refresh(true), 300) }
    catch { setError('Suggestion request failed.') }
    finally { setWorking('') }
  }

  const decide = async (type, id, decision) => {
    setWorking(`${type}-${id}`)
    try { await api.patch(`/${type}-suggestions/${id}`, { decision }); await refresh(true) }
    catch { setError(`Could not ${decision.toLowerCase()} suggestion.`) }
    finally { setWorking('') }
  }

  const totalPending = pricing.length + reorders.length

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white/95 sticky top-0 z-20 backdrop-blur">
        <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/15 text-teal-600 flex items-center justify-center"><Activity size={21}/></div>
            <div><div className="text-xl font-bold tracking-tight">StockPulse</div><div className="text-xs text-slate-500">AI inventory & dynamic pricing engine</div></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block"><div className="text-[10px] uppercase tracking-widest text-slate-500">Runtime engine</div><div className="text-sm font-semibold text-slate-800">{strategy === 'AI' ? 'AI Commerce Advisor' : 'Rule-Based Engine'}</div></div>
            <button onClick={switchStrategy} disabled={working === 'strategy'} aria-label="Toggle strategy" className="w-14 h-8 rounded-full bg-slate-200 border border-slate-300 p-1 transition disabled:opacity-50">
              <span className={`block h-6 w-6 rounded-full transition-transform ${strategy === 'AI' ? 'translate-x-6 bg-teal-500' : 'translate-x-0 bg-slate-400'}`}/>
            </button>
          </div>
        </div>
      </header>
      
      {/* Tab Navigation */}
      <nav className="border-b border-slate-200 bg-white/80">
        <div className="max-w-7xl mx-auto px-5">
          <div className="flex overflow-x-auto">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'dashboard' 
                  ? 'border-teal-500 text-teal-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart3 className="inline-block mr-2" size={16} />
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'catalog' 
                  ? 'border-teal-500 text-teal-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Package className="inline-block mr-2" size={16} />
              Catalog
            </button>
            <button 
              onClick={() => setActiveTab('suggestions')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'suggestions' 
                  ? 'border-teal-500 text-teal-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sparkles className="inline-block mr-2" size={16} />
              Suggestions
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'analytics' 
                  ? 'border-teal-500 text-teal-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <TrendingUp className="inline-block mr-2" size={16} />
              Analytics
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-5 py-7 w-full">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-7">
            {error && <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center justify-between"><span>{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}

            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Metric icon={<Package size={17}/>} label="Products" value={products.length}/>
              <Metric icon={<Zap size={17}/>} label="Pending actions" value={pricing.length + reorders.length}/>
              <Metric icon={<Bot size={17}/>} label="AI mode" value={strategy === 'AI' ? 'ON' : 'OFF'}/>
              <Metric icon={<RefreshCw size={17}/>} label="Signal polling" value="2 sec"/>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
              <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Recent Products</h2>
                    <p className="text-xs text-slate-500 mt-1">Your product catalog snapshot</p>
                  </div>
                  <button onClick={() => refresh()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Refresh">
                    <RefreshCw size={16}/>
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-[10px] uppercase tracking-widest text-slate-500 bg-slate-50">
                      <tr>
                        <th className="text-left px-5 py-3">Product</th>
                        <th className="text-right px-3 py-3">Stock</th>
                        <th className="text-right px-3 py-3">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="3" className="p-10 text-center text-slate-500">
                            <Loader2 className="animate-spin inline"/>
                          </td>
                        </tr>
                      ) : (
                        products.slice(0, 5).map(p => (
                          <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-5 py-4">
                              <div className="font-medium">{p.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{p.sku}</div>
                            </td>
                            <td className="px-3 py-4 text-right">
                              <span className={p.stockLevel < p.reorderThreshold ? 'text-amber-600 font-semibold' : 'text-slate-700'}>
                                {p.stockLevel}
                              </span>
                              <span className="text-[10px] text-slate-500"> / {p.reorderThreshold}</span>
                            </td>
                            <td className="px-3 py-4 text-right font-mono">${Number(p.currentPrice).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Recent Suggestions</h2>
                    <p className="text-xs text-slate-500 mt-1">Latest AI recommendations</p>
                  </div>
                  <span className="text-xs text-slate-500">{pricing.length + reorders.length} pending</span>
                </div>
                {pricing.length + reorders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500 h-full flex items-center justify-center">
                    <div>
                      <Sparkles className="mx-auto mb-3 text-teal-500" size={24}/>
                      <p className="text-sm">No pending suggestions.</p>
                      <p className="text-xs mt-1">Simulate a sale to trigger recommendations.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[...pricing, ...reorders].slice(0, 3).map((s, index) => {
                      const isPricing = pricing.some(p => p.id === s.id);
                      return <SuggestionCard key={`${isPricing ? 'p' : 'r'}-${s.id}`} type={isPricing ? "pricing" : "reorder"} suggestion={s} working={working} decide={decide}/>
                    })}
                  </div>
                )}
              </section>
            </div>

            <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5 flex flex-col md:flex-row gap-4 md:items-center">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
                <TrendingUp size={20}/>
              </div>
              <div>
                <div className="font-semibold text-teal-800">Getting Started</div>
                <p className="text-xs text-slate-500 mt-1">
                  Navigate through the tabs to explore different sections of the inventory management system. 
                  Hit "Simulate Sale" on products to see how AI generates pricing and reorder recommendations.
                </p>
              </div>
            </section>
          </div>
        )}

      {/* Suggestions Tab */}
      {activeTab === 'suggestions' && (
        <div className="space-y-7">
            {error && <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 flex items-center justify-between"><span>{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}

            <div>
              <h2 className="text-2xl font-bold">AI Recommendations</h2>
              <p className="text-slate-500 mt-1">Intelligent suggestions to optimize your inventory</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <ArrowUp className="text-teal-600" size={20} />
                    Pricing Recommendations
                  </h3>
                  <div className="text-sm text-slate-500">{pricing.length} pending</div>
                </div>

                {pricing.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                    <ArrowUp className="mx-auto mb-3 text-teal-500" size={24}/>
                    <p className="text-sm">No pricing suggestions at this time.</p>
                    <p className="text-xs mt-1">AI will generate recommendations based on market trends.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pricing.map(s => (
                      <SuggestionCard 
                        key={`p-${s.id}`} 
                        type="pricing" 
                        suggestion={s} 
                        working={working} 
                        decide={decide}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <ArrowDown className="text-amber-400" size={20} />
                    Reorder Recommendations
                  </h3>
                  <div className="text-sm text-slate-500">{reorders.length} pending</div>
                </div>

                {reorders.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                    <ArrowDown className="mx-auto mb-3 text-amber-300" size={24}/>
                    <p className="text-sm">No reorder suggestions at this time.</p>
                    <p className="text-xs mt-1">AI will generate recommendations when stock levels drop.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reorders.map(s => (
                      <SuggestionCard 
                        key={`r-${s.id}`} 
                        type="reorder" 
                        suggestion={s} 
                        working={working} 
                        decide={decide}
                    />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-7">
            {error && <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 flex items-center justify-between"><span>{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}

            <div>
              <h2 className="text-2xl font-bold">Inventory Analytics</h2>
              <p className="text-slate-500 mt-1">Data-driven insights for better decision making</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">Stock Level Trends</h3>
                  <select className="rounded-lg bg-slate-50 border border-slate-300 px-3 py-1 text-sm focus:outline-none">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                    <option>Last 90 Days</option>
                  </select>
                </div>
                <div className="h-64 flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <BarChart3 className="mx-auto mb-3 text-teal-500" size={32}/>
                    <p className="text-sm">Visualization area</p>
                    <p className="text-xs mt-1">Stock level trends chart would appear here</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="font-bold mb-4">Top Categories</h3>
                <div className="space-y-4">
                  {['Electronics', 'Clothing', 'Home & Kitchen', 'Beauty', 'Sports'].map((category, index) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm">{category}</span>
                      <div className="flex items-center">
                        <div className="w-24 bg-slate-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-teal-500 h-2 rounded-full"
                            style={{ width: `${100 - index * 15}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-slate-500 w-8">{100 - index * 15}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-teal-50 border border-teal-100">
                  <div className="text-2xl font-bold">98%</div>
                  <div className="text-xs text-slate-500 mt-1">In Stock Rate</div>
                </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="text-2xl font-bold">2.1</div>
                  <div className="text-xs text-slate-500 mt-1">Avg. Turnover</div>
                </div>
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="text-2xl font-bold">14d</div>
                  <div className="text-xs text-slate-500 mt-1">Avg. Lead Time</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-2xl font-bold">87%</div>
                  <div className="text-xs text-slate-500 mt-1">AI Accuracy</div>
                </div>
              </div>
            </section>
          </div>
      )}
    </main>
    </div>
  )
}

export default App

function Metric({ icon, label, value }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-slate-500">{icon}</div><div className="mt-3 text-xl font-bold">{value}</div><div className="text-[10px] uppercase tracking-widest text-slate-600 mt-1">{label}</div></div> }

function SuggestionCard({ type, suggestion: s, working, decide }) {
  const isPricing = type === 'pricing'; const product = s.product
  return <article className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] uppercase tracking-widest text-slate-500">{isPricing ? 'Pricing recommendation' : 'Replenishment recommendation'}</div><h3 className="font-semibold mt-1">{product.name}</h3></div><TriggerBadge value={s.triggerReason}/></div>
    <div className="grid grid-cols-2 gap-3 mt-5"><div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] text-slate-500 uppercase tracking-widest">{isPricing ? 'Recommended price' : 'Recommended qty'}</div><div className="text-xl font-bold mt-1">{isPricing ? `$${Number(s.recommendedPrice).toFixed(2)}` : s.recommendedQuantity}</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] text-slate-500 uppercase tracking-widest">Confidence</div><div className="text-xl font-bold mt-1 text-teal-600">{Math.round((s.confidence || 0) * 100)}%</div></div></div>
    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14}/> {isPricing ? `Direction: ${s.direction}` : `Lead time: ${s.suggestedLeadTimeDays} days`}</div>
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700"><span className="text-slate-500">Why: </span>{s.reasoning}</div>
    <div className="mt-4 flex gap-2"><button onClick={() => decide(type === 'pricing' ? 'pricing' : 'reorder', s.id, 'ACCEPTED')} disabled={working === `${type}-${s.id}`} className="flex-1 inline-flex justify-center items-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-xs font-bold text-white hover:bg-teal-600 disabled:opacity-50"><Check size={14}/> Accept</button><button onClick={() => decide(type === 'pricing' ? 'pricing' : 'reorder', s.id, 'REJECTED')} disabled={working === `${type}-${s.id}`} className="flex-1 inline-flex justify-center items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><X size={14}/> Reject</button></div>
  </article>
}
