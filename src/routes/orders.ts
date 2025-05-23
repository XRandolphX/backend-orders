import { Router, Request, Response, RequestHandler } from "express";
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

router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
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

    const existing = await client.query(`SELECT id FROM orders WHERE id = $1`, [
      id,
    ]);
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ message: "Order not found" });
      return;
    }

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

    await client.query(
      `UPDATE orders SET order_number = $1, date = $2, total_price = $3, status = $4 WHERE id = $5`,
      [order_number, date, total_price, status, id]
    );

    await client.query(`DELETE FROM order_items WHERE order_id = $1`, [id]);

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [id, item.product_id, item.quantity]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Order updated", order_id: id });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Error updating order" });
  } finally {
    client.release();
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Obtener la orden principal
    const orderResult = await pool.query(
      `SELECT id, order_number, date, total_price, status FROM orders WHERE id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    const order = orderResult.rows[0];

    const itemsResult = await pool.query(
      `SELECT oi.product_id, p.name, p.unit_price, oi.quantity
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    order.items = itemsResult.rows;

    res.json(order);
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ message: "Error fetching order details" });
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

router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verificar si existe la orden
    const result = await client.query(`SELECT id FROM orders WHERE id = $1`, [
      id,
    ]);
    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ message: "Order not found" });
      return;
    }

    // Primero eliminar los productos asociados
    await client.query(`DELETE FROM order_items WHERE order_id = $1`, [id]);

    // Luego eliminar la orden
    await client.query(`DELETE FROM orders WHERE id = $1`, [id]);

    await client.query("COMMIT");
    res.json({ message: "Order deleted", order_id: id });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting order:", error);
    res.status(500).json({ message: "Error deleting order" });
  } finally {
    client.release();
  }
});

export default router;
