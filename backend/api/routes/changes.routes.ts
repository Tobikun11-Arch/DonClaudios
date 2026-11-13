import {Router} from 'express';
import {requireAuth} from '../middleware/auth';
import {changesController} from '../controllers/changes.controller';

const router = Router();

// Cheap fingerprint poll the dashboards use to decide when to refetch.
router.get('/', requireAuth, changesController.getChanges);

export default router;
