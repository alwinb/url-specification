"use strict"
const { parseResolveAndNormalise, print, test:runTest } = require ('../miniurl')
const Tests = require ('./test-runner')
const log = console.log.bind (console)

// Test 
// ----

const testData = require ('../test/data/urltestdata.json') .map (test => {
    if (typeof test !== 'object') return test
    const { input, base, href, failure } = test
    return { input, base, href, failure }
  }
)

class WebTests extends Tests {
  compactInput (input) { return 'href:   '+input.href }
  compactOutput (output) { return output.href }
}

const testSet = new WebTests (testData, runTest)
  .filter (input => input && typeof input === 'object')

  .assert ('equal failure', (input, output, error) =>
    !!input.failure === !!error )

  .assert ('equal href', (input, output, error) => {
    return input.failure || input.href === output.href
  })


// TODO validate 'dirs' to be iterable
// And.. also make a defensive copy?
// var r = new Url ('file:///foo').set ({ dirs:1 })
// log (r)

module.exports = testSet
testSet.run()