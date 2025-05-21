import { Router } from "express";
import pool from "../db";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id ASC");
  } catch (error) {
    console.error("Error fetching products", error);
    res.status(500).json({ message: "Error fetching products" });
  }
});

export default router;
