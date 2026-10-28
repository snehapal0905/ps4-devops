// Selenium tests for the running app.
//   BASE_URL=http://localhost:8081 npm test      (default: the Docker deployment on :8081)
// Selenium Manager downloads a matching ChromeDriver automatically; Chrome must be installed.
const { test, before, after } = require('node:test')
const assert = require('node:assert')
const { Builder, By, until } = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081'
const PASSWORD = process.env.TJ_DEMO_PASSWORD || 'demo-pass-123'
const WAIT = 15000

let driver

before(async () => {
  const options = new chrome.Options().addArguments('--headless=new', '--window-size=1280,900')
  driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build()
})

after(async () => {
  if (driver) await driver.quit()
})

async function signIn(path, idSelector, id, password) {
  await driver.manage().deleteAllCookies()
  await driver.get(BASE_URL + path)
  const idInput = await driver.wait(until.elementLocated(By.css(idSelector)), WAIT)
  await idInput.sendKeys(id)
  await driver.findElement(By.css('input[type="password"]')).sendKeys(password)
  await driver.findElement(By.css('button[type="submit"]')).click()
}

test('landing page loads with the product name', async () => {
  await driver.get(BASE_URL + '/')
  await driver.wait(until.titleContains('Trust Juggler'), WAIT)
  assert.match(await driver.getTitle(), /Trust Juggler/)
})

test('company login opens the dashboard', async () => {
  await signIn('/company/login', 'input[type="email"]', 'ops@trustjuggler.demo', PASSWORD)
  await driver.wait(until.urlContains('/dashboard'), WAIT)
  assert.ok((await driver.getCurrentUrl()).includes('/dashboard'))
})

// uses an unknown account so repeated runs never trip the 5-failed-logins lockout on the demo user
test('wrong credentials show an error and stay on the login page', async () => {
  await signIn('/company/login', 'input[type="email"]', 'nobody@trustjuggler.demo', 'wrong-password')
  const alert = await driver.wait(until.elementLocated(By.css('[role="alert"]')), WAIT)
  assert.ok((await alert.getText()).length > 0)
  assert.ok((await driver.getCurrentUrl()).includes('/company/login'))
})

test('rider login leaves the login page', async () => {
  await signIn('/rider/login', 'input[type="tel"]', '9000000001', PASSWORD)
  await driver.wait(async () => !(await driver.getCurrentUrl()).includes('/login'), WAIT)
  assert.ok(!(await driver.getCurrentUrl()).includes('/login'))
})
