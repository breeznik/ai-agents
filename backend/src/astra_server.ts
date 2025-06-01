// server.js
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/proxy', async (req, res) => {
  const response = await fetch(process.env.ASTRA_DB_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'X-Cassandra-Token': 'YOUR_TOKEN',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req.body),
  });

  const data = await response.json();
  res.json(data);
});

app.listen(4000, () => console.log('Proxy running on port 4000'));
