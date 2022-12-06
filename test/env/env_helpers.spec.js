import fs from 'fs'
import path from 'path'
import {parseGoogleProjects} from '../../src/config/envHelpers'

describe('parseGoogleProjects', () => {
  const credentialPathRelative = 'test/fixtures/fake-google-key.json'
  const credentialPathAbsolute = path.resolve(credentialPathRelative)
  const credentialJson = JSON.parse(fs.readFileSync(credentialPathAbsolute))

  test('each project has a project key and google project id', () => {
    const configStr = 'default;dentrino-test|b-dentrino;b-dentrino-test'
    const parsed = parseGoogleProjects(configStr)
    expect(parsed).toEqual({
      'default' : {
        projectKey: 'default',
        projectId: 'dentrino-test',
      },
      'b-dentrino' : {
        projectKey: 'b-dentrino',
        projectId: 'b-dentrino-test',
      },
    })
  })

  test('projects can have credentials', () => {
    const configStr = `default;dentrino-test|b-dentrino;b-dentrino-test;${credentialPathRelative}`
    const parsed = parseGoogleProjects(configStr)
    expect(parsed).toEqual({
      'default' : {
        projectKey: 'default',
        projectId: 'dentrino-test',
      },
      'b-dentrino' : {
        projectKey: 'b-dentrino',
        projectId: 'b-dentrino-test',
        credentialPath: credentialPathAbsolute,
        credentialCfg: credentialJson,
      },
    })
  })
})
