import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import productsRoutes from "./routes/products";
import ordersRoutes from "./routes/orders";

dotenv.config();

const app = express();
