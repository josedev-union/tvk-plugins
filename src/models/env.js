export let name = process.env.NODE_ENV
export let isProduction = () => name === 'production'
export let isStaging = () => name === 'staging'
export let isTest = () => name === 'test'
export let isDevelopment = () => name === 'development'
export let isLocal = () => isTest() || isDevelopment()
