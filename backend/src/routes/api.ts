import { Router } from 'express';
import { getDashboardData, createKpi, createTransaction, updateTransactionStatus } from '../controllers/api.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);

router.get('/dashboard', getDashboardData);
router.post('/kpi', createKpi);
router.post('/transactions', createTransaction);
router.put('/transactions/:id/status', updateTransactionStatus);

export default router;