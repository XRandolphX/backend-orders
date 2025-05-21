import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, order_number, date, total_price, status
      FROM orders
      ORDER BY id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Error fetching orders" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const { order_number, date, status, items } = req.body;
  if (
    !order_number ||
    !date ||
    !status ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    const client = await pool.connect();
  }
  
});

export default router;
