import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, Wallet, TrendingDown, TrendingUp } from "lucide-react";

const STORAGE_KEY = "genevieve-budget-data-v1";

function money(value) {
  return (Number(value) || 0).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStatus(spent, budget) {
  if (!budget || budget <= 0) return "neutral";
  const pct = spent / budget;
  if (pct >= 1) return "red";
  if (pct >= 0.7) return "amber";
  return "green";
}

function buildInsights(rows, income, totalSpent) {
  const insights = [];
  rows
    .filter((c) => c.budget > 0 && c.spent > c.budget)
    .sort((a, b) => b.spent - b.budget - (a.spent - a.budget))
    .forEach((c) => insights.push({ status: "red", text: `${c.name} is $${money(c.spent - c.budget)} over budget.` }));

  rows
    .filter((c) => c.budget > 0 && c.spent <= c.budget && c.spent / c.budget >= 0.7)
    .forEach((c) => insights.push({ status: "amber", text: `${c.name} has $${money(c.budget - c.spent)} left before it reaches its limit.` }));

  if (income > 0) {
    const savingsRate = ((income - totalSpent) / income) * 100;
    if (savingsRate < 0) insights.push({ status: "red", text: `Spending is $${money(totalSpent - income)} above income this month.` });
    else if (savingsRate < 10) insights.push({ status: "amber", text: `Current savings rate is ${savingsRate.toFixed(1)}%.` });
    else insights.push({ status: "green", text: `Current savings rate is ${savingsRate.toFixed(1)}%.` });
  }

  if (!insights.length) insights.push({ status: "green", text: "Add categories and log spending to build your monthly picture." });
  return insights;
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [income, setIncome] = useState("");
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryBudget, setNewCategoryBudget] = useState("");
  const [transactionCategory, setTransactionCategory] = useState("");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionNote, setTransactionNote] = useState("");
  const [expandedCategory, setExpandedCategory] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setIncome(data.income ?? "");
        setCategories(Array.isArray(data.categories) ? data.categories : []);
        setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
      }
    } catch (error) {
      console.error("Unable to load saved budget data", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ income, categories, transactions }));
  }, [loaded, income, categories, transactions]);

  const rows = useMemo(
    () => categories.map((category) => {
      const spent = transactions
        .filter((transaction) => transaction.categoryId === category.id)
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
      return { ...category, budget: Number(category.budget || 0), spent, status: getStatus(spent, Number(category.budget || 0)) };
    }),
    [categories, transactions]
  );

  const totalBudget = rows.reduce((sum, category) => sum + category.budget, 0);
  const totalSpent = rows.reduce((sum, category) => sum + category.spent, 0);
  const incomeNumber = Number(income) || 0;
  const remaining = (incomeNumber > 0 ? incomeNumber : totalBudget) - totalSpent;
  const overallStatus = getStatus(totalSpent, incomeNumber > 0 ? incomeNumber : totalBudget);
  const insights = useMemo(() => buildInsights(rows, incomeNumber, totalSpent), [rows, incomeNumber, totalSpent]);
  const monthLabel = useMemo(() => new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" }), []);

  function addCategory() {
    const name = newCategoryName.trim();
    const budget = Number(newCategoryBudget);
    if (!name || budget <= 0) return;
    setCategories((current) => [...current, { id: crypto.randomUUID(), name, budget }]);
    setNewCategoryName("");
    setNewCategoryBudget("");
    setShowAddCategory(false);
  }

  function deleteCategory(id) {
    if (!confirm("Delete this category and its transactions?")) return;
    setCategories((current) => current.filter((category) => category.id !== id));
    setTransactions((current) => current.filter((transaction) => transaction.categoryId !== id));
    if (expandedCategory === id) setExpandedCategory(null);
  }

  function addTransaction() {
    const amount = Number(transactionAmount);
    if (!transactionCategory || amount <= 0) return;
    setTransactions((current) => [...current, {
      id: crypto.randomUUID(),
      categoryId: transactionCategory,
      amount,
      note: transactionNote.trim(),
      date: new Date().toISOString().slice(0, 10),
    }]);
    setTransactionAmount("");
    setTransactionNote("");
  }

  function resetAll() {
    if (!confirm("Clear all budget data? This cannot be undone.")) return;
    setIncome("");
    setCategories([]);
    setTransactions([]);
    setExpandedCategory(null);
  }

  return (
    <main className="app-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        :root { color-scheme: dark; font-family: Inter, sans-serif; background:#10161d; }
        * { box-sizing:border-box; }
        .app-shell { --bg:#10161d; --panel:#182029; --panel2:#1f2933; --line:#2b3540; --text:#ece8df; --muted:#8d99a7; --gold:#c9a24a; --green:#4fae73; --amber:#e3a73a; --red:#e2584c; min-height:100vh; background:var(--bg); color:var(--text); padding:24px 16px 48px; }
        .wrap { width:min(100%, 560px); margin:0 auto; }
        .eyebrow,.section-title { font-family:'IBM Plex Mono',monospace; text-transform:uppercase; letter-spacing:.13em; font-size:11px; }
        .eyebrow { color:var(--gold); margin:0 0 6px; }
        h1 { font-family:Fraunces,serif; font-size:32px; margin:0; }
        .sub { color:var(--muted); margin:4px 0 22px; font-size:13px; }
        .card,.form,.insight { background:var(--panel); border:1px solid var(--line); border-radius:10px; }
        .summary { padding:16px; margin-bottom:22px; border-left:4px solid var(--line); }
        .summary.green { border-left-color:var(--green); }.summary.amber{border-left-color:var(--amber)}.summary.red{border-left-color:var(--red)}
        .summary-row { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:9px 0; border-bottom:1px dashed var(--line); }
        .summary-row:last-child { border-bottom:0; }.label{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em}.money{font-family:'IBM Plex Mono',monospace;font-size:18px}.money.big{font-size:24px}
        input,select { width:100%; border:1px solid var(--line); background:var(--panel2); color:var(--text); border-radius:7px; padding:11px 12px; outline:none; }
        input:focus,select:focus { border-color:var(--gold); }.income{width:140px;text-align:right;background:transparent;border:0;border-bottom:1px solid var(--line);border-radius:0;font-family:'IBM Plex Mono',monospace;font-size:18px}
        .section-title { display:flex; justify-content:space-between; align-items:center; color:var(--muted); margin:24px 0 10px; }.add-link{color:var(--gold);cursor:pointer;display:flex;align-items:center;gap:4px}
        .form { padding:14px; display:grid; gap:9px; margin-bottom:14px; }.row2{display:grid;grid-template-columns:1fr 1fr;gap:9px}.btn{border:1px solid var(--gold);background:var(--gold);color:#171108;border-radius:7px;padding:11px 13px;font-weight:600;cursor:pointer;display:flex;justify-content:center;align-items:center;gap:7px}.btn:hover{filter:brightness(1.05)}
        .empty{border:1px dashed var(--line);border-radius:8px;padding:22px;text-align:center;color:var(--muted);font-size:13px}.category{border-left:2px dashed var(--line);padding-left:12px;margin:15px 0}.category-head{display:flex;align-items:center;gap:8px;cursor:pointer}.category-name{flex:1;font-weight:600}.category-numbers{font-family:'IBM Plex Mono',monospace;color:var(--muted);font-size:12px}.category-numbers b{color:var(--text)}.icon-btn{background:none;border:0;color:var(--muted);cursor:pointer;padding:3px}.icon-btn:hover{color:var(--red)}
        .lamp{width:10px;height:10px;border-radius:999px;background:#445162;display:inline-block;flex:0 0 auto}.lamp.green{background:var(--green)}.lamp.amber{background:var(--amber)}.lamp.red{background:var(--red)}
        .track{height:5px;background:var(--panel2);border-radius:10px;overflow:hidden;margin:8px 0}.fill{height:100%;background:var(--green)}.fill.amber{background:var(--amber)}.fill.red{background:var(--red)}
        .transaction{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--line);color:var(--muted);font-size:12px}.transaction .amount{color:var(--text);font-family:'IBM Plex Mono',monospace}.insight{display:flex;gap:10px;padding:12px;margin-bottom:8px;font-size:13px;line-height:1.45}.footer{text-align:center;margin-top:28px}.clear{background:none;border:0;color:var(--muted);text-decoration:underline;cursor:pointer;font-size:12px}
        @media(max-width:480px){.row2{grid-template-columns:1fr}.category-head{align-items:flex-start}.category-numbers{max-width:120px;text-align:right}.income{width:115px}}
      `}</style>

      <div className="wrap">
        <p className="eyebrow">Genevieve · Budget Ledger</p>
        <h1>Where it's going</h1>
        <p className="sub">{monthLabel}</p>

        <section className={`card summary ${overallStatus}`}>
          <div className="summary-row"><span className="label">Income</span><input className="income" type="number" inputMode="decimal" placeholder="0.00" value={income} onChange={(e) => setIncome(e.target.value)} /></div>
          <div className="summary-row"><span className="label">Spent</span><span className="money">${money(totalSpent)}</span></div>
          <div className="summary-row"><span className="label"><span className={`lamp ${overallStatus}`} /> {incomeNumber > 0 ? " Left this month" : " Budget remaining"}</span><span className="money big" style={{ color: remaining < 0 ? "var(--red)" : undefined }}>{remaining < 0 ? "-" : ""}${money(Math.abs(remaining))}</span></div>
        </section>

        <div className="section-title"><span>Categories</span><span className="add-link" onClick={() => setShowAddCategory((value) => !value)}><Plus size={14}/> Add</span></div>

        {showAddCategory && <div className="form"><input placeholder="Category name, e.g. Groceries" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} /><input type="number" inputMode="decimal" placeholder="Monthly budget ($)" value={newCategoryBudget} onChange={(e) => setNewCategoryBudget(e.target.value)} /><button className="btn" onClick={addCategory}><Plus size={15}/>Add category</button></div>}

        {!rows.length && !showAddCategory && <div className="empty">No categories yet. Add rent, groceries, transport or any other monthly expense and give it a limit.</div>}

        {rows.map((category) => {
          const open = expandedCategory === category.id;
          const percentage = category.budget > 0 ? Math.min(100, (category.spent / category.budget) * 100) : 0;
          const categoryTransactions = transactions.filter((transaction) => transaction.categoryId === category.id).slice().reverse();
          return <section className="category" key={category.id}>
            <div className="category-head" onClick={() => setExpandedCategory(open ? null : category.id)}>
              <span className={`lamp ${category.status}`} />
              <span className="category-name">{category.name}</span>
              <span className="category-numbers"><b>${money(category.spent)}</b> / ${money(category.budget)}</span>
              {open ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} 
              <button className="icon-btn" aria-label={`Delete ${category.name}`} onClick={(event) => { event.stopPropagation(); deleteCategory(category.id); }}><Trash2 size={15}/></button>
            </div>
            <div className="track"><div className={`fill ${category.status}`} style={{ width: `${percentage}%` }} /></div>
            {open && <div>{categoryTransactions.length === 0 ? <p className="sub">No spending logged yet.</p> : categoryTransactions.map((transaction) => <div className="transaction" key={transaction.id}><span>{transaction.date}{transaction.note ? ` — ${transaction.note}` : ""}</span><span><span className="amount">${money(transaction.amount)}</span> <button className="icon-btn" aria-label="Delete transaction" onClick={() => setTransactions((current) => current.filter((item) => item.id !== transaction.id))}><Trash2 size={12}/></button></span></div>)}</div>}
          </section>;
        })}

        {!!rows.length && <div className="form" style={{ marginTop: 20 }}><div className="section-title" style={{ margin: 0 }}><span>Log a spend</span></div><select value={transactionCategory} onChange={(e) => setTransactionCategory(e.target.value)}><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><div className="row2"><input type="number" inputMode="decimal" placeholder="Amount ($)" value={transactionAmount} onChange={(e) => setTransactionAmount(e.target.value)} /><input placeholder="Note (optional)" value={transactionNote} onChange={(e) => setTransactionNote(e.target.value)} /></div><button className="btn" onClick={addTransaction}><Wallet size={15}/>Log spend</button></div>}

        <div className="section-title"><span>{overallStatus === "red" ? <TrendingDown size={14} style={{ verticalAlign: "middle" }}/> : <TrendingUp size={14} style={{ verticalAlign: "middle" }}/>} Insights</span></div>
        {insights.map((insight, index) => <div className="insight" key={`${insight.status}-${index}`}><span className={`lamp ${insight.status}`} /><span>{insight.text}</span></div>)}

        <div className="footer"><button className="clear" onClick={resetAll}>Clear all data</button></div>
      </div>
    </main>
  );
}
