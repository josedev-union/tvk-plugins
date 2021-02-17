import createError from 'http-errors'
import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import compression from 'compression'
import helmet from 'helmet'

const app = express()

import indexRouter from './routes/index'
import apiSmileTasks from './routes/api/smile_tasks'
import webhooksSmileTasks from './routes/webhooks/smile_tasks'
import './config/config'
import {getModel} from './middlewares/getModel'
import * as Sentry from '@sentry/node'

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
app.use('/api/users/:userId/smile-tasks/', getModel.user, apiSmileTasks);
app.use('/webhooks/828ffbc/smile-tasks/', webhooksSmileTasks);

app.use(Sentry.Handlers.errorHandler());

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

export default app
