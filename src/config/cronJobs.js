import {job} from 'cron'
import {SolicitationRateLimit} from '../models/database/SolicitationRateLimit'
import {logger} from '../instrumentation/logger'

logger.info('Starting jobs')
job('0 0 4 */3 * *', SolicitationRateLimit.deleteAll).start()