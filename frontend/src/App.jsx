// import { useState } from 'react'
// import heroImg from './assets/hero.png'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <section id="center">
//         <div className="hero">
//           <img src={heroImg} className="base" width="170" height="179" alt="" />
//           <img src={reactLogo} className="framework" alt="React logo" />
//           <img src={viteLogo} className="vite" alt="Vite logo" />
//         </div>
//         <div>
//           <h1>Get started</h1>
//           <p>
//             Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
//           </p>
//         </div>
//         <button
//           type="button"
//           className="counter"
//           onClick={() => setCount((count) => count + 1)}
//         >
//           Count is {count}
//         </button>
//       </section>

//       <div className="ticks"></div>

//       <section id="next-steps">
//         <div id="docs">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#documentation-icon"></use>
//           </svg>
//           <h2>Documentation</h2>
//           <p>Your questions, answered</p>
//           <ul>
//             <li>
//               <a href="https://vite.dev/" target="_blank">
//                 <img className="logo" src={viteLogo} alt="" />
//                 Explore Vite
//               </a>
//             </li>
//             <li>
//               <a href="https://react.dev/" target="_blank">
//                 <img className="button-icon" src={reactLogo} alt="" />
//                 Learn more
//               </a>
//             </li>
//           </ul>
//         </div>
//         <div id="social">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#social-icon"></use>
//           </svg>
//           <h2>Connect with us</h2>
//           <p>Join the Vite community</p>
//           <ul>
//             <li>
//               <a href="https://github.com/vitejs/vite" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#github-icon"></use>
//                 </svg>
//                 GitHub
//               </a>
//             </li>
//             <li>
//               <a href="https://chat.vite.dev/" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#discord-icon"></use>
//                 </svg>
//                 Discord
//               </a>
//             </li>
//             <li>
//               <a href="https://x.com/vite_js" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#x-icon"></use>
//                 </svg>
//                 X.com
//               </a>
//             </li>
//             <li>
//               <a href="https://bsky.app/profile/vite.dev" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#bluesky-icon"></use>
//                 </svg>
//                 Bluesky
//               </a>
//             </li>
//           </ul>
//         </div>
//       </section>

//       <div className="ticks"></div>
//       <section id="spacer"></section>
//     </>
//   )
// }

// export default App


import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { Activity, Bot, Check, ChevronDown, Clock3, Loader2, Package, RefreshCw, ShoppingCart, Sparkles, TrendingUp, X, Zap } from 'lucide-react'

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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/95 sticky top-0 z-20 backdrop-blur">
        <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-400/15 text-emerald-300 flex items-center justify-center"><Activity size={21}/></div>
            <div><div className="text-xl font-bold tracking-tight">StockPulse</div><div className="text-xs text-slate-400">AI inventory & dynamic pricing engine</div></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block"><div className="text-[10px] uppercase tracking-widest text-slate-500">Runtime engine</div><div className="text-sm font-semibold text-slate-200">{strategy === 'AI' ? 'AI Commerce Advisor' : 'Rule-Based Engine'}</div></div>
            <button onClick={switchStrategy} disabled={working === 'strategy'} aria-label="Toggle strategy" className="w-14 h-8 rounded-full bg-slate-800 border border-white/10 p-1 transition disabled:opacity-50">
              <span className={`block h-6 w-6 rounded-full transition-transform ${strategy === 'AI' ? 'translate-x-6 bg-emerald-300' : 'translate-x-0 bg-slate-400'}`}/>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-7 space-y-7">
        {error && <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 flex items-center justify-between"><span>{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric icon={<Package size={17}/>} label="Products" value={products.length}/>
          <Metric icon={<Zap size={17}/>} label="Pending actions" value={totalPending}/>
          <Metric icon={<Bot size={17}/>} label="AI mode" value={strategy === 'AI' ? 'ON' : 'OFF'}/>
          <Metric icon={<RefreshCw size={17}/>} label="Signal polling" value="2 sec"/>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.035] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3"><div><h2 className="font-semibold">Catalog signals</h2><p className="text-xs text-slate-500 mt-1">Simulate a sale to drive the event → recommendation loop.</p></div><button onClick={() => refresh()} className="p-2 rounded-lg hover:bg-white/10 text-slate-400" title="Refresh"><RefreshCw size={16}/></button></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-[10px] uppercase tracking-widest text-slate-500 bg-white/[0.02]"><tr><th className="text-left px-5 py-3">Product</th><th className="text-left px-3 py-3">Category</th><th className="text-right px-3 py-3">Stock</th><th className="text-right px-3 py-3">Velocity / 24h</th><th className="text-right px-3 py-3">Price</th><th className="text-right px-5 py-3">Demo action</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan="6" className="p-10 text-center text-slate-500"><Loader2 className="animate-spin inline"/></td></tr> : products.map(p => <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.025]">
            <td className="px-5 py-4"><div className="font-medium">{p.name}</div><div className="text-[11px] text-slate-500 font-mono">{p.sku}</div></td>
            <td className="px-3 py-4"><span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">{p.category}</span></td>
            <td className="px-3 py-4 text-right"><span className={p.stockLevel < p.reorderThreshold ? 'text-amber-300 font-semibold' : 'text-slate-300'}>{p.stockLevel}</span><span className="text-[10px] text-slate-600"> / {p.reorderThreshold}</span></td>
            <td className="px-3 py-4 text-right text-slate-300">{p.demandVelocity}</td>
            <td className="px-3 py-4 text-right font-mono">${Number(p.currentPrice).toFixed(2)}</td>
            <td className="px-5 py-4 text-right"><button onClick={() => sale(p.id)} disabled={working === `sale-${p.id}`} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"><ShoppingCart size={14}/>{working === `sale-${p.id}` ? 'Selling…' : 'Simulate Sale'}</button></td>
          </tr>)}</tbody></table></div>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between"><div><h2 className="text-lg font-semibold">Merchandising queue</h2><p className="text-xs text-slate-500 mt-1">The agent proposes. A human approves before price or inventory changes.</p></div><span className="text-xs text-slate-500">{totalPending} pending</span></div>
          {totalPending === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500"><Sparkles className="mx-auto mb-3 text-emerald-300" size={24}/><p className="text-sm">No pending suggestions.</p><p className="text-xs mt-1">Simulate a sale on the Organic Cotton T-Shirt to trigger inventory-low recommendations.</p></div> : <div className="grid lg:grid-cols-2 gap-4">{pricing.map(s => <SuggestionCard key={`p-${s.id}`} type="pricing" suggestion={s} working={working} decide={decide}/>) }{reorders.map(s => <SuggestionCard key={`r-${s.id}`} type="reorder" suggestion={s} working={working} decide={decide}/>)}</div>}
        </section>

        <section className="rounded-2xl border border-emerald-300/15 bg-emerald-300/5 p-5 flex flex-col md:flex-row gap-4 md:items-center"><div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-300/10 flex items-center justify-center text-emerald-300"><TrendingUp size={20}/></div><div><div className="font-semibold text-emerald-100">Demo path</div><p className="text-xs text-slate-400 mt-1">Hit “Simulate Sale” on <b>Organic Cotton T-Shirt</b>. Its stock starts below threshold, so the event-driven agent queues pricing + reorder suggestions asynchronously. Accepting pricing changes the live price; accepting reorder simulates inbound stock.</p></div></section>
      </main>
    </div>
  )
}

