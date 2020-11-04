// Percent Coding
// --------------

// Lookup tables
// I'm using bitmasks for the modes, and offsets for the keys.

const modes =
  { regular: 0b10, minimal: 0b01 }

const _offsets =
  { url:10, user:8, pass:8, host:6, dir:4, file:4, query:2, fragment:0 }

const t32 = [
/*  32 ( ) */ 0b111111101011,
/*  33 (!) */ 0b000000000000,
/*  34 (") */ 0b111100101011,
/*  35 (#) */ 0b111111111100 ]

const t47 = [
/*  47 (/) */ 0b001111111100 ]

const t58 = [
/*  58 (:) */ 0b001111000000,
/*  59 (;) */ 0b001100000000,
/*  60 (<) */ 0b111111101011,
/*  61 (=) */ 0b001100000000,
/*  62 (>) */ 0b111111101011,
/*  63 (?) */ 0b001111111100,
/*  64 (@) */ 0b001111000000 ]

const t91 = [
/*  91 ([) */ 0b111111000000,
/*  92 (\) */ 0b111110000000,
/*  93 (]) */ 0b111111000000,
/*  94 (^) */ 0b111111000000,
/*  95 (_) */ 0b000000000000,
/*  96 (`) */ 0b111100101011 ]

const t123 = [
/* 123 ({) */ 0b111100101000,
/* 124 (|) */ 0b111100000000,
/* 125 (}) */ 0b111100101000,
/* 126 (~) */ 0b000000000000 ]


function charInfo (c) {
  // Escape C0 controls, DEL and C1 controls
  if (c <= 31 || 127 <= c && c < 160) return ~0
  // Lookup tables for 32-35, 47, 58-64, 91-96, 123-126
  if (32 <= c && c <= 35) return t32 [c - 32]
  if (c === 47) return t47 [c-47]
  if (58 <= c && c <= 64) return t58 [c - 58]
  if (91 <= c && c <= 96) return t91 [c - 91]
  if (123 <= c && c <= 126) return t123 [c - 123]
  // Escape surrogate halves and non-characters
  if (0xD800 <= c && c <= 0xDFFF) return ~0
  if (0xFDD0 <= c && c <= 0xFDEF || (c <= 0x10FFFF && ((c >> 1) & 0x7FFF) === 0x7FFF)) return ~0
  // Don't escape anything else
  return 0
}

const translations = {
  path:'dir',
  userinfo:'user',
  creds:'user',
  username:'user',
  password:'pass',
  hash:'fragment',
}

function isInSet (c, { name,  special = false, minimal = false, ascii = false, percentCoded = true }) {
  if (name in translations) name = translations[name]
  if (!(name in _offsets)) throw new Error ('unknown encode set')
  mode = minimal ? modes.minimal : modes.regular
  const mask = mode << _offsets[name]
  const escape = percentCoded && c === 0x25 ? false
    : c === 92 && special && name in { dir:1, file:1 } ? true
    : c === 39 && special && name === 'query' ? true
    : ascii && c > 127 || charInfo (c) & mask
  return escape
}
