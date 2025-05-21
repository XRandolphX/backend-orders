import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching products", error);
    res.status(500).json({ message: "Error fetching products" });
  }
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { name, unit_price } = req.body;

  if (!name || !unit_price) {
    res.status(400).json({ message: "name and unit_price are required" });
    return;
  }

  try {
    const result = await pool.query(
      "INSERT INTO products (name, unit_price) VALUES ($1, $2) RETURNING *",
      [name, unit_price]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding products", error);
    res.status(500).json({ message: "Error adding products" });
  }
});

export default router;
