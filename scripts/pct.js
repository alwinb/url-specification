// Percent Coding
// --------------

// The set of characters to be encoded depends on the property-key and
// on the 'mode'. The mode is computed from the structure of the URL. 

const modes =
  { regular: 0b10, relative: 0b01 }

// Lookup tables
// I'm using bitmasks for the modes, and offsets for the keys.
// There are 5 keys times three mode-bits, 
// thus 15 bits of info per character to encode the escape sets. 

const _offsets =
  { url:10, user:8, pass:8, host:6, dir:2, file:4, query:2, hash:0 }

const t32 = [
/*  32 ( ) */ 0b111111101011,
/*  33 (!) */ 0b000000000000,
/*  34 (") */ 0b111100101011,
/*  35 (#) */ 0b111111111100,
/*  36 ($) */ 0b000000000000,
/*  37 (%) */ 0b111111111111,
/*  38 (&) */ 0b000000000000,
/*  39 (') */ 0b000000000000 ]

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
  // Escape C0 controls, C1 controls and DEL
  if (c <= 31 || 127 <= c && c < 160) return ~0
  // Lookup tables for 32-39, 47, 58-64, 91-96, 123-126
  if (32 <= c && c <= 39) return t32 [c - 32]
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

function isInSet (c, key, { special = false, mode = modes.regular, ascii = false, percentCoded = true} = {}) {
  if (!(key in _offsets)) throw new Error ('unknown encode set')
  const mask = mode << _offsets[key]
  const escape = percentCoded && c === 0x25 ? false
    : c === 92 && special && key in { dir:1, file:1 } ? true
    : c === 39 && special && key === 'query' ? true
    : ascii && c > 127 || charInfo (c) & mask
  return escape
}
