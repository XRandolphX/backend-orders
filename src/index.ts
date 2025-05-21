import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import productsRoutes from "./routes/products";
import ordersRoutes from "./routes/orders";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);

app.get("/", (_req, res) => {
  res.send("API is running");
});

app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});
