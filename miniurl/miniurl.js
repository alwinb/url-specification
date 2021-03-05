"use strict"; { /* miniurl */

const { setPrototypeOf:setProto, assign } = Object
const log = console.log.bind (console)
const raw = String.raw

// Miniurl
// =======
// Miniurl is a very small example implementation
// of the URL Specification
// Like the specification itself it is not quite
// complete yet, but it is coming along quite nicely.


// Preliminaries
// -------------

const low = str =>
  str ? str.toLowerCase () : str


// Model
// -----

const tags = { 
  scheme:1,
  user:2.1, pass:2.2,
  creds:2.5,
  host:2.6, port:2.7,
  auth:3, drive:4,
  root:5, dirs:6, file:7,
  query:8, fragment:9
}

const specials = { http:1, https:2, ws:3, wss:4, ftp:5, file:6 }

const isSpecial = ({ scheme }) =>
  low (scheme) in specials

const isBase = ({ scheme, host, root }) =>
  scheme != null && (host != null || root != null)


// Reference Resolution
// --------------------

const ord = url => {
  for (let k in tags)
    if (url[k] != null) return Math.ceil (tags[k])
  return tags.fragment
}

const upto = (url, ord) => {
  const r = { }
  for (let k in tags)
    if (url[k] == null) continue
    else if (tags[k] < ord) r[k] = url[k]
    else if (tags[k] === ord && k === 'dirs')
      r[k] = url[k] .slice (0)
  return r
}

// ### The Goto operations

const goto = (url1, url2) => {
  const r = upto (url1, ord (url2))
  for (let k in tags)
    if (url2[k] == null) continue
    else if (k === 'dirs')
      r.dirs = [...(r.dirs||[]), ...url2.dirs]
    else r[k] = url2[k]

  // ## Patch up root if needed
  if ((r.host != null || r.drive) && (r.dirs || r.file))
    r.root = '/'
  
  return r
}

// #### Non-strict Goto

const _goto = (url1, url2, { strict = false } = {}) => {
  const { scheme:s1 } = url1, { scheme:s2 } = url2
  if (!strict && s1 && s2 && low (s1) === low (s2)) {
    url1 = setProto ({ scheme:s2 }, url1)
    url2 = setProto ({ scheme:null }, url2)
  }
  return goto (url1, url2)
}

// ### Resolution Operations

const preResolve = (url1, url2) => // NB this is a strict resolve
  isBase (url2) || ord (url1) === tags.fragment
    ? _goto (url2, url1, { strict:false })
    : url1

const resolve = (url1, url2) => {
  const r = preResolve (url1, url2), o = ord (r)
  if (o === tags.scheme || o === tags.fragment && r.fragment != null)
    return r
  else throw new Error (`Failed to resolve <${print(url1)}> against <${print(url2)}>`)
}

// ### The Force operation

const forceFileUrl = url => {
  url = assign ({ }, url)
  if (url.host == null) url.host = ''
  if (url.drive == null) url.root = '/'
  return url
}

const forceWebUrl = url => {
  url = assign ({ }, url)
  if (!url.host) {
    let str = url.host
    const dirs = url.dirs ? url.dirs.slice () : []
    while (!str && dirs.length) str = dirs.shift ()
    if (!str) { str = url.file; delete url.file }
    if (str) {
      const auth = parseAuth (str)
      auth.dirs = dirs
      assign (url, auth)
    }
    else throw new Error ('Cannot force <'+print(url)+'>')
  }
  url.root = '/'
  return url
}

const force = url => {
  const scheme = low (url.scheme)
  const s = scheme in specials
  if (scheme === 'file') return forceFileUrl (url)
  else if (s) return forceWebUrl (url)
  else return url
}


// Printing
// --------

// Work in progress, using a post order traversal. 
// I'd like to make that more clean

const reduce = red => url => {
  let [hasCreds, hasAuth] = [false, false]
  let creds = red.empty ()
  let auth = red.empty ()
  let r = red.empty ()
  for (let k in tags) {
    // log ('red', {k, r, auth})

    if (k === 'creds' && hasCreds)
      auth = red.add (auth, red.creds (creds))

    else if (k === 'auth' && hasAuth)
      r = red.add (r, red.auth (auth))

    else if (url[k] == null) continue

    // Right, this is messy, clean that up
    else if (Math.round (tags[k]) === 2) {
      hasCreds = true
      creds = red.add (creds, red[k](url[k]))
    }

    else if (Math.round (tags[k]) === tags.auth) {
      hasAuth = true
      auth = red.add (auth, red[k](url[k]))
    }

    else if (k === 'dirs')
      (url.dirs||[]).forEach (_ => r = red.add(r, red.dir(_)))

    else r = red.add (r, red[k](url[k]))
    // log ('=>', {k, r, auth})
  }
  return r
}

const printer = {
  empty: _ => '',
  add: (a, b) => a + b,
  scheme:   _ => _ + ':',
  user:     _ => _,
  pass:     _ => ':' + _,
  creds:    _ => _ + '@',
  host:     _ => _,
  port:     _ => ':' + _,
  auth:     _ => '//' + _,
  root:     _ => '/',
  drive:    _ => '/' + _,
  dir:      _ => _ + '/',
  file:     _ => _,
  query:    _ => '?' + _,
  fragment: _ => '#' + _, 
}

const print = reduce (printer)


// Normalisation
// -------------

const dots = seg =>
  seg.length <= 3
    && (seg === '.'
    || low (seg) === '%2e') ? 1 :
  seg.length <= 6
    && (seg === '..'
    || low (seg) === '.%2e'
    || low (seg) === '%2e.'
    || low (seg) === '%2e%2e') ? 2 : 0
  
const normalise = url => {

  const r = assign ({}, url)

  // ### Scheme normalisation

  const scheme = low (r.scheme)
  r.scheme = scheme

  // ### Authority normalisation

  if (r.pass === '') delete r.pass
  if (!r.pass && r.user === '') delete r.user
  if (r.port === '') delete r.port

  // ### Path segement normalisation

  const dirs = []
  for (let x of r.dirs||[]) {
    const isDots = dots (x)
    if (isDots === 2) dirs.pop ()
    else if (!isDots) dirs.push (x)
  }
  if (r.file) {
    const isDots = dots (r.file)
    if (isDots === 2) dirs.pop ()
    if (isDots) delete r.file
  }
  if (dirs.length) r.dirs = dirs
  else delete r.dirs

  // ### Drive letter normalisation

  if (r.drive)
    r.drive = r.drive[0] + ':'

  // ### Scheme-based authority normalisation

  if (scheme === 'file' && r.host === 'localhost')
    // TODO check spec. Should it say (auhority ε) or (auhority (host ε)) ?
    r.host = ''

  else if (url.port === 80 && (scheme === 'http' || scheme === 'ws'))
    delete r.port

  else if (url.port === 443 && (scheme === 'https' || scheme === 'wss'))
    delete r.port

  else if (url.port === 21 && scheme === 'ftp')
    delete r.port

  for (let k in tags)
    if (r[k] == null) delete r[k]
  return r
}


// UTF8 Coding
// -----------

const [h2, h3, h4, h5] = [ 0b10<<6, 0b110<<5, 0b1110<<4, 0b11110<<3  ]
const [t6, t5, t4, t3] = [ ~(-1<<6), ~(-1<<5),  ~(-1<<4),   ~(-1<<3) ]

const utf8 = {
  
  encode (code) { // encode! not decode :S
    if (code < 0x80) return [code]
    else if (code < 0x800) {
      const [c1, c2] = [code >> 6, code & t6]
      return [h3|(t5 & c1), h2|(t6 & c2)]
    }
    else if (code < 0x10000) {
      const [c1, c2, c3] = [code >> 12, code >> 6, code & t6]
      return [h4|(t4 & c1), h2|(t6 & c2), h2|(t6 & c3)]
    }
    else {
      const [c1, c2, c3, c4] = [code >> 18, code >> 12, code >> 6, code & t6]
      return [h5|(t3 & c1), h2|(t6 & c2), h2|(t6 & c3), h2|(t6 & c4)]
    }
  },

  decode (bytes) {
    const codes = []
    let n = 0, code = 0, err = false
    for (let i=0,l=bytes.length; i<l; i++) {
      const b = bytes[i]

      ;[err, n, code]
        = b >= 0xf8 ? [  1, 0, 0 ]
        : b >= 0xf0 ? [  n, 3, b & 7  ]
        : b >= 0xe0 ? [  n, 2, b & 15 ]
        : b >= 0xc0 ? [  n, 1, b & 31 ]
        : b >= 0x80 ? [ !n, n-1, code<<6 | b & 63 ]
        : [ n, 0, b ]

      if (err) throw new Error (`Invalid UTF8, at index ${i}`)
      if (n === 0) codes [codes.length] = code
      // TODO code must be <= 0x10FFFF
      // and err on overlong encodings too
    }
    if (n) throw new Error (`Incomplete UTF8 byte sequence`)
    return codes
  }

}


// Percent Coding
// --------------

let lookup, isInSet, getProfile; { 
  
// ### Percent Encode Sets

// There are nine percent encode sets in the spec.
// These are represented here by numbers 1<<8 to 1<<0, so that
// they can be used as bitmasks. 

const url = 1<<9,
  user    = 1<<8,
  host    = 1<<7,
  dir     = 1<<6,
  dir_s   = 1<<5,
  dir_ms  = 1<<4,
  dir_m   = 1<<3,
  query   = 1<<2,
  query_s = 1<<1,
  fragment = 1<<0

// Lookup tables:
// The rightmost bits encode the fragment-encode-set,
// The second-rightmost bits encode the special-query encode set,
// and so on and so forth. 

const u20_u27 = [
/* ( ) */ 0b1111100111,
/* (!) */ 0,
/* (") */ 0b1101100111,
/* (#) */ 0b1111111110,
/* ($) */ 0,
/* (%) */ 0b1000000000,
/* (&) */ 0,
/* (') */ 0b0000000010 ]

const u2f = [
/* (/) */ 0b0111111000, ]

const u3A_u40 = [
/* (:) */ 0b0110000000,
/* (;) */ 0b0100000000,
/* (<) */ 0b1111100111,
/* (=) */ 0b0100000000,
/* (>) */ 0b1111100111,
/* (?) */ 0b0111111000,
/* (@) */ 0b0110000000 ]

const u5B_u60 = [
/* ([) */ 0b1110000000,
/* (\) */ 0b1110110000,
/* (]) */ 0b1110000000,
/* (^) */ 0b1110000000,
/* (_) */ 0,
/* (`) */ 0b1101100001 ]

const u7B_u7E = [
/* ({) */ 0b1101100000,
/* (|) */ 0b1100000000,
/* (}) */ 0b1101100000,
/* (~) */ 0 ]

lookup = c => 
  // Escape C0 controls, DEL and C1 controls
  (c <= 31 || 127 <= c && c < 160) ? ~0 :
  // Lookup tables
  (0x20 <= c && c <= 0x27) ? u20_u27 [c - 0x20] :
  (c === 0x2f            ) ? u2f     [c - 0x2f] :
  (0x3a <= c && c <= 0x40) ? u3A_u40 [c - 0x3a] :
  (0x5b <= c && c <= 0x60) ? u5B_u60 [c - 0x5b] :
  (0x7b <= c && c <= 0x7e) ? u7B_u7E [c - 0x7b] : 
  // Escape surrogate halves and non-characters
  (0xD800 <= c && c <= 0xDFFF) ? ~0 :
  (0xFDD0 <= c && c <= 0xFDEF || ((c >> 1) & 0x7FFF) === 0x7FFF) ? ~0 : 0
  // NB 0x7FFF is 2**15-1, i.e. 0b111111111111111 (fifteen ones).


// ### Percent Encode Profiles
// There are four encode profiles. 

const [username, pass, password, file] = [user, user, user, dir]
const
  _generic = { url, user, pass, username, password, host, dir, file, query, fragment },
  _minimal = { ..._generic, dir: dir_m,  file: dir_m },
  _special = { ..._generic, dir: dir_s,  file: dir_s,  query: query_s },
  _minspec = { ..._generic, dir: dir_ms, file: dir_ms, query: query_s }

getProfile = ({ minimal = false, special = false }) =>
  minimal && special ? _minspec
    : special ? _special
    : minimal ? _minimal
    : _generic
}

isInSet = (cp, { name, minimal, special }) =>
  lookup (cp) & getProfile ({ minimal, special }) [name]


// ### Percent Encoding URLs

// TODO Add a new 'strict' profile

const profileFor = (url, fallback) => {
  const scheme = url.scheme
  const special = isSpecial (url)
  const minimal = special ? false : !isBase (url)
  return { minimal, special }
}

const percentEncode = (url, _profile = profileFor (url)) => {
  const profile = getProfile (_profile)
  const r = assign ({}, url)
  for (let k in tags) {
    if (k === 'dirs' && url.dirs) {
      const _dirs = (r.dirs = [])
      for (let x of url.dirs)
        _dirs.push (percentEncodeString (x, profile.dir))
    }
    else if (k === 'host' && _isIp6 (url.host))
      continue
    else if (k in profile && url[k] != null)
      r[k] = percentEncodeString (url[k], profile[k])
  }
  return r
}

// TODO design the ip4/ip6 host representation for the spec

const _isIp6 = str => 
  str != null && str[0] === '[' && str[str.length-1] === ']'

// TODO the WhatWG spec requires encoding all non-ASCII, but it makes sense to
// make that configurable also in the URL Standard. 
// It may even be possible to create profiles that produce RFC 3986 URIs and
// RFC 3987 IRIs. 


// Percent Coding for Strings
// --------------------------

const percentEncodeString = (value, encodeSet, { ascii = true } = { }) => {
  let coded = ''
  for (let char of value) {
    const cp = char.codePointAt (0)
    const escapeAscii = ascii && (cp < 0x20 || cp > 0x7E)
    if (escapeAscii || lookup (cp) & encodeSet) for (let byte of utf8.encode (cp)) {
      let h1 = byte >> 4, h2 = byte & 0b1111
      h1 = (h1 < 10 ? 48 : 55) + h1 // single hex digit
      h2 = (h2 < 10 ? 48 : 55) + h2 // single hex digit
      coded += String.fromCharCode (0x25, h1, h2) // %xx code
    }
    else coded += char
  }
  return coded
}


// Parsing
// -------

// ### Preprocessing

const TRIM = /^[\x00-\x20]+|[\x00-\x20]+$|[\t\n\r]+/g
const preprocess = input => input.replace (TRIM, '')

// ### Grammar
// This does not follow the spec exactly,
// it uses three passes, instead

const group = _ => '(?:' + _ + ')'
const opt   = _ => '(?:' + _ + ')?'
const dummy = '(.{0})'
const Rexp  = _ => new RegExp ('^' + _ + '$')

const
  scheme   = raw `([a-zA-Z][a-zA-Z0-9+\-.]*)[:]`,
  rest     = '([^#?]*)',
  search   = '[?]([^#]*)',
  fragment = '[#](.*)'

const
  auth     = raw `[/]{2}([^/]*)`,
  port     = '[:]([0-9]*)',
  drive    = raw `([a-zA-Z][|:])`,
  root     = raw `([/])`,
  dirs     = raw `(.*[/])`,
  file     = raw `([^/]+)`,
  path     = opt (root) + opt (dirs) + opt (file)

const
  user     = '([^:]*)',
  pass     = '[:](.*)',
  fhost    = raw `(\[[:.0-9a-fA-F]*\]|[^\0\t\n\r #/:<>?@[\\\]^]*)`,
  host     = raw `(\[[:.0-9a-fA-F]*\]|[^\0\t\n\r #/:<>?@[\\\]^]+)`,
  creds    = user + opt (pass) + '[@]'

const
  authpath  = dummy + auth + dummy + opt (root + opt (dirs) + opt (file)),
  authdrive = group ('[/]{0,2}' + drive + '|' + '[/]{2}' + fhost + opt ('[/]' + drive)),
  fauthpath = authdrive + opt (root + opt (dirs) + opt (file)),
  authExp   = Rexp (opt (creds) + host + opt (port))

const   phase1  = Rexp (opt (scheme) + rest + opt (search) + opt (fragment))
const  pathExp  = Rexp (path)
const authPath  = Rexp (authpath)

// Don't try this at home (string replacement on RegExp source).

const sPathExp  = Rexp (path .replace(/[/]/g, raw `/\\`))
const sauthPath = Rexp (authpath .replace(/[/]/g, raw `/\\`))
const fAuthPath = Rexp (fauthpath .replace(/[/]/g, raw `/\\`))

// ### Putting it together

function parse (input, mode = 'http') {
  let [_, scheme, rest, query, fragment ] = phase1.exec (input)
  let match, drive, drive2, auth, root, dirs, file

  const type = (scheme || mode) .toLowerCase ()
  const s = type in specials
  const _authPath = type === 'file' ? fAuthPath : s ? sauthPath : authPath

  if ((match = _authPath.exec (rest))) {
    [_, drive, auth, drive2, root, dirs, file] = match
    drive = drive2 ? drive2 : drive ? drive : null
  }
  else {
    const _path = s ? sPathExp : pathExp;
    [_, root, dirs, file] = _path.exec (rest)
  }
  if (dirs) {
    dirs = (dirs = dirs.split (s ? /[/\\]/g : '/'), dirs)
    dirs.pop ()
  }
  const r = { scheme, drive, root, dirs, file, query, fragment }
  return (auth != null) ? assign (r, parseAuth (auth)) : r
}

function parseAuth (input) {
  let match, user, pass, host, port, _
  if (input.length === 0) host = ''
  else if ((match = authExp.exec (input))) {
    [_, user, pass, host, port] = match
    if (port != null && port.length) {
      port = +port
      if (port >= 2**16)
        throw new Error ('Authority parser: Port out of bounds <'+input+'>')
    }
  }
  else throw new Error ('Authority parser: Illegal authority <'+input+'>')
  return { user, pass, host, port }
}


// Parse-resolve-and-normalise
// ---------------------------

const parseResolveAndNormalise = (input, baseUrl = { }) => {
  input = preprocess (input)
  const url = parse (input, baseUrl.scheme || 'http')
  return percentEncode (normalise (force (resolve (url, baseUrl))))
}

function test (test) {
  const baseUrl = parseResolveAndNormalise (test.base)
  let resolved = parseResolveAndNormalise (test.input, baseUrl)
  resolved.href = print (resolved)
  resolved._base = baseUrl
  return resolved
}


// Exports 
// -------

const miniurl = {
  isBase, isSpecial,
  ord, upto, goto, _goto, preResolve, resolve, 
  parse, normalise, normalize:normalise, print,
  percentEncode, profileFor,
  isInSet,
  parseResolveAndNormalise, test
}

if (typeof module === 'undefined')
  globalThis.miniurl = miniurl
else 
  module.exports = miniurl

/* end */ }