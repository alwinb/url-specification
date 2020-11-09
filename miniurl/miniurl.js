"use strict"; { /* miniurl */

const { setPrototypeOf:setProto, assign } = Object
const log = console.log.bind (console)
const raw = String.raw


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
  auth:3, drive:5,
  root:6, dirs:7, file:8,
  query:9, hash:10
}

const specials = { http:1, https:2, ws:3, wss:4, ftp:5, file:6 }

const isBase = ({ scheme, host, root }) =>
  scheme != null && (host != null || root != null)


// Reference Resolution
// --------------------

const ord = url => {
  for (let k in tags)
    if (url[k] != null) return Math.ceil (tags[k])
  return tags.hash
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
  isBase (url2) || ord (url1) === tags.hash
    ? _goto (url2, url1, { strict:false })
    : url1

const resolve = (url1, url2) => {
  const r = preResolve (url1, url2), o = ord (r)
  if (o === tags.scheme || o === tags.hash && r.hash != null)
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
  scheme: _ => _ + ':',
  user:   _ => _,
  pass:   _ => ':' + _,
  creds:  _ => _ + '@',
  host:   _ => _,
  port:   _ => ':' + _,
  auth:   _ => '//' + _,
  root:   _ => '/',
  drive:  _ => '/' + _,
  dir:    _ => _ + '/',
  file:   _ => _,
  query:  _ => '?' + _,
  hash:   _ => '#' + _, 
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

  // ### Authority normalisation

  const r = assign ({}, url)
  if (r.pass === '') delete r.pass
  if (!r.pass && r.user === '') delete r.user
  if (r.port === '') delete r.port

  // ### Path segement normalisation

  const dirs = []
  for (let x of r.dirs||[]) {
    let isDots = dots (x)
    if (isDots === 2) dirs.pop ()
    else if (!isDots) dirs.push (x)
  }
  if (r.file) {
    const isDots = dots (r.file)
    if (isDots === 2) dirs.pop ()
    else if (isDots === 1) delete r.file
  }
  if (dirs.length)
    r.dirs = dirs

  // ### Drive letter normalisation

  if (r.drive)
    r.drive = r.drive[0] + ':'

  // ### Scheme-based authority normalisation

  const scheme = low (url.scheme)
  if (url.port === 80 && (scheme === 'http' || scheme === 'ws'))
    delete r.port
  else if (url.port === 443 && (scheme === 'https' || scheme === 'wss'))
    delete r.port
  else if (url.port === 21 && scheme === 'ftp')
    delete r.port

  for (let k in tags)
    if (r[k] == null) delete r[k]
  return r
}


// Percent Coding
// --------------

// ### Percent Encode Tables
// This encodes the percent encode tables in
// the spec, using bitfields. 

let charInfo, isInSet
{ 
  
// ### There are _nine_ distinct percent encode sets.
// These are numbered from 1<<8 to 1<<0, so they 
// can be used as bitmasks. 

const user = 1<<8,
  host    = 1<<7,
  dir     = 1<<6,
  dir_s   = 1<<5,
  dir_ms  = 1<<4,
  dir_m   = 1<<3,
  query   = 1<<2,
  query_s = 1<<1,
  fragment = 1<<0

const u20_u27 = [
/* ( ) */ 0b111100111,
/* (!) */ 0,
/* (") */ 0b101100111,
/* (#) */ 0b111111110,
/* ($) */ 0,
/* (%) */ 0,
/* (&) */ 0,
/* (') */ 0b000000010 ]

const u2f = [
/* (/) */ 0b111111110, ]

const u3A_u40 = [
/* (:) */ 0b110000000,
/* (;) */ 0b100000000,
/* (<) */ 0b111100111,
/* (=) */ 0b100000000,
/* (>) */ 0b111100111,
/* (?) */ 0b111111110,
/* (@) */ 0b110000000 ]

const u5B_u60 = [
/* ([) */ 0b110000000,
/* (\) */ 0b110110000,
/* (]) */ 0b110000000,
/* (^) */ 0b110000000,
/* (_) */ 0,
/* (`) */ 0b101100111 ]

const u7B_u7E = [
/* ({) */ 0b101100110,
/* (|) */ 0b100000110,
/* (}) */ 0b101100110,
/* (~) */ 0 ]

const lookup = c => 
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
  (0xFDD0 <= c && c <= 0xFDEF || (c <= 0x10FFFF && ((c >> 1) & 0x7FFF) === 0x7FFF)) ? ~0 : 0
  

// ### Encode Profiles

const [username, password, file] = [user, user, dir]
const
  _generic = { username, password, host, dir, file, query, fragment },
  _minimal = { username, password, host, dir:dir_m,  file:dir_m,  query, fragment },
  _special = { username, password, host, dir:dir_s,  file:dir_s,  query:query_s, fragment },
  _minspec = { username, password, host, dir:dir_ms, file:dir_ms, query:query_s, fragment }

isInSet = function (cp, { name, minimal, special }) {
  const profile = minimal && special ? _minspec :
    special ? _special : minimal ? _minimal : _generic
  return lookup (cp) & profile[name]
}

}


// Parsing
// -------

// ### Preprocessing

const TRIM = /^[\x00-\x20]+|[\x00-\x20]+$|[\t\n\r]+/g
const preprocess = input => input.replace (TRIM, '')

// ### URL Parser

const group = _ => '(?:' + _ + ')'
const opt   = _ => '(?:' + _ + ')?'
const dummy = '(.{0})'
const Rexp  = _ => new RegExp ('^' + _ + '$')

const
  scheme   = raw `([a-zA-Z][a-zA-Z0-9+\-.]*)[:]`,
  rest     = '([^#?]*)',
  search   = '[?]([^#]*)',
  hash     = '[#](.*)'

const
  auth     = raw `[/]{2}([^/]*)`,
  fauth    = raw `(\[[:.0-9a-fA-F]*\]|[^\0\t\n\r #/:<>?@[\\\]^]*)`,
  drive    = raw `([a-zA-Z][|:])`,
  root     = raw `([/])`,
  dirs     = raw `(.*[/])`,
  file     = raw `([^/]+)`,
  path     = opt (root) + opt (dirs) + opt (file)

const
  authpath = dummy + auth + dummy + opt (root + opt (dirs) + opt (file)),
  authdrive = group ('[/]{0,2}' + drive + '|' + '[/]{2}' + fauth + opt ('[/]' + drive)),
  fauthpath = authdrive + opt (root + opt (dirs) + opt (file))

const   phase1  = Rexp (opt (scheme) + rest + opt (search) + opt (hash))
const  pathExp  = Rexp (path)
const sPathExp  = Rexp (path .replace(/[/]/g, raw `/\\`))
const authPath  = Rexp (authpath)
const sauthPath = Rexp (authpath .replace(/[/]/g, raw `/\\`))
const fAuthPath = Rexp (fauthpath .replace(/[/]/g, raw `/\\`))


// ### Authority Parser

const
  user = '([^:]*)',
  pass = '[:](.*)',
  host = raw `(\[[:.0-9a-fA-F]*\]|[^\0\t\n\r #/:<>?@[\\\]^]+)`,
  creds = user + opt (pass) + '[@]',
  port = '[:]([0-9]*)',
  //
  authExp = Rexp (opt (creds) + host + opt (port))

// ### Putting it together

function parse (input, mode = 'http') {
  let [_, scheme, rest, query, hash ] = phase1.exec (input)
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
  const r = { scheme, drive, root, dirs, file, query, hash }
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
  const resolved = force (resolve (url, baseUrl))
  // todo: normalise
  return normalise (resolved)
}

function test (test) {
  const baseUrl = parseResolveAndNormalise (test.base)
  let resolved = parseResolveAndNormalise (test.input, baseUrl)
  resolved.href = print (resolved)
  resolved._base = baseUrl
  return resolved
}


// Test 
// ----

const miniurl = {
  ord, upto, goto, _goto, isBase, preResolve, resolve, 
  print, parse,
  parseResolveAndNormalise, test,
  isInSet
}

if (typeof module === 'undefined')
  globalThis.miniurl = miniurl
else 
  module.exports = miniurl


/* end */ }