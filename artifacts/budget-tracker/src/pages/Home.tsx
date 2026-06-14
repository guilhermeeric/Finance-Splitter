import { useState, useEffect, useRef, useCallback } from "react";
import {
  useCreateSession,
  useGetBudget,
  useSaveBudget,
  getGetBudgetQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { BudgetItem, Budget } from "@workspace/api-client-react/src/generated/api.schemas";
import { Plus, Trash2, GripVertical, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";

// --- Utilities ---
const formatBRL = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Component: BudgetItemRow ---
interface BudgetItemRowProps {
  item: BudgetItem;
  onChange: (id: string, field: keyof BudgetItem, value: any) => void;
  onDelete: (id: string) => void;
}

function BudgetItemRow({ item, onChange, onDelete }: BudgetItemRowProps) {
  return (
    <div className="group flex items-center gap-3 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing">
        <GripVertical size={16} />
      </div>
      <div className="flex-1">
        <input
          type="text"
          value={item.label}
          onChange={(e) => onChange(item.id, "label", e.target.value)}
          placeholder="Descrição..."
          className="w-full bg-transparent border-b border-transparent focus:border-primary/30 hover:border-border transition-colors outline-none text-foreground placeholder:text-muted-foreground py-1 font-serif text-lg"
        />
      </div>
      <div className="w-32 relative">
        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm pl-2">
          R$
        </span>
        <input
          type="number"
          value={item.amount || ""}
          onChange={(e) => onChange(item.id, "amount", parseFloat(e.target.value) || 0)}
          placeholder="0.00"
          className="w-full bg-card border border-border focus:border-primary rounded-md outline-none text-foreground font-mono text-right pl-8 pr-3 py-1.5 shadow-sm transition-all focus:shadow-md"
        />
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all duration-200 p-2 rounded-full hover:bg-destructive/10 focus:opacity-100"
        aria-label="Remove item"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

// --- Main Page: Home ---
export default function Home() {
  const [sessionReady, setSessionReady] = useState(false);
  const createSession = useCreateSession();
  const queryClient = useQueryClient();

  // Local state for the budget
  const [localBudget, setLocalBudget] = useState<Budget>({
    incomeItems: [],
    expenseItems: [],
    investSplit: 50,
  });

  // Track if we've initialized local state from the server
  const hasInitialized = useRef(false);
  const lastSavedBudget = useRef<Budget | null>(null);

  // --- 1. Session Setup ---
  useEffect(() => {
    createSession.mutate(undefined, {
      onSuccess: () => {
        setSessionReady(true);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 2. Data Fetching ---
  const { data: serverBudget, isLoading: isBudgetLoading } = useGetBudget({
    query: {
      enabled: sessionReady,
      queryKey: getGetBudgetQueryKey(),
    },
  });

  const saveBudgetMutation = useSaveBudget();
  const saveBudgetFn = useRef(saveBudgetMutation.mutate);
  saveBudgetFn.current = saveBudgetMutation.mutate;

  // Sync server data to local state on first load
  useEffect(() => {
    if (serverBudget && !hasInitialized.current) {
      setLocalBudget(serverBudget);
      lastSavedBudget.current = serverBudget;
      hasInitialized.current = true;
    }
  }, [serverBudget]);

  // --- 3. Auto-save (Debounced) ---
  useEffect(() => {
    if (!hasInitialized.current) return;

    const currentStr = JSON.stringify(localBudget);
    const lastSavedStr = JSON.stringify(lastSavedBudget.current);

    if (currentStr !== lastSavedStr) {
      const timer = setTimeout(() => {
        saveBudgetFn.current(
          { data: localBudget },
          {
            onSuccess: (data) => {
              lastSavedBudget.current = data;
              queryClient.setQueryData(getGetBudgetQueryKey(), data);
            },
          }
        );
      }, 1000); // 1s debounce

      return () => clearTimeout(timer);
    }
  }, [localBudget, queryClient]);

  // --- 4. Handlers ---
  const handleAddIncome = () => {
    setLocalBudget((prev) => ({
      ...prev,
      incomeItems: [...prev.incomeItems, { id: generateId(), label: "", amount: 0 }],
    }));
  };

  const handleAddExpense = () => {
    setLocalBudget((prev) => ({
      ...prev,
      expenseItems: [...prev.expenseItems, { id: generateId(), label: "", amount: 0 }],
    }));
  };

  const handleIncomeChange = (id: string, field: keyof BudgetItem, value: any) => {
    setLocalBudget((prev) => ({
      ...prev,
      incomeItems: prev.incomeItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleExpenseChange = (id: string, field: keyof BudgetItem, value: any) => {
    setLocalBudget((prev) => ({
      ...prev,
      expenseItems: prev.expenseItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleIncomeDelete = (id: string) => {
    setLocalBudget((prev) => ({
      ...prev,
      incomeItems: prev.incomeItems.filter((item) => item.id !== id),
    }));
  };

  const handleExpenseDelete = (id: string) => {
    setLocalBudget((prev) => ({
      ...prev,
      expenseItems: prev.expenseItems.filter((item) => item.id !== id),
    }));
  };

  const handleSplitChange = (value: number[]) => {
    setLocalBudget((prev) => ({
      ...prev,
      investSplit: value[0],
    }));
  };

  // --- 5. Calculations ---
  const totalIncome = localBudget.incomeItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  const totalExpense = localBudget.expenseItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  const remaining = totalIncome - totalExpense;
  const investAmount = remaining > 0 ? (remaining * localBudget.investSplit) / 100 : 0;
  const savingsAmount = remaining > 0 ? remaining - investAmount : 0;

  // --- Loading State ---
  if (!sessionReady || (isBudgetLoading && !hasInitialized.current)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Skeleton className="h-12 w-64 rounded-lg bg-primary/10" />
        <Skeleton className="h-8 w-48 rounded-md bg-primary/10" />
        <Skeleton className="h-[400px] w-full max-w-4xl rounded-xl bg-primary/5 mt-8" />
      </div>
    );
  }

  // --- Render ---
  return (
    <div className="min-h-[100dvh] bg-background text-foreground selection:bg-primary/20 flex flex-col">
      {/* Header */}
      <header className="px-6 py-12 md:px-12 lg:px-24 flex items-baseline justify-between max-w-7xl mx-auto w-full">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif text-primary font-medium tracking-tight">Fluxo</h1>
          <p className="text-muted-foreground mt-2 text-lg font-serif italic">Your monthly financial clarity.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card px-3 py-1.5 rounded-full border shadow-sm">
          <div className={`w-2 h-2 rounded-full ${saveBudgetMutation.isPending ? 'bg-accent animate-pulse' : 'bg-primary'}`} />
          {saveBudgetMutation.isPending ? 'Salvando...' : 'Sincronizado'}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto w-full pb-32">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-24 relative">
          
          {/* Income Column */}
          <section className="space-y-6 relative">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-2xl font-serif text-foreground">Receitas</h2>
              <span className="font-mono text-xl text-primary">{formatBRL(totalIncome)}</span>
            </div>
            
            <div className="space-y-1 min-h-[200px]">
              {localBudget.incomeItems.length === 0 ? (
                <div className="text-muted-foreground/60 italic font-serif py-4 text-center">
                  Nenhuma receita adicionada.
                </div>
              ) : (
                localBudget.incomeItems.map((item) => (
                  <BudgetItemRow
                    key={item.id}
                    item={item}
                    onChange={handleIncomeChange}
                    onDelete={handleIncomeDelete}
                  />
                ))
              )}
            </div>

            <Button
              variant="ghost"
              onClick={handleAddIncome}
              className="text-primary hover:text-primary hover:bg-primary/5 -ml-4"
            >
              <Plus size={16} className="mr-2" />
              Adicionar Receita
            </Button>
          </section>

          {/* Divider on desktop */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-border/60 -translate-x-1/2"></div>

          {/* Expense Column */}
          <section className="space-y-6 relative">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-2xl font-serif text-foreground">Despesas</h2>
              <span className="font-mono text-xl text-foreground/80">{formatBRL(totalExpense)}</span>
            </div>
            
            <div className="space-y-1 min-h-[200px]">
              {localBudget.expenseItems.length === 0 ? (
                <div className="text-muted-foreground/60 italic font-serif py-4 text-center">
                  Nenhuma despesa adicionada.
                </div>
              ) : (
                localBudget.expenseItems.map((item) => (
                  <BudgetItemRow
                    key={item.id}
                    item={item}
                    onChange={handleExpenseChange}
                    onDelete={handleExpenseDelete}
                  />
                ))
              )}
            </div>

            <Button
              variant="ghost"
              onClick={handleAddExpense}
              className="text-primary hover:text-primary hover:bg-primary/5 -ml-4"
            >
              <Plus size={16} className="mr-2" />
              Adicionar Despesa
            </Button>
          </section>
        </div>
      </main>

      {/* Bottom Summary & Slider */}
      <footer className="bg-card border-t shadow-[0_-10px_40px_rgba(0,0,0,0.03)] mt-auto sticky bottom-0 z-10">
        <div className="px-6 py-8 md:px-12 lg:px-24 max-w-7xl mx-auto w-full">
          <div className="grid md:grid-cols-3 gap-8 items-end">
            
            <div className="md:col-span-1 space-y-1">
              <p className="text-muted-foreground text-sm uppercase tracking-wider font-semibold">Balanço Final</p>
              <p className={`text-4xl md:text-5xl font-mono font-medium tracking-tight ${remaining < 0 ? 'text-destructive' : 'text-primary'}`}>
                {formatBRL(remaining)}
              </p>
              {remaining < 0 && (
                <p className="text-destructive text-sm mt-2">Você está gastando mais do que ganha.</p>
              )}
            </div>

            <div className={`md:col-span-2 space-y-8 transition-opacity duration-500 ${remaining <= 0 ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex justify-between items-end mb-2 px-1">
                <div className="space-y-1">
                  <p className="text-primary font-medium">Investimentos <span className="text-muted-foreground font-normal ml-1">({localBudget.investSplit}%)</span></p>
                  <p className="text-2xl font-mono">{formatBRL(investAmount)}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-accent font-medium"><span className="text-muted-foreground font-normal mr-1">({100 - localBudget.investSplit}%)</span> Poupança</p>
                  <p className="text-2xl font-mono">{formatBRL(savingsAmount)}</p>
                </div>
              </div>
              
              <Slider
                value={[localBudget.investSplit]}
                min={0}
                max={100}
                step={5}
                onValueChange={handleSplitChange}
                className="w-full"
              />
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
}
