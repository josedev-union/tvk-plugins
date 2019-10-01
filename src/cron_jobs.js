import {job} from 'cron'
import SolicitationRateLimit from './models/solicitation_rate_limit'

console.log("Starting jobs")
job('0 0 4 */3 * *', SolicitationRateLimit.deleteAll).start()