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
    if (h.classList.contains('-toc-exclude')) continue
    let anchor = $('a', h.innerText)
    let id = h.innerText.replace (/\s+/g, '-') .toLowerCase ()
    h.id = id
    anchor.href = '#' + id
    ul.append ($('li', anchor))
  }
  return ul
}

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
  log (index)
  return index
}

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
  log (index)
  return index
}


// Idiom Observer
// --------------
// Detects mouses over idioms and other tags that
// benefit from a tool tip

function IdiomObserver (callback) {

  const self = this
  let current = null
  document.addEventListener ('mouseover', onover)

  function onover (evt) {
    const info = getContext (evt.target)
    if ((info && info.elem) !== current) {
      current = info ? info.elem : info
      callback (info)
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

function PageObserver (callback) {

  const self = this
  const article = document.getElementsByTagName ('ARTICLE')[0]
  const sections = document.getElementsByTagName ('SECTION')
  let currentSection = sections[0]
  let lastPosition = 0
  let scrollTimeout
  onscroll ()

  const wrapped = evt => !scrollTimeout ? setTimeout (_ => onscroll (evt), 30) : null
  window.addEventListener('hashchange', onscroll)
  window.addEventListener ('scroll', wrapped)

  function onscroll () {
    let newSection, { scrollY } = window
    newSection = (scrollY < 80) ? article : getCurrentSection (sections)
    if (newSection && currentSection !== newSection)
      callback ({ section:(currentSection = newSection), scrollY })
    else
      callback ({ section:currentSection, scrollY })
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

  const header = document.getElementsByTagName('HEADER')[0]
  const toolsDiv = document.getElementById ('tooltip')
  
  let toc
  document.getElementById ('toc') .replaceWith (toc = buildTOC ())
  toc.id = 'toc'

  const index = buildIndex ()
  const refIndex = buildHrefIndex ()

  let hoverDfns = [], hoverAs = []
  new IdiomObserver (onIdiom)
  new PageObserver (onSection)

  function onSection ({ section, scrollY, range, direction, _header = true }) {
    let entry, node = section.querySelector('h1,h2')
    if ((entry = refIndex[node.id])) {
      hoverAs.forEach (a => a.classList.remove ('-focus'))
      hoverAs = entry
      hoverAs.forEach (a => a.classList.add ('-focus'))
    }
    // Show the node in the header
    if (node.tagName === 'H2') {
      header.style.display = 'block'
      node = node.cloneNode (true)
      node.style.display = null
      header.innerHTML = ''
      header.append (node)
    }
    else {
      header.style.display = 'none'
    }
  }

  function onIdiom ({ elem, block }) {
    clearIdiom ()
    if (elem == null) return
    let entries, text = elem.innerText.replace(/\s+/, ' ')
    if ((entries = index[text])) {
      log (text, entries)
      entries.forEach (({dfn}) => dfn.classList.add ('-focus'))
      hoverDfns = entries
      
      toolsDiv.classList.add ('-hidden')
      toolsDiv.innerHTML =''
      for (let entry of entries) {
        if (!entry.block || entry.block === block) return
        const tip = entry.block.cloneNode(true)
        if (!tip.querySelector('h4')) {
          const text = entry.section.querySelector('h2').innerText // text.slice(1)
          toolsDiv.append ($('h4', text))
        }
        toolsDiv.append (tip)
        toolsDiv.classList.remove ('-hidden')
      }
      const rect = block.getBoundingClientRect ()
      const y = Math.max (rect.y, 475)
      toolsDiv.style.top = y + 'px'
    }
    else clearIdiom ()
  }
  
  function clearIdiom () {
    hoverDfns.forEach (({ dfn }) => dfn.classList.remove ('-focus'))
    toolsDiv.classList.add ('-hidden')
  }
  
}

