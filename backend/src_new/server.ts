import express from 'express';
import dotenv from 'dotenv';



dotenv.config();
const port = process.env.PORT || 5000;

const app = express();
app.use(express.json());
app.use("/api/sse", (req, res) => { console.log('request one sse') })
app.use("/api/client", (req, res) => {
    console.log('request on sdk client')
})


app.listen(3000, () => {
    console.log(`server started on port`, 3000)
})