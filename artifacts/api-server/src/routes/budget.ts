import { Router } from "express";
import { db, budgetsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetBudgetResponse, SaveBudgetBody } from "@workspace/api-zod";

const router = Router();

const DEFAULT_BUDGET = {
  incomeItems: [] as { id: string; label: string; amount: number }[],
  expenseItems: [] as { id: string; label: string; amount: number }[],
  investSplit: 50,
};

router.get("/budget", async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    res.status(401).json({ error: "No session" });
    return;
  }

  const rows = await db
    .select()
    .from(budgetsTable)
    .where(eq(budgetsTable.sessionId, userId))
    .limit(1);

  if (rows.length === 0) {
    const result = GetBudgetResponse.parse({
      ...DEFAULT_BUDGET,
    });
    res.json(result);
    return;
  }

  const row = rows[0];
  const result = GetBudgetResponse.parse({
    incomeItems: row.incomeItems ?? [],
    expenseItems: row.expenseItems ?? [],
    investSplit: Number(row.investSplit),
  });

  res.json(result);
});

router.put("/budget", async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    res.status(401).json({ error: "No session" });
    return;
  }

  const parsed = SaveBudgetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid budget data" });
    return;
  }

  const { incomeItems, expenseItems, investSplit } = parsed.data;

  await db
    .insert(budgetsTable)
    .values({
      sessionId: userId,
      incomeItems,
      expenseItems,
      investSplit: String(investSplit),
    })
    .onConflictDoUpdate({
      target: budgetsTable.sessionId,
      set: {
        incomeItems,
        expenseItems,
        investSplit: String(investSplit),
        updatedAt: new Date(),
      },
    });

  const result = GetBudgetResponse.parse({
    incomeItems,
    expenseItems,
    investSplit,
  });

  res.json(result);
});

export default router;
