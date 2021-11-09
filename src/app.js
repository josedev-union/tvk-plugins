import createError from 'http-errors'
import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import compression from 'compression'
import helmet from 'helmet'
import {env} from './config/env'

const app = express()

import indexRouter from './routes/index'
import instantSimulations from './routes/instant_simulations'
import apiSmileTasks from './routes/api/smile_tasks'
import apiQuickSimulations from './routes/api/quick_simulations'
import internalApiSmileTasks from './routes/internal_api/smile_tasks'
import webhooksSmileTasks from './routes/webhooks/smile_tasks'
import {helpers} from './routes/helpers'
import './config/config'
import {getModel} from './middlewares/getModel'
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

app.disable('trust proxy')

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(Sentry.Handlers.requestHandler());
app.use(morgan(':date[iso] :method :url HTTP/:http-version" :status :res[content-length] [:remote-addr - :remote-user]'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(compression());
app.use(helmet());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/', indexRouter);
app.use('/web/instant-simulations', instantSimulations);
app.use('/api/users/:userId/smile-tasks/', getModel.user, apiSmileTasks);
app.use('/api/quick-simulations/', apiQuickSimulations);
app.use('/api/67a4abe/smile-tasks/:smileTaskId/', getModel.smileTask, internalApiSmileTasks);
app.use('/webhooks/828ffbc/smile-tasks/', webhooksSmileTasks);

app.use(Sentry.Handlers.errorHandler());

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  const message = err.message || err.error || `Unexpected Error: ${JSON.stringify(err)}`
  const statusCode = err.status || 500
  res.locals.message = message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  return helpers.respondError(res, statusCode, message)
});

export default app
