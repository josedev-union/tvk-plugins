import { Factory } from 'rosie'
import Database from '../../src/models/database'

import app from '../../src/app'
app.enable('trust proxy')
import supertest from 'supertest'
const request = supertest(app)

test(`renders the form if the slug exist and referer is valid`, async () => {
  await Database.instance.drop()
  const access = Factory.build('dentist_access_point', {directPage: {slug: 'my-host', disabled: false}})
  access.addHost('http://myhost.com:8080/')
  await access.save()

  const response = await request
  .get('/d/my-host')
  .set('Referer', 'http://myhost.com:8080/a/random/path')
  .send()

  expect(response.status).toBe(200)
  expect(response.text).toMatch(/.*<form.*/)
})

test(`renders the form if the slug exist and has no referer`, async () => {
  await Database.instance.drop()
  const access = Factory.build('dentist_access_point', {directPage: {slug: 'my-host', disabled: false}})
  access.addHost('http://myhost.com:8080/')
  await access.save()

  const response = await request
  .get('/d/my-host')
  .send()

  expect(response.status).toBe(200)
  expect(response.text).toMatch(/<form/)
})

test(`respond 404 if the slug isn't found`, async () => {
  await Database.instance.drop()
  const access = Factory.build('dentist_access_point', {directPage: {slug: 'myhost', disabled: false}})
  access.addHost('http://myhost.com:8080/')
  await access.save()

  const response = await request
  .get('/d/my-host')
  .set('Referer', 'http://myhost.com:8080/a/random/path')
  .send()

  expect(response.status).toBe(404)
})

test(`respond 404 if the host isn't valid`, async () => {
  await Database.instance.drop()
  const access = Factory.build('dentist_access_point', {directPage: {slug: 'my-host', disabled: false}})
  access.addHost('http://myhost.com:8080/')
  await access.save()

  const response = await request
  .get('/d/my-host')
  .set('Referer', 'http://myhost2.com:8080/a/random/path')
  .send()

  expect(response.status).toBe(404)
})

test(`render a coming soon page if the access point is disabled`, async () => {
  await Database.instance.drop()
  const access = Factory.build('dentist_access_point', {directPage: {slug: 'my-host', disabled: true}})
  access.addHost('http://myhost.com:8080/')
  await access.save()

  const response = await request
  .get('/d/my-host')
  .set('Referer', 'http://myhost.com:8080/a/random/path')
  .send()

  expect(response.status).toBe(200)
  expect(response.text).toMatch(/coming.*soon/i)
})
