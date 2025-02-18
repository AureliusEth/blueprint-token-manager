import express from 'express';
import { transactionBuilder } from '../../../controllers/action-controller';

const router = express.Router();

router.post('/buildTransaction', async (req, res) => {
    try {
        const { intent, params } = req.body; // Assuming intent and params are sent in the request body

        if (!intent || !params) {
            return res.status(400).json({ error: 'Missing intent or params' });
        }

        const tx = await transactionBuilder(intent, params);
        res.json({ transaction: tx });
    } catch (error) {
        console.error('Error building transaction:', error);
        res.status(500).json({ error: 'Failed to build transaction' });
    }
});

export default router;

