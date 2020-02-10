import {job} from 'cron'
import SolicitationRateLimit from './models/solicitation_rate_limit'
import logger from './models/logger'

logger.info('Starting jobs')
job('0 0 4 */3 * *', SolicitationRateLimit.deleteAll).start()
