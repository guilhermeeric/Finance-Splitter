import { Router } from "express";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const router = Router();

router.post("/auth/session", async (req, res) => {
  const isNew = !req.session.userId;

  if (isNew) {
    req.session.userId = crypto.randomUUID();
  }

  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  res.json({
    sessionId: req.session.userId,
    isNew,
  });
});

export default router;
