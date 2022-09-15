import createError from 'http-errors'
import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import helmet from 'helmet'
import buildStaticify from 'staticify'
import Handlebars from 'hbs'
const app = express()

import indexRouter from './routes/index'
import instantSimulations from './routes/instant_simulations'
import apiSmileTasks from './routes/api/smile_tasks'
import apiQuickSimulations from './routes/api/quick_simulations'
import internalApiSmileTasks from './routes/internal_api/smile_tasks'
import webhooksSmileTasks from './routes/webhooks/smile_tasks'
import {logger} from './instrumentation/logger'
import {env} from './config/env'
import {helpers} from './routes/helpers'
import './config/config'
import {getModel} from './middlewares/getModel'
import {morganLogger} from './middlewares/morganLogger'
import {api} from './middlewares/api'
import {RichError} from './utils/RichError'
import * as Sentry from '@sentry/node'
import * as Tracing from '@sentry/tracing'

if (env.isNonLocal()) {
  Sentry.init({
    dsn: env.sentryDsn,
    env: env.name,
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Tracing.Integrations.Express({
        // to trace all requests to the default router
        app,
        // alternatively, you can specify the routes you want to trace:
        // router: someRouter,
      }),
    ],
  });
}

app.enable('trust proxy')

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(function(req, res, next) {
  if (env.disableXForwardedForCheck || env.isLocal()) return next();
  const xForwardedFor = req.header('x-forwarded-for') || ''
  const ipsCountOnHeader = xForwardedFor.split(',').length
  if (ipsCountOnHeader !== 2) {
    const err = new RichError({
      httpCode: 400,
      publicId: 'bad-request',
      publicMessage: 'Bad Request',
      debugId: 'bad-x-forwarded-for',
      debugMessage: `X-Forwarded-For has suspecious value.`,
      logLevel: 'debug',
    })
    return next(err)
  } else {
    return next()
  }
});
app.use(Sentry.Handlers.requestHandler());
app.use(morganLogger);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(compression());
app.use(helmet());
app.use(cookieParser());

if (env.instSimRouter) {
  const publicDirPath = path.join(__dirname, '../public')
  const staticify = buildStaticify(publicDirPath)
  Handlebars.registerHelper('getVersionedPath', staticify.getVersionedPath)
  app.use(staticify.middleware)
  //app.use('/', express.static(publicDirPath));
  app.use(redirectWwwToNonWww)
  app.use('/', instantSimulations.router, Sentry.Handlers.errorHandler(), instantSimulations.errorHandler);
} else {
  app.use('/', indexRouter);
  app.use('/api/users/:userId/smile-tasks/', getModel.user, apiSmileTasks);
  app.use('/public-api/simulations/', apiQuickSimulations({clientIsFrontend: true}));
  app.use('/api/simulations/', apiQuickSimulations({clientIsFrontend: false}));
  app.use('/api/67a4abe/smile-tasks/:smileTaskId/', getModel.smileTask, internalApiSmileTasks);
  app.use('/webhooks/828ffbc/smile-tasks/', webhooksSmileTasks);
  app.use(Sentry.Handlers.errorHandler());
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = api.newNotFoundError()
  return next(err)
});

app.use(api.convertToRichError);

// error handler
app.use(function(err, req, res, next) {
  let statusCode = 500
  let data = null
  if (err instanceof RichError) {
    const errLogLevel = err.logLevel
    if (errLogLevel) {
      logger[errLogLevel](err.logText())
    }
    statusCode = err.httpCode
    data = err.data({isDebug: !env.isProduction()});
  } else {
    const message = err.message || err.error || `Unexpected Error: ${JSON.stringify(err)}`
    statusCode = err.status || 500
    logger.error(err)
    data = message
  }

  if (res.locals.dentCorsOnError) {
    helpers.setAllowingCors(req, res)
  }
  return res.status(statusCode).json({success: false, error: data});
});

function redirectWwwToNonWww(req, res, next) {
  const host = req.header('host') || ''
  if (host.match(/^www\..*/i)) {
    const nonWwwHost = host.replace(/^www\./i, '')
    const protocol = req.protocol
    const hostAndPath = path.join(nonWwwHost + req.url)
    return res.redirect(301, `${protocol}://${hostAndPath}`)
  } else {
    return next()
  }
}

export default app