function Metric({ icon, label, value }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="text-slate-500">{icon}</div><div className="mt-3 text-xl font-bold">{value}</div><div className="text-[10px] uppercase tracking-widest text-slate-600 mt-1">{label}</div></div> }

function SuggestionCard({ type, suggestion: s, working, decide }) {
  const isPricing = type === 'pricing'; const product = s.product
  return <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
    <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] uppercase tracking-widest text-slate-500">{isPricing ? 'Pricing recommendation' : 'Replenishment recommendation'}</div><h3 className="font-semibold mt-1">{product.name}</h3></div><TriggerBadge value={s.triggerReason}/></div>
    <div className="grid grid-cols-2 gap-3 mt-5"><div className="rounded-xl bg-black/20 p-3"><div className="text-[10px] text-slate-500 uppercase tracking-widest">{isPricing ? 'Recommended price' : 'Recommended qty'}</div><div className="text-xl font-bold mt-1">{isPricing ? `$${Number(s.recommendedPrice).toFixed(2)}` : s.recommendedQuantity}</div></div><div className="rounded-xl bg-black/20 p-3"><div className="text-[10px] text-slate-500 uppercase tracking-widest">Confidence</div><div className="text-xl font-bold mt-1 text-emerald-300">{Math.round((s.confidence || 0) * 100)}%</div></div></div>
    <div className="mt-4 flex items-center gap-2 text-xs text-slate-400"><Clock3 size={14}/> {isPricing ? `Direction: ${s.direction}` : `Lead time: ${s.suggestedLeadTimeDays} days`}</div>
    <div className="mt-4 rounded-xl border border-white/5 bg-slate-950/40 p-3 text-xs leading-5 text-slate-300"><span className="text-slate-500">Why: </span>{s.reasoning}</div>
    <div className="mt-4 flex gap-2"><button onClick={() => decide(type === 'pricing' ? 'pricing' : 'reorder', s.id, 'ACCEPTED')} disabled={working === `${type}-${s.id}`} className="flex-1 inline-flex justify-center items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"><Check size={14}/> Accept</button><button onClick={() => decide(type === 'pricing' ? 'pricing' : 'reorder', s.id, 'REJECTED')} disabled={working === `${type}-${s.id}`} className="flex-1 inline-flex justify-center items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50"><X size={14}/> Reject</button></div>
  </article>
}

export default App
