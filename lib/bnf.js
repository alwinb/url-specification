((window => {

// Quick, a BNF parser for my preferred BNF notation,
// both plain text, and pretty printed html.

// ... that has turned into something a bit more like
// a pretty printer / markdown format for math like things by now.

// I should do this properly one day; difficulty is that I'm dealing
// with two conflicting use cases; one being actually parsing the 
// term structure; for which a nice HOOP parser will do great.

// The other thing, is to allow a great deal of freedom
// in whitespace and formatting that nonetheless will be detected and
// turned into nicely aligned html output. Oh well :)

const version = '0.1.2-a'
const log = console.log.bind (console)

// A regex-based parser
// Regular expressons as states, captures are tokens
// The parser changes the state based on each read token.

const rx = (...args) =>
  new RegExp (String.raw (...args) .replace (/\s/g, ''), 'y')

// readToken: state must be a RegExp with the y flag set and
// with an added property .captures, which must be an array
// with a names for the capture groups.

function readToken (state, input, pos) {
  state.lastIndex = pos
  const match = state.exec (input)
  if (!match) return null
  let capture_index = 1
  while (match[capture_index] == null) capture_index++
  const type = state.captures[capture_index-1]
  return [type, input.substring (pos, state.lastIndex)]
}

const BeforeDecl = rx
  ` ([a-zA-Z][a-zA-Z0-9_-]*)
  | (--[^\n]*\n)
  | ([\x20\t]*\n)
  | ([\x20\t]+)`

BeforeDecl.name = 'BeforeDecl'
BeforeDecl.captures = [
  'ident',
  'comment',
  'blank',
  'wsp'
]

const AfterAfterNl = rx
  ` ([|+*∪∩\\])
  | (\[|\()
  | (\{)
  | (\)|\])
  | ([a-zA-Z][a-zA-Z0-9_-]*)
  | (--[^\n]*\n)
  | ([\x20\t]*\n)
  | ([\x20\t]+)`

AfterAfterNl.name = 'AfterAfterNl'
AfterAfterNl.captures = [
  'op',
  'open',
  'open-set',
  'close',
  'ident',
  'comment',
  'blank',
  'wsp'
]

const AfterDeclName = 
  /(::=|:=|=|⟼|::)|([\t ]+)|(\n)/y

AfterDeclName.name = 'AfterDeclName'
AfterDeclName.captures = [
  'def', 'wsp', 'nl'
]

const Before = rx
  ` (CR|LF|HT|SP|DEL)
  | (ε)
  | ([a-zA-Z][a-zA-Z0-9_-]*)
  | (\`[\x20-_a-~]+\`)
  | ('[\x20-&(-~]+')
  | ("[\x20!#-~]+")
  | ([uU][+][0-9a-fA-F]+\b)
  | ([%][0-9a-fA-F]{2}\b)
  | ([|+*∪∩])
  | (\[|\()
  | (\{)
  | (--[^\n]*\n)
  | (\n)
  | ([\x20\t]+)`

Before.name = 'Before'
Before.captures = [
  'const',
  'epsilon',
  'ref',
  'string',
  'string',
  'string',
  'cp',
  'byte',
  'op',
  'open',
  'open-expr',
  'comment',
  'nl-before',
  'wsp',
]

const After = rx
  ` ([|+*\\∪∩])
  | (\[|\()
  | (\)|\])
  | ([\x20\t]+)(?=[^\\\]\)\r\n])
  | (--[^\n]*\n)
  | ([\x20\t]+)
  | (\n)`

After.name = 'After'
After.captures = [
  'op', // NB includes set operations for now
  'open',
  'close',
  'cat',
  'comment',
  'wsp',
  'nl'
]

// WIP charset notation

const InSetMain = rx
  `(\s+)
  | (in\b|and\b|or\b|not\b|mod\b|<|≤|=|≥|>|[+*\^])
  | ([uU][+][0-9a-fA-F]+\b)
  | (\`[\x20-~\(\)]\`|'[\x20-~\(\)]')
  | ([0](?!\s*[-–])|[1-9][0-9]*(?!\s*[-–]))
  | ([a-zA-Z0-9]\b(?=\s*\|))
  | ([a-zA-Z0-9]\b(?=\s*[-–]))
  | ([a-zA-Z][a-zA-Z0-9_-]*)
  | ([%][0-9a-fA-F]{2}\b)
  | ([,])
  | ([|])
  | ([(])
  | ([)])
  | ([}])
  `

InSetMain.name = 'InSetMain'

InSetMain.captures = [
  'wsp',
  'op',
  'set-cp',
  'set-char',
  'set-decimal',
  'bind',
  'set-char-unquoted',
  'inset-ref',
  'set-byte',
  'comma',
  'set-bar',
  'open-expr',
  'close-expr',
  'close-set',
]

const InSetRange = rx
  `(\s+)
  | ([uU][+][0-9a-fA-F]+\b)
  | (\`[\x20-~\(\)]\`|'[\x20-~\(\)]')
  | ([a-zA-Z0-9]\b)
  `

InSetRange.name = 'InSetRange'
InSetRange.captures = [
  'wsp',
  'set-cp',
  'set-char',
  'set-char-unquoted',
]

const InSetAfterSingle = rx
  ` ([-])
  | (\s+)
  | (in\b|and\b|or\b|not\b|mod\b|<|≤|>|≥|[+\^])
  | ([uU][+][0-9a-fA-F]+\b)
  | (\`[\x20-~\(\)]\`|'[\x20-~\(\)]')
  | ([0](?!\s*-)|[1-9][0-9]*(?!\s*-))
  | ([a-zA-Z0-9]\b(?=\s*|))
  | ([a-zA-Z0-9]\b)
  | ([a-zA-Z][a-zA-Z0-9_-]*)
  | ([%][0-9a-fA-F]{2}\b)
  | ([,])
  | ([|])
  | ([(])
  | ([)])
  | ([}])
  `
InSetAfterSingle.name = 'InSetAfterSingle'
InSetAfterSingle.captures = [
  'range',
  'wsp',
  'op',
  'set-cp',
  'set-char',
  'set-decimal',
  'inset-ref',
  'set-char-unquoted',
  'inset-ref',
  'set-byte',
  'comma',
  'set-bar',
  'open-expr',
  'close-expr',
  'close-set',
]

// const inSetAfter =
//   /[,]|[}]|(\s+)|/


const mirror = {
  '(': ')',
  '[': ']',
  '{': '}',
  '|': '|',
  ')': '(',
  ']': '[',
  '}': '{',
}


function parse (input) {
  let state = BeforeDecl
  let pos = 0
  let match
  let nesting = []
  let lastnl = 0

  // Remember the column before the prevous :=
  // This allows continuing a rule on the next line,
  // as long as it is indented beyond the := above

  let def_column = input.length

  const index = Object.create (null)
  const rules = [] // Rules and blank lines between them

  let defName = null
  let defType = null
  let rule = []
  let charset = []

  const endRule = () => {
    if (defName) {
      index [defName] = rule
      rules.push ({ defName, defType, rule })
      def_column = input.length
      rule = []
      defName = null
    }
  }

  while (1) {
    // log (state.name)
    if ((match = readToken (state, input, pos)) == null) break
    // log (match)

    const [type, value] = match
    pos += value.length

    switch (type) {
  
      case 'wsp':
        continue
  
        case 'ident':
        if (pos - lastnl - value.length > def_column) {
          // Indented beyond the previous := 
          // log (' this is an indented def, and so it is a ref instead', value)
          state = After
          rule.push (match)
          continue
        }
        else {
          endRule ()
          rule = []
          defName = match[1]
          state = AfterDeclName
          continue
        }

    case 'def':
      state = Before
      defType = match[1]
      def_column = pos - lastnl - value.length
      continue

    case 'ref': case 'cp': case 'byte': case 'const': case 'epsilon':
      state = After
      break

    case 'string':
      match[1] = value.substring (1, value.length-1)
      state = After
      break

    case 'inset-ref':
    case 'bind':
      state = InSetAfterSingle
    break
    
    case 'op':
      state = value === '*' ? After
        : value === '+'   ? state === InSetMain || state === InSetAfterSingle ? InSetMain : After
        : value === '<'   ? state === InSetMain || state === InSetAfterSingle ? InSetMain : After
        : value === '≤'   ? state === InSetMain || state === InSetAfterSingle ? InSetMain : After
        : value === 'mod' ? InSetMain
        : value === '^'   ? InSetMain
        : value === '|'   ? Before
        : value === '\\'  ? Before    // NB set minus mixed with BNF ops
        : value === '∪'   ? Before    // NB set minus mixed with BNF ops
        : value === '∩'   ? Before    // NB set minus mixed with BNF ops
        : value === 'in'  ? InSetMain // NB set minus mixed with BNF ops
        : value === 'and' ? InSetMain // NB set minus mixed with BNF ops
        : (_ => {throw new Error (value)})()
      break

    case 'cat':
      state = Before
      break

    case 'open-expr':
      nesting.push ([value, InSetMain])
      state = InSetMain
      break

    case 'open':
      nesting.push ([value, After])
      state = Before
      break

    case 'open-set':
      charset = []
      state = InSetMain
      break

    case 'set-cp':
    case 'set-char-unquoted':
      charset.push (value)
      state = InSetAfterSingle
      break

    case 'set-decimal':
      match[1] = value
      charset.push (value)
      state = InSetAfterSingle
      break

    case 'set-char':
      match[1] = value.substring (1, value.length-1)
      charset.push (value)
      state = InSetMain
      break

    case 'range':
      // TODO don't allow chained ranges
      state = InSetRange
    break

    case 'comma':
    case 'set-bar':
      state = InSetMain
    break

    case 'close-set':
      // match = ['charset', charset]
      state = After
    break

    case 'close-expr':
    case 'close':
      if (!nesting.length || nesting[nesting.length-1][0] !== mirror [value]) {
        throw new SyntaxError ('Mismatched pairs: In state: '+state.name + ' ' + nesting[nesting.length-1] + ' … ' + value)
      }
      else {
        const ctx = nesting.pop ()
        state = ctx[1]
        break
      }

    case 'nl':
      lastnl = pos
      state = AfterAfterNl
      break

    case 'nl-before':
      lastnl = pos
      state = Before
      break

    case 'comment':
      match[1] = value.substring (2, value.length-1)
      lastnl = pos
      // comments that take a full line are handled differently
      if (state === BeforeDecl || state === AfterAfterNl) {
        endRule ()
        rules.push (match)
        state = AfterAfterNl
        continue
      }
      state = AfterAfterNl
      break

    case 'blank': 
      if (rules.length) {
        lastnl = pos
        endRule ()
        rules.push (match)
        state = BeforeDecl
        continue
      }
      else break

    default:
      throw new SyntaxError ('Unhandled token type ' + type)
    }
    
    rule.push (match)
  }
  // function end () { ... }
  if (pos !== input.length) {
    // log (rules, rule)
    throw new SyntaxError ('In state '+state.name+'; before: '+ input.substr (pos, 80)+' … ')
  }
  
  endRule ()
  return { rules, index }
}
  
  

// Pretty print HTML
// -----------------

function h (tag,...subs) {
  tag = tag.split ('.')
  const el = document.createElement (tag.shift ())
  el.classList.add (...tag)
  el.append (...subs)
  return el
}

function render ({ rules, index }) {
  let tbody
  const table = h('table', tbody = h('tbody'))

  for (const defLine of rules) {
    // log (defLine)
    
    // The rules-array may also contain blank lines.
    // This is on purpose, I want to preserve them in the output.

    if (defLine[0] === 'blank' || defLine[1] === '\n') {
      tbody.append (h('tr', h('td', ' ')))
      continue
    }

    else if (defLine[0] === 'comment') {
      let tr, td;
      tbody.append (tr = h('tr', td = h('td', defLine[1])))
      td.setAttribute ('colspan', 3)
      tr.classList.add ('inbetween')
      // TODO use something more like my markdown like
      // language; or for this special case: collect whitespace around
      // comment lines and inly if present, set the inbetween class
      continue
    }

    let tr = h('tr',
      h('td', h('dfn', ...markCaps(defLine.defName))),
      h('td', defLine.defType),
      h('td')
    )
    tbody.append (tr)

    // If the last token was a newline or line comment, then we create a
    // new row in the table, to allow aligning operators more nicely.

    let last = ['dummy', ''];
    for (const tok of defLine.rule) {

      if (last[1] === '\n' || last[0] === 'comment') {
        tr = h('tr', h('td', ' '), h('td', ' '), h('td'))
        tbody.append (tr)

        // Special case -- If the first operator on a new line is a `|` then
        // align it with the definition marker `:=` or alike above it.

        if (tok[0] === 'op' && tok[1] === '|') {
          tr.children[1].textContent = ''
          tr.children[1].append (renderToken (tok))
          last = tok
          continue
        }

      }

      // By default, add the token to the third cell

      tr.children[2].append (renderToken (tok))
      last = tok

    }
  }
  return table 
}



// TODO tokenise idents and refs and wrap strides of caps in a span.caps elem
// Just to make it all look a bit nicer :)

const identRx = rx
  `([A-Z]{2,})|(.[^A-Z]*)`
identRx.captures = ['caps', 'other']

function markCaps (value) {
  const result = []
  let match, pos= 0, i = 0
  while (pos < value.length && i < 100) {
    if ((match = readToken (identRx, value, pos)) == null) break
    const [type, chunk] = match
  //   log ({pos, type, chunk})
    if (type === 'caps')
      result.push (h('span.-caps', chunk))
    else result.push (chunk)
    i++
    pos += chunk.length
  }
  return result
}



function renderToken ([type, value]) {
  let elem;

  // Leafs

  if (type === 'set-char' && value === ' ') {
    elem = h ('code', h('span', value))
    // TODO clean up space stub
    elem.firstChild.style = 'display:inline-block;width:1ch'
  }

  else if (type === 'string' || type === 'set-char' || type === 'set-char-unquoted')
    elem = h ('code', value)

  else if (type === 'const' || type === 'cp' || type === 'set-cp')
    elem = h ('b', value)

  else if (type === 'ref' || type === 'inset-ref')
    elem = h ('i', ...markCaps (value))
  
  // Comments...

  else if (type === 'comment')
    elem = h('span', '  — ' + value, h('br'))

  // ignoring newlines
  // else if (value === '\n')
  //   elem = h('br')

  // Infixes

  else if (type === 'cat') // catenate
    elem = ' '

  else if (value === '\\' || value === '|' || value === '∪' || value === '∩')
    elem = ' ' + value + ' '

  else if (value === 'and' || value === 'in' || value === '+' || value === '≤' || value === '<')
    elem = ` ${value} `

  else if (value === 'mod') // item separator
    elem = h('span', ' ', h('span.op', `${value}`), ' ')

  else if (value === '-') // character range
    elem = '–'

  else if (value === ',') // item separator
    elem = ', '

  // Groupings (fuss with the spacing)

  else if (value === '{') elem = '{ '
  else if (value === '}') elem = ' } '
  else if (value === '[') elem = '[ '
  else if (value === ']') elem = ' ] '
  else if (value === '(') elem = '( '
  else if (value === ')') elem = ' )'

  // Default, assume leaf

  else {
    elem = h('span', ...markCaps(value))
    elem.classList.add (type)
    // elem.title = type
  }

  return elem
}


// Exports
// -------

window.BnfModule = { version, render, parse }

})(globalThis));