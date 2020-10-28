# URL Reverse Specification

This document provides a concise formal specification of URLs and the language of URLs. It is a _reverse specification_ of the WhatWG URL standard. 
The goals of this document are,

- To provide a modular, concise formal specification that is compatible with, and covers all of the [WhatWG URL standard] with the one exception being their specification of the web API and the url-encoded form format. 

- To define a general model for URLs that can express relative references and to define reference resolution by means of a number of elementary operations, in such a way that the end result is compatible with the WhatWG URL standard. 

- To enable and support efforts _towards_ a single **Unified URL Standard** that includes a normative specification of URL handling by web browsers and that 
resolves the incompatibilites between [RFC 3986][uri], [RFC 3987][iri] and the WhatWG URL standard. 

- To provide the authors of the WhatWG standard with a support document that they can use as a reference in their efforts to standardise the behaviour of web browsers. 

[uri]: https://tools.ietf.org/html/rfc3986
[iri]: https://tools.ietf.org/html/rfc3986
[WhatWG URL standard]: https://url.spec.whatwg.org/


## Status of this document

- The version of this document is 0.1.0.  
- The versioning scheme is specified by [Semantic Versioning][semver].  
- This document is licenced under a [Creative Commons - CC BY 4.0][cc-by] licence. 

[semver]: https://semver.org/spec/v2.0.0.html
[cc-by]: https://creativecommons.org/licenses/by/4.0/


## Structure of this document

As of this writing, this document has a compact format that is focussed specifically on the definition and specification of URLs and operations on URLs. It does not include a discussion of their history or their use in various contexts. It does contain valuable non-normative references to [RFC 3986][uri] that can be followed for additional information about the concepts involved. 

The sections are laid out as follows. 

- Preliminaries
- URL Model
- Reference Resolution
- Parsing
- Host Processing
- Validation
- Percent Coding
- Printing
- Normalisation

[Printing]: #printing
[Parsing]: #parsing


## Preliminaries

#### Strings

For the purpose of this specification,

- A _string_ is a sequence of _character_s. 
- A _character_ is a single [Unicode][unicode] code point. A code point, is a natural number _n_ ≤ 1114111. 
- The _empty string_ is a sequence of zero code points. It is denoted by ε. 

(NB ε is overloaded, it is used for empty sequences in general).

Code points are denoted by a _hexadecimal_ number preceded by **u+**, in boldface. In addition, code points that correspond to printable ASCII characters may be denoted literally, by their corresponding glyph typeset in monospace. For example, **u+** and `A` denote the same code point. Strings that contain only printable ASCII characters may be denoted litterally, typeset in monospace. 

The printable ASCII characters are codepoints in the range 
**u+21** to **u+7E**, inclusive. Note that this excludes the space character **u+20**. 

`!` `"` `#` `$` `%` `&` `'` `(` `)` `*` `+` `,` `-` `.` `/` `0` `1` `2` `3` `4` `5` `6` `7` `8` `9` `:` `;` `<` `=` `>` `?` `@` `A` `B` `C` `D` `E` `F` `G` `H` `I` `J` `K` `L` `M` `N` `O` `P` `Q` `R` `S` `T` `U` `V` `W` `X` `Y` `Z` `[` `\` `]` `^` `_` <code>\`</code> `a` `b` `c` `d` `e` `f` `g` `h` `i` `j` `k` `l` `m` `n` `o` `p` `q` `r` `s` `t` `u` `v` `w` `x` `y` `z` `{` `|` `}` `~`. 

[unicode]: https://www.unicode.org/versions/latest/

#### Tokens

- The word _token_ is used throughout this document to mean a tagged value, (_tag_ _value_), where the _tag_ is taken from a set of predefined _token-types_. 
- The value of a token may be a sequence of tokens itself, in which case the token may be referred to as a _compound token_ for clarity, and the tokens present in its value may be referred to as _sub-token_s.
- When a collection of tokens contains exactly one sub-token (_tag_ _value_) for a given tag, then the tag may be used to refer to its value directly. For example, given a sequence of tokens S := (**foo** _x_), (**bar** _y_), (**baz** _z_); the prase "the **bar** of S", identifies the value _y_, whereas the phrase "the **bar** token of S" identifies the _token_ (**bar** _y_) as a whole. 

#### Grammars

Square bracket [ rule ] **for optional rules**, a postfix star (*) for zero-or-more, a postfix plus (+) for one-or-more, an infix pipe (|) for alternatives, monospaced type for literal strings and an epsilon (ε) for the empty string. 

(TODO the 'matches' notation string :: rule )

#### Character sets

* any := { **u+0**…**u+10FFFF** }
* alpha := { `A`…`Z`, `a`…`z` }
* digit := { `0`…`9` }
* hexdigit := { `0`…`9`, `A`…`F`, `a`…`f` }
* octaldigit := { `0`…`7` }

#### Axioms and Rewrite Rules

(TODO a simple explanation of the notation)


## URL Model

An URL is a special kind of ordered list that is subject to a number of additional constraints. The ordering of the list is analogous to the hierarchical syntax of an URI as described in [Hierarchical Identifiers][uric-hier] in RFC 3986. 

It is important to stress the distinction between an URL and an URL-string. 
An URL is a _structure_, indeed a special kind of ordered list, whereas an URL-string is a special kind of _string_ that _represents_ an URL. Conversions between URLs and URL-strings are described in the sections on [parsing][Parsing] and [printing][Printing]. 

[uric-hier]: https://tools.ietf.org/html/rfc3986#section-1.2.3

#### URL - Definition

An _URL_ is a sequence of tokens that is ordered by their type, taken from the ordered set:  

**scheme** < **authority** < **drive** < **path-root** < **dir** < **file** < **query** < **fragment**. 

URLs are subject to the following constraints:

- URLs contain at most one token per type, except for **dir** tokens, of which they may have any finite amount. 
- If an URL has an **authority** or a **drive** token, and it has a **dir** or a **file** token, then it also has a **path-root** token.

The tokens of an URL are subject to the following conditions:

- The **scheme** of an URL, if present, is a string _scheme_ :: alpha (alpha | digit | `+` | `-` | `.`)\*  
- The **authority** of an URL, if present, is an _Authority_, to be defined below.
- The **drive** of an URL, if present, is a string _drive_ :: alpha (`:` | `|`)
- The **file** of an URL, if present, is a nonempty string.
- For all other tokens present, the tokens' values are strings. 

#### Authority

An _Authority_ is a sequence of tokens ordered by their type, taken from the ordered set:

**username** < **password** < **host** < **port**. 

Authorities are subject to the following constraints:

- Authorities contain at most one token per type.
- Authorities always have a **host** token.
- If an Authority has a **password** token then it also has a **username** token.
- If an Authority has a **host** token whose value is the empty string, then it has no other tokens. 

The tokens of an Authority are subject to the following conditions:

* The **host** of an Authority is either
	- the empty string,
	- an ipv6-address,
	- an opaque-host,
	- an ipv4-address, or
	- a domain-name. 
* The **port** of an Authority, if present, is either
	- the empty string, or
	- an integer in the range 0 to 2<sup>16</sup>–1 inclusive. 
- For all other tokens present, the tokens' values are strings. 

#### Additional Constraints

If an URL has a token (**scheme** _s_), then it is subject to two additional constraints:

- If _s_, converted to lowercase, is not `file` then the URL must not have a **drive** token. 
- If _s_, converted to lowercase, is `file` and the URL has an **authority** then the authority must not contain a **username**, **password** or **port**. 


## Parsing

Parsing is the process of converting a string to an URL. The grammar for an URI in RFC 3986 is specified as a single ABNF Grammar.
This, unfortunately is not feasible for a specification of URLs that agrees with the WhatWG Standard. 
Instead, parsing is stratified into the following phases:

1. Preprocessing.
-  Selecting the parser mode. 
-  Parsing. 
-  Detecting drive letters. 
-  Decoding and parsing the host. 

### Preprocessing

(TODO)

### Selecting the Parser Mode

The parser mode can be determined by 'sniffing' the scheme of the input before parsing. This can be done in a multiple of ways. Implementors may choose to implement the mode selection within the parser itself. For this specification however, it is useful to specify it as a separate step, before parsing. 

Define the following rules. 

- special-scheme := (`http` | `https` | `ws`, `wss` | `ftp` | `file`)
- is-special := special-scheme `:` any*
- has-scheme := alpha (alpha | digit | `+` | `-` | `.`)\*`:` any*

The mode can be selected as follows. 

- Let _magic_ be the first _n_ characters of _input_, with _n_ being max (6, input.length). 
- Set the parser mode to **special** if (lowercase _magic_) :: is-special. 
- Otherwise if the fallback scheme is **special** and _input_ :: has-scheme, then set the parse mode to regular. 

### Generic Grammar

The grammar is parameterised by the parser mode. There are two parser modes, regular, and **special**. In **special** mode, the <sub>s</sub> subscripted rules must be used instead of their unsubscripted counterparts, whenever available. 

##### URL Grammar

The following defines the generic grammar for URLs. 

* url := [ scheme`:` ] [ s s authority ] \[ path-root ] (dir s)* [ file ] [ `?`query ] [ `#`fragment ]

