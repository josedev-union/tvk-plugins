import express from 'express';
const router = express.Router();

router.get('/', async (req, res) => {
  res.status(404).send('Not Found')
})

router.get('/d25e4af/error', async (req, res) => {
  throw "Fake Error"
})

export default router
