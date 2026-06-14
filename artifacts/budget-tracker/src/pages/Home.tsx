import { useState, useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

// --- Types ---
interface BudgetItem {
  id: string;
  label: string;
  amount: number;
}

interface Budget {
  incomeItems: BudgetItem[];
  expenseItems: BudgetItem[];
  investSplit: number;
}

// --- Persistence ---
const STORAGE_KEY = "fluxo_budget";

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const generateId = () => Math.random().toString(36).substr(2, 9);

const DEFAULT_BUDGET: Budget = {
  incomeItems: [],
  expenseItems: [],
  investSplit: 50,
};

function loadBudget(): Budget {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BUDGET;
    return JSON.parse(raw) as Budget;
  } catch {
    return DEFAULT_BUDGET;
  }
}

function saveBudget(budget: Budget) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
}

// --- BudgetItemRow ---
interface BudgetItemRowProps {
  item: BudgetItem;
  onChange: (id: string, field: keyof BudgetItem, value: string | number) => void;
  onDelete: (id: string) => void;
}

function BudgetItemRow({ item, onChange, onDelete }: BudgetItemRowProps) {
  return (
    <div
      className="group flex items-center gap-2 py-2.5 border-b border-border/40 last:border-0 animate-in fade-in slide-in-from-bottom-1 duration-200"
      data-testid={`budget-item-${item.id}`}
    >
      <input
        type="text"
        value={item.label}
        onChange={(e) => onChange(item.id, "label", e.target.value)}
        placeholder="Descrição..."
        data-testid={`input-label-${item.id}`}
        className="flex-1 min-w-0 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50 font-serif text-base py-1 truncate"
      />
      <div className="relative flex-shrink-0 w-28">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs pointer-events-none">
          R$
        </span>
        <input
          type="number"
          inputMode="decimal"
          value={item.amount || ""}
          onChange={(e) => onChange(item.id, "amount", parseFloat(e.target.value) || 0)}
          placeholder="0,00"
          min="0"
          step="0.01"
          data-testid={`input-amount-${item.id}`}
          className="w-full bg-card border border-border focus:border-primary rounded-lg outline-none text-foreground font-mono text-right text-sm pl-7 pr-2.5 py-2 transition-colors"
        />
      </div>
      <button
        onClick={() => onDelete(item.id)}
        data-testid={`button-delete-${item.id}`}
        className="flex-shrink-0 p-2 rounded-full text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 active:bg-destructive/20 transition-colors touch-manipulation"
        aria-label="Remover item"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// --- Column content (shared between tab and desktop views) ---
interface ColumnProps {
  title: string;
  total: number;
  items: BudgetItem[];
  addLabel: string;
  testIdAdd: string;
  totalColor: string;
  onChange: (id: string, field: keyof BudgetItem, value: string | number) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  emptyMessage: string;
}

function Column({
  title, total, items, addLabel, testIdAdd, totalColor,
  onChange, onDelete, onAdd, emptyMessage,
}: ColumnProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 mb-1">
        <h2 className="text-xl font-serif text-foreground">{title}</h2>
        <span className={`font-mono text-lg font-medium ${totalColor}`}>{formatBRL(total)}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-muted-foreground/50 italic font-serif text-sm py-6 text-center">
            {emptyMessage}
          </p>
        ) : (
          items.map((item) => (
            <BudgetItemRow key={item.id} item={item} onChange={onChange} onDelete={onDelete} />
          ))
        )}
      </div>
      <div className="pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAdd}
          data-testid={testIdAdd}
          className="text-primary hover:text-primary hover:bg-primary/8 active:bg-primary/15 -ml-2 touch-manipulation"
        >
          <Plus size={15} className="mr-1.5" />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function Home() {
  const [budget, setBudget] = useState<Budget>(DEFAULT_BUDGET);
  const [saved, setSaved] = useState(true);
  const [activeTab, setActiveTab] = useState<"income" | "expense">("income");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setBudget(loadBudget());
  }, []);

  useEffect(() => {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveBudget(budget);
      setSaved(true);
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [budget]);

  // Handlers
  const addIncome = () =>
    setBudget((p) => ({ ...p, incomeItems: [...p.incomeItems, { id: generateId(), label: "", amount: 0 }] }));
  const addExpense = () =>
    setBudget((p) => ({ ...p, expenseItems: [...p.expenseItems, { id: generateId(), label: "", amount: 0 }] }));
  const changeIncome = (id: string, field: keyof BudgetItem, value: string | number) =>
    setBudget((p) => ({ ...p, incomeItems: p.incomeItems.map((i) => i.id === id ? { ...i, [field]: value } : i) }));
  const changeExpense = (id: string, field: keyof BudgetItem, value: string | number) =>
    setBudget((p) => ({ ...p, expenseItems: p.expenseItems.map((i) => i.id === id ? { ...i, [field]: value } : i) }));
  const deleteIncome = (id: string) =>
    setBudget((p) => ({ ...p, incomeItems: p.incomeItems.filter((i) => i.id !== id) }));
  const deleteExpense = (id: string) =>
    setBudget((p) => ({ ...p, expenseItems: p.expenseItems.filter((i) => i.id !== id) }));

  // Calculations
  const totalIncome = budget.incomeItems.reduce((s, i) => s + (i.amount || 0), 0);
  const totalExpense = budget.expenseItems.reduce((s, i) => s + (i.amount || 0), 0);
  const remaining = totalIncome - totalExpense;
  const investAmount = remaining > 0 ? (remaining * budget.investSplit) / 100 : 0;
  const savingsAmount = remaining > 0 ? remaining - investAmount : 0;

  const incomeColumnProps: ColumnProps = {
    title: "Receitas", total: totalIncome, items: budget.incomeItems,
    addLabel: "Adicionar Receita", testIdAdd: "button-add-income",
    totalColor: "text-primary", emptyMessage: "Nenhuma receita adicionada.",
    onChange: changeIncome, onDelete: deleteIncome, onAdd: addIncome,
  };
  const expenseColumnProps: ColumnProps = {
    title: "Despesas", total: totalExpense, items: budget.expenseItems,
    addLabel: "Adicionar Despesa", testIdAdd: "button-add-expense",
    totalColor: "text-foreground/70", emptyMessage: "Nenhuma despesa adicionada.",
    onChange: changeExpense, onDelete: deleteExpense, onAdd: addExpense,
  };

  return (
    <div className="h-svh bg-background text-foreground flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 pt-3 pb-2 md:px-10 md:pt-8 md:pb-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif text-primary font-medium tracking-tight leading-none">Fluxo</h1>
          <p className="text-muted-foreground text-sm md:text-base font-serif italic mt-0.5">Clareza financeira mensal.</p>
        </div>
        <div
          data-testid="status-save"
          className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card px-2.5 py-1.5 rounded-full border"
        >
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${saved ? "bg-primary" : "bg-amber-400 animate-pulse"}`} />
          {saved ? "Salvo" : "Salvando..."}
        </div>
      </header>

      {/* ── Mobile tabs ── */}
      <div className="flex-shrink-0 md:hidden flex gap-0 mx-4 rounded-xl bg-muted/50 p-1 border">
        {(["income", "expense"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all touch-manipulation ${
              activeTab === tab
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "income" ? `Receitas · ${formatBRL(totalIncome)}` : `Despesas · ${formatBRL(totalExpense)}`}
          </button>
        ))}
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* Mobile: single active tab */}
        <div className="md:hidden h-full px-4 pt-3 pb-2 overflow-hidden flex flex-col">
          {activeTab === "income"
            ? <Column {...incomeColumnProps} />
            : <Column {...expenseColumnProps} />}
        </div>

        {/* Desktop: two columns side-by-side */}
        <div className="hidden md:grid md:grid-cols-2 h-full divide-x divide-border px-10 gap-0">
          <div className="pr-10 pt-4 pb-2 overflow-y-auto">
            <Column {...incomeColumnProps} />
          </div>
          <div className="pl-10 pt-4 pb-2 overflow-y-auto">
            <Column {...expenseColumnProps} />
          </div>
        </div>
      </div>

      {/* ── Bottom summary ── */}
      <footer className="flex-shrink-0 bg-card border-t shadow-[0_-8px_32px_rgba(0,0,0,0.04)]">
        <div className="px-4 py-2.5 md:px-10 md:py-5 max-w-5xl mx-auto">

          {/* Balance + split labels in one row */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-baseline gap-2">
              <p
                data-testid="text-remaining"
                className={`text-sm font-mono font-medium leading-none ${remaining < 0 ? "text-destructive" : "text-muted-foreground"}`}
              >
                {formatBRL(remaining)}
              </p>
            </div>
            <div className={`flex items-center gap-3 transition-opacity ${remaining <= 0 ? "opacity-30" : "opacity-100"}`}>
              <div className="text-right">
                <span className="text-muted-foreground text-[10px] uppercase tracking-wide">Inv.</span>
                <span data-testid="text-invest-amount" className="font-mono font-medium text-lg ml-1 text-primary">{formatBRL(investAmount)}</span>
                <span className="text-muted-foreground text-xs ml-1">({budget.investSplit}%)</span>
              </div>
              <div className="w-px h-5 bg-border" />
              <div>
                <span className="text-muted-foreground text-[10px] uppercase tracking-wide">Pou.</span>
                <span data-testid="text-savings-amount" className="font-mono font-medium text-lg ml-1">{formatBRL(savingsAmount)}</span>
                <span className="text-muted-foreground text-xs ml-1">({100 - budget.investSplit}%)</span>
              </div>
            </div>
          </div>

          {/* Slider */}
          <div className={`transition-opacity ${remaining <= 0 ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
            <Slider
              value={[budget.investSplit]}
              min={0}
              max={100}
              step={5}
              onValueChange={(v) => setBudget((p) => ({ ...p, investSplit: v[0] }))}
              data-testid="slider-invest-split"
              className="w-full touch-none"
            />
          </div>

        </div>
      </footer>
    </div>
  );
}