This refers to the following rules: 

* scheme := alpha (alpha | digit | `+` | `-` | `.`)\*
* authority – shall be defined in the next subsection,
* drive := alpha (`:` | `|`) – to be used in a subsequent subsection
* path-root := slash
* dir := pchar*
* file := pchar+
* query := qchar*
* fragment := any*
* qchar := any \ {`#`}

It uses the following rules that depending on the parser mode:

* slash := `/`
* slash<sub>S</sub> := `/` | `\`<sub>err</sub>
* pchar := any \ {`/`, `#`, `?`}
* pchar<sub>S</sub> := any \ {`/`, `\`, `#`, `?`}

##### Authority Grammar

The following defines the grammar for authorities. 

* authority := \[ credentials`@` \] host \[ `:`port \]
* credentials := username \[ `:`password \]

This refers to the following rules:

* username := uchar*
* password := pchar*
* host := ε | `[` ip6-address `]` | opaque-host
* opaque-host := hchar+
* port := portchar*

These rules are based on the following character sets:

* uchar := pchar \ { `:` }
* hchar := pchar \ { `@`, `:` }
* portchar := pchar \ { `@` }

Additional notes:

- port, in this grammar as such, may contain non-digits. 

TODO

- ipv6
- Forbidden host codepoints
- Evaluating the port
* nonhost := { **u+0**, **u+9**, **u+A**, **u+D**, **u+20**, `#`, `/`, `:`, `<`, `>`, `?`, `@`, `[`, `\`, `]`, `^` }

##### A note about repeated slashes

This is a non-normative sub-section. 

Web browsers interpret any amount of slashes after a special scheme as the start of the authority component. Consider the following URL-strings:

1. `http:foo/bar`
2. `http:/foo/bar`
3. `http://foo/bar`
4. `http:///foo/bar`

Web browsers treat all these examples as equivalent to 3: `http://foo/bar`. 

It is tempting to express this behaviour on the level of the grammar. For example one might consider using the following rule:

* url := [ scheme`:` ] [ s* authority ] \[ path-root ] (dir s)* [ file ] [ `?`query ] [ `#`fragment ]

However, the examples 1. to 4. above _do_ behave differently with respect to reference resolution. For example, if they are resolved agains the base URL represented by `http://host/`, then the results are as follows:

1. `http://host/foo/bar`
2. `http://host/foo/bar`
3. `http://foo/bar`
4. `http://foo/bar`

As such, collapsing the multiples of slashes, cannot be expressed within the grammar. The behaviour has to be defined semantically, as a part of the reference resolution operation. 

### Drive letters

The grammar does not have rules for parsing windows drive letters in `file` URLs. It is possible to add that, but together with the mode selection, it would complicate the grammar quite a bit. An easier way to express this is via a separate operation on parsed URLs. 

Drive letter detection, defined using pattern matching:  

- **authority** (**host** _x_) => **drive** _x_
 – if _x_ :: drive-letter  
- **authority** (**host** _x_ • **port** ε) => **drive** (_x_`:`) 
 – if _x_ :: alpha
- _xs_ • (**dir** _x_) => _xs_ • **drive** _x_ • **path-root** `/`
 – if  _x_ :: drive-letter and _xs_ does not contain a **dir** token
- _xs_ • (**file** _x_) => **drive** _x_
 – if  _x_ :: drive-letter and _xs_ does not contain a **dir** token

Drive letter detection must not be applied to URLs that have a scheme that is not `file`. It may be applied to schemeless URLs in contexts where file URLs are expected. 


## Host processing

(TODO)

* Err on forbidden host codepoints excluding `%`
* Percent decode
* Puny decode
* Apply IDNA/ Nameprep normalisation
* Detect IPv4 addresses
* Err on forbidden host codepoints

#### IPv4 Address

An IPv4 address string consists of one up to four dot-separated numbers with an optional trailing dot. The numbers may use decimal, octal or hexadecimal notation, as follows:

* ip4-address := ip4num \[`.` ip4num \[`.` ip4num \[`.` ip4num \] \] \] \[`.`\]
* ip4num := ip4dec | ip4octal | ip4hex
* ip4dec := `0` | digit_nonzero digit*
* ip4octal := `0` octaldigit*
* ip4hex := (`0x` | `0X`) hexdigit*

Note that `0x` is parsed as a hexadecimal number. (It will be interpreted as 0). 


## Reference Resolution

This section defines a reference resolution operation that is analogous, but not equal to the algorithm that is described in the chapter [Reference Resolution][rfc-resolution] of RFC 3986. Likewise, it is analogous, but not equal to the "basic URL parser" that is described in the section [URL parsing][whatwg-parser] of the WhatWG standard. The operations shall later be used to define a parse-resolve-and-normalise operation that is compatible with the WhatWG standard. 

Reference Resolution as defined in this section does not involve URL-strings. It solely operates on URLs as defined in the section [URL Model][model] above. In contrast with the previously mentioned sections in 
RFC 3986 and in the WhatWG standard, it does not do additional normalisation, which is relegated to the section [Normalisation][normalisation] instead. 

[rfc-resolution]: https://tools.ietf.org/html/rfc3986#section-5
[whatwg-parser]: https://url.spec.whatwg.org/#url-parsing
[model]: ./#url-model
[normalisation]: ./#url-normalisation

##### The Order of an URL

A property that is particularily useful is the _order_ of an URL. Colloquially, the order is the type of the first token of an URL. The order may be used as an argument to specify various prefixes of an URL. 

* The **order** of an URL (ord _url_) is defined to be:
  - **fragment** if _url_ is the empty URL.
  - The type of its first token otherwise. 

* The **order-limited prefix** (_url1_ upto _order_) is defined to be:
  - the _shortest_ prefix of _url1_ that contains:
    - all tokens of _url1_ with a type strictly smaller than _order_ and
    - all **dir** tokens with a type weakly smaller than _order_. 

##### The Goto operations

Based on the order and the order-limited prefix one can define "goto" and "nonstrict goto" operations that are analogous to the "merge" operation and its nonstrict counterpart defined in section [Transform References][uri-merge] of RFC 3986. 

I have chosen to rename "merge" to "goto" to reduce the risk of readers making incorrect assumptions about commutativity. Indeed the operations are not commutative, but they are associative. 

* The **goto** operation (_url1_ goto _url2_) is defined to return the _shortest_ URL that has _url1_ upto (ord _url2_) as a prefix and _url2_ as a postfix. 

* The **nonstrict goto** (_url1_ ~goto _url2_) is defined to be (_url1_ goto _url2'_) where  
_url2'_ is _url2_ with the **scheme** token removed if it equals the **scheme** token of _url1_, or _url2_ otherwise.  
(TODO case insensitive). 

##### Properties of the Goto operations

- ord (url1 goto url2) is the least type of {ord url1, ord url2}. 
- (url1 goto url2) goto url3 = url1 goto (url2 goto url3). 
- ε goto url2 = url2. 
- url1 goto ε = url1 is **not** true in general (the fragment is dropped). 
- similar for ~goto. 
- url2 is a postfix of (url1 goto url2) but not necessarily of (url1 goto' url2).


[uri-merge]: https://tools.ietf.org/html/rfc3986#section-5.2.2

##### Resolution

Finally, reference resolution can be defined as follows. 

* The **pre-resolution** of _url1_ against _url2_ is defined to be:
  1. _url1_, if _url2_ does not have an **authority** nor a **path-root** and _url1_ is not the empty URL and its order is not **fragment**. 
  2. _url2_ ~goto _url1_, otherwise.

* The **resolution** of _url1_ against _url2_ is defined to be the pre-resolution of _url1_ against _url2_, if its order is **scheme** or **fragment**. It is undefined otherwise. 

The condition in 1. is necessary to emulate the behaviour of the parse-and-resolve algorithm of the WhatWG standard, where an URL that has a scheme but that does not have an authority nor a path-root recieves a special _cannot-be-a-base-url_ status. In their parse-and-resolve algorithm, such base URLs are implicitly ignored unless the input constitutes an URL that consists of only a fragment. 

(TODO this needs a few small tweaks still to align with the URL constructor). 

##### Forced Resolution

There is an additional operation on URLs called _force_ that deserves special mention. It is used as an error-recovery measure when an URL does not have a 'substantial' authority in a context where this is expected. Colloqually, this operation promotes the first **dir** or **file** token to an authority. To do so, it must invoke the authority parser on the value of such **dir** or **file** token. 


The result of **forcing** an URL _url1_  is defined to be:

- _url1_ if _url1_ has a substantial **authority**
- ...


## Normalisation

#### Path normalisation

(Equivalence relation)

- (**dir** x) = (**dir** `.`) 
 – if _x_ in { `%2e`, `%2E` }
- (**dir** x) = (**dir** `..`) 
 – if _x_ in { `%2e%2e`, `%2e%2E`, `%2E%2e`,`%2E%2e` }
- (**dir** `.`) = ε
- (**file** `.`) = ε
- (**dir** _x_) • (**dir** `..`) = ε 
 – if _x_ is not in { `.`, `..` }
- (**dir** _x_) • (**file** `..`) = ε 
 – if _x_ is not in { `.`, `..` }
* (**path-root** _x_) • (**dir** `..`) = (**path-root** _x_)
* (**path-root** _x_) • (**file** `..`) = (**path-root** _x_)

(TODO define the normal form, algorithm, direct rules ltr)

#### Authority normalisation

(Equivalence relation)

* (**password** ε) = ε
* (**port** ε) = ε
* (**username** ε) • (**paswoord** ε) = ε

(TODO define the normal form, algorithm, direct rules ltr)

##### Scheme dependent normalisation

* (**scheme** `file`) • (**authority** (**host** `localhost`)) = (**scheme** `file`) • (**authority** (**host** ε))

and

* (**scheme** _s_) • (**authority** _xs_ • (**port** `80`)) = (**scheme** _s_) • (**authority** _xs_) – if _s_ :: `http` | `ws`
* (**scheme** _s_) • (**authority** _xs_ • (**port** `443`)) = (**scheme** _s_) • (**authority** _xs_) – if _s_ :: `https` | `wss`
* (**scheme**`ftp`) • (**authority** _xs_ • (**port** `21`)) = (**scheme**`ftp`) • (**authority** _xs_)




## Validation


## Percent Coding



## Printing

Printing is the process of converting an URL to an URL-string. 

To obtain an URL-string for a given URL _url1_ proceed as follows.

- Let _url2_ be _url1_, percent encoded. 
- Let output be the empty string, then, for each of the tokens (_type_, _value_) of _url2_ in order, convert the token to a string according to the following table and append it to the output. 

| **scheme** | **authority** | **drive** | **path-root** | **dir** | **file** |**query** | **fragment** |
|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| _value_`:` | `//`print\_auth(_value_) | `/`_value_ | `/` | _value_`/` | _value_ | `?`_value_ | `#`_value_




