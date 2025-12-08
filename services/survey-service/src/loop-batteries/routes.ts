import { Router } from 'express';
import { requireSurveyBuilder } from '../middleware/auth';
import {
  createLoopBattery,
  getLoopBatteries,
  getLoopBattery,
  updateLoopBattery,
  deleteLoopBattery,
  createDatasetItem,
  updateDatasetItem,
  deleteDatasetItem,
  getDatasetItems
} from './index';

const router = Router();

// All routes require Survey Builder access
router.use(requireSurveyBuilder('VIEWER'));

// Loop Battery routes
router.post('/:surveyId/loop-batteries', requireSurveyBuilder('EDITOR'), createLoopBattery);
router.get('/:surveyId/loop-batteries', getLoopBatteries);
router.get('/:surveyId/loop-batteries/:batteryId', getLoopBattery);
router.put('/:surveyId/loop-batteries/:batteryId', requireSurveyBuilder('EDITOR'), updateLoopBattery);
router.delete('/:surveyId/loop-batteries/:batteryId', requireSurveyBuilder('MANAGER'), deleteLoopBattery);

// Dataset Items routes
router.post('/:surveyId/loop-batteries/:batteryId/dataset-items', requireSurveyBuilder('EDITOR'), createDatasetItem);
router.get('/:surveyId/loop-batteries/:batteryId/dataset-items', getDatasetItems);
router.put('/:surveyId/loop-batteries/:batteryId/dataset-items/:itemId', requireSurveyBuilder('EDITOR'), updateDatasetItem);
router.delete('/:surveyId/loop-batteries/:batteryId/dataset-items/:itemId', requireSurveyBuilder('EDITOR'), deleteDatasetItem);

export default router;
