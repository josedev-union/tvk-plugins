import express from 'express';
const router = express.Router();
import {DentistAccessPoint} from '../models/database/DentistAccessPoint'
import {i18n} from '../shared/i18n'
import {helpers} from './helpers'

router.get('/preview', async (req, res) => {
  const access = (await DentistAccessPoint.allForHost(req.get('Host')))[0]
  if (!access) {
    return res.status(403).send('Not allowed')
  }
  res.render('index', {secret: access.secret, i18n: i18n})
})

router.get('/:slug', async (req, res) => {
  const slug = req.params.slug
  const referer = helpers.normalizeParamValue(req.get('Referer') || req.get('Origin'))
  const access = await DentistAccessPoint.findOneBySlug(slug)
  if (!access) {
    return res.status(404).send('Page Not Found')
  }
  if (helpers.isSet(referer) && !access.checkHost(referer)) {
    return res.status(403).send('Unauthorized Usage')
  }
  if (access.isDisabled()) {
    return res.render('coming_soon')
  }
  res.render('index', {secret: access.secret, i18n: i18n})
})

export default router
