import { DataAPIClient } from "@datastax/astra-db-ts";
import dotenv from "dotenv";
import OpenAi from "openai";

dotenv.config();
const openai = new OpenAi({ apiKey: process.env.OPENAI_API_KEY });
const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN!);
const db = client.db(process.env.ASTRA_DB_API_ENDPOINT, {
    keyspace: process.env.ASTRA_DB_NAMESPACE,
});

export const RagHandler = async (req, res) => {
    // console.log('rag handler triggred' , req.body)
    try {
        // console.log(req)
        const { userMessage } = req.body;
        const embeddings = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: userMessage,
            encoding_format: "float",
        });

        const embedding = embeddings.data[0].embedding;
        const collection = await db.collection(process.env.ASTRA_DB_COLLECTION!);
        const cursor = collection.find(null, {
            sort: {
                $vector: embedding,
            },
            limit: 10,
        });

        const documents = await cursor.toArray();
        const context = documents.map((doc) => doc.text);
        res.json({ context });

    } catch (err) {
        console.error("Context fetch error:", err);
        res.status(500).json({ error: "Failed to fetch vector context" });
    }
}