import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import contextRoute from "./router/route";

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

app.use("/api/context", contextRoute);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
