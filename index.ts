import express, { Request, Response } from 'express';
import intentRoutes from './api/external/routes/intentRoutes';
import { createToken } from './helpers/action-helper'; // Import createToken if needed

const app = express();
const port = 3000; // Or your desired port

// Middleware to parse JSON request bodies
app.use(express.json());

// Mount the routes
app.use('/api', intentRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});


