const log = console.log.bind (console)

const $ = (name, ...subs) => {
  const r = document.createElement (name)
  r.append (...subs)
  return r
}

function buildTOC (doc = document) {
  const heads = doc.querySelectorAll ('H2')
  const ul = $('ul')
  for (let h of heads) {
    if (h.classList.contains('toc-exclude')) continue
    let anchor = $('a', h.innerText)
    let id = h.innerText.replace (/\s+/g, '-') .toLowerCase ()
    h.id = id
    anchor.href = '#' + id
    ul.append ($('li', anchor))
  }
  return ul
}


// HrefIndex // FragmentReferenceIndex 
// -----------------------------------
// Builds an index object (null prototype)
// from fragment-ids to nonempty arrays of anchors. 

function buildHrefIndex (doc = document) {
  let base = new URL (document.location)
  base.hash = base.search = ''
  base = String (base)
  const anchors = doc.getElementsByTagName ('A')
  const index = Object.create (null)
  for (let anchor of anchors) {
    let href = new URL (anchor.href, base)
    let id = href.hash.substr(1)
    href.hash = href.search = ''
    if (id && base === String (href)) {
      index[id] = index[id] || []
      index[id].push (anchor)
    }
  }
  return index
}


// Definition Index
// ----------------

function buildIndex (doc = document) {
  const dfns = doc.getElementsByTagName ('DFN')
  const index = Object.create (null)
  for (let dfn of dfns) {
    const context = getContext (dfn)
    if (!context) continue
    let { block, section } = context
    const title = section ? section.querySelector('h1,h2').innerText : null
    let text = dfn.innerText.replace (/\s+/, ' ')
    // TODO support multiple dfns with same name
    index [text] = index [text]||[]
    index [text].push ({ dfn, block, section, title })
  }
  // log (index)
  return index
}

function buildToolTips (entries) {
  const tips = $('div')
  for (let entry of entries) {
    if (!entry.block) continue
    const tip = entry.block.cloneNode (true)
    if (!entry.block.querySelector ('h2,h3,h4')) {
      const h = entry.section.querySelector('h2')
      tips.append ($('h4', h.innerText))
    }
    tips.append (tip)
  }
  return tips
}


// Idiom Observer
// --------------
// Detects mouses over idioms and other tags that
// benefit from a tool tip

function IdiomObserver (elem, callback) {

  const self = this
  let current = null
  document.addEventListener ('click', handler)
  elem.addEventListener ('mouseover', handler)

  function handler (evt) {
    const info = getContext (evt.target)
    if (info == null) return
    info.idiom = (info.elem && info.elem.innerText.replace(/\s+/, ' ')) || null
    if (evt.type === 'click' || info.idiom !== current) {
      current = info.idiom
      callback (evt, info)
    }
  }

}

const contexts = { TR:1, LI:1, DIV:1, P:1, SECTION:1, BODY:1 }
const idioms = { I:1, B:1, DFN:1 }

function getContext (elem) {
  let idiom = null, implicitScope = null, scope, section
  for (; (!scope || !section) && elem && elem.tagName !== 'HTML'; elem = elem.parentNode) {
    if (!idiom && elem.tagName in idioms) {
      if (elem.classList.contains ('noindex')) return null
      else idiom = elem
    }
    else if (!scope) {
      if (elem.classList.contains ('dfn-scope'))
        scope = elem
      else if (!implicitScope && elem.tagName in contexts)
        implicitScope = elem
    }
    if (!section && elem.tagName === 'SECTION') {
      section = elem
    }
  }
  // may return { elem:null, ...ea }
  return { elem:idiom, block: scope || implicitScope, section }
}


// Page Observer
// -------------
// Detects currently visible section

function PageObserver (elem, callback) {

  const self = this
  const article = document.getElementsByTagName ('ARTICLE')[0]
  const sections = document.getElementsByTagName ('SECTION')
  let currentSection = sections [0]
  let scrollTimeout = 0
  onscroll ()

  const wrapped = evt => !scrollTimeout ? setTimeout (_ => onscroll (evt), 30) : null
  window.addEventListener ('hashchange', wrapped)
  elem.addEventListener ('scroll', wrapped)

  function onscroll () {
    // NB hard coded 80px threshold for header
    const scrollY = elem.scrollTop
    const newSection = scrollY < 80 ? article : getCurrentSection (sections)
    if (newSection && currentSection !== newSection)
      callback ({ section:(currentSection = newSection), scrollY })
    scrollTimeout = 0
  }
  
  function getCurrentSection () {
    const threshold = 25 // 75 // 55
    for (let s of sections) {
      const { top, bottom } = s.getBoundingClientRect ()
      if (top < threshold && threshold < bottom) return s
    }
  }

}


// Main
// ----

window.addEventListener ('DOMContentLoaded', main)

function main () {

  const content = document.getElementsByTagName ('main') [0]
  const header = document.getElementsByTagName ('header') [0]
  const toolsDiv = document.getElementById ('tooltip')
  let toc, hoverDfns = [], hoverAs = []
  let currentIdiom = null, pinnedTips = null

  document.getElementById ('toc') .replaceWith (toc = buildTOC ())
  toc.id = 'toc'

  const index = buildIndex ()
  const refIndex = buildHrefIndex ()

  new PageObserver (content, onSection)

  function onSection ({ section, scrollY, _header = true }) {
    log ('onSection')
    let entry, node = section.querySelector ('h1,h2')
    if ((entry = refIndex [node.id])) {
      hoverAs.forEach (a => a.classList.remove ('-focus'))
      hoverAs = entry
      hoverAs.forEach (a => a.classList.add ('-focus'))
    }
    // Show the node in the header
    if (node.tagName === 'H2') {
      header.style.display = 'block'
      node = node.cloneNode (true)
      node.style.display = null
      // Assumes <header><hgroup><h2>...
      header.firstElementChild.innerHTML = ''
      header.firstElementChild.append (node)
    }
    else {
      header.style.display = 'none'
    }
  }


  // Idiom tools

  new IdiomObserver (content, onIdiom)

  function onIdiom (evt, { elem, block, idiom }) {
    log ('idiom', idiom, pinnedTips, evt.type)
    if (evt.type === 'click') {
      if (!idiom) {
        pinnedTips = null
        clearIdiom ()
      }
    }
    else if (idiom === null) return clearIdiom ()

    let entries = index [idiom]
    if (entries) {
      entries.forEach (({dfn}) => dfn.classList.add ('-focus'))
      hoverDfns = entries
      const tips = buildToolTips (entries)
      if (evt.type === 'click') pinnedTips = tips
      showTips (tips)
    }
  }
  
  function showTips (tips) {
    toolsDiv.classList.add ('-hidden')
    if (tips) {
      toolsDiv.innerHTML = ''
      toolsDiv.append (tips)
      toolsDiv.style.top = 0
      const rect = tips.getBoundingClientRect ()
      const y = Math.max (rect.y, 475) - 25
      toolsDiv.style.top = y + 'px'
      toolsDiv.classList.remove ('-hidden')
    }
  }

  function clearIdiom () {
    hoverDfns.forEach (({ dfn }) => dfn.classList.remove ('-focus'))
    showTips (pinnedTips)
    currentIdiom = null
  }

}

