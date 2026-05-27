import { Router } from 'express';
import { getDashboardData, createKpi, createTransaction, updateTransactionStatus } from '../controllers/api.js';

const router = Router();

router.get('/dashboard', getDashboardData);
router.post('/kpi', createKpi);
router.post('/transactions', createTransaction);
router.put('/transactions/:id/status', updateTransactionStatus);

export default router;