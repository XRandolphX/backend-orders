import {
  Router,
  Request,
  Response,
  RequestHandler,
  NextFunction,
} from "express";
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
    res.status(400).json({ message: "Invalid order data" });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productIds = items.map((item: any) => item.product_id);
    const placeholders = productIds.map((_, i) => `$${i + 1}`).join(", ");
    const productQuery = await client.query(
      `SELECT id, unit_price FROM products WHERE id IN (${placeholders})`,
      productIds
    );

    const priceMap: Record<number, number> = {};
    for (const row of productQuery.rows) {
      priceMap[row.id] = parseFloat(row.unit_price);
    }

    const total_price = items.reduce((acc: number, item: any) => {
      const price = priceMap[item.product_id] || 0;
      return acc + price * item.quantity;
    }, 0);

    const orderResult = await client.query(
      `INSERT INTO orders (order_number, date, total_price, status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [order_number, date, total_price, status]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [orderId, item.product_id, item.quantity]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Order created", order_id: orderId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Error creating order" });
  } finally {
    client.release();
  }
});

export default router;
