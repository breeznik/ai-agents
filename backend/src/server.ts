import express from 'express';
import dotenv from 'dotenv';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Middleware to parse JSON
app.use('/', () => console.log('you have reached the server')); // Route

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});