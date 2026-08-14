import {
  addFractions,
  divFractions,
  fractionFromDecimalString,
  fractionToCents,
  isZeroFraction,
  mulFractions,
  negateFraction,
  subFractions,
  type Fraction,
} from './money'

const ALLOWED_CHARS = /^[0-9.+\-*/() ]*$/

type TokenType = 'NUMBER' | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH' | 'LPAREN' | 'RPAREN'

interface Token {
  type: TokenType
  value: string
}

class ParseError extends Error {}

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < input.length) {
    const char = input[i]
    if (char === ' ') {
      i++
      continue
    }
    if (char === '+') {
      tokens.push({ type: 'PLUS', value: char })
      i++
      continue
    }
    if (char === '-') {
      tokens.push({ type: 'MINUS', value: char })
      i++
      continue
    }
    if (char === '*') {
      tokens.push({ type: 'STAR', value: char })
      i++
      continue
    }
    if (char === '/') {
      tokens.push({ type: 'SLASH', value: char })
      i++
      continue
    }
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: char })
      i++
      continue
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: char })
      i++
      continue
    }
    if (char !== undefined && /[0-9.]/.test(char)) {
      let j = i
      while (j < input.length && /[0-9.]/.test(input[j] ?? '')) {
        j++
      }
      const numberLiteral = input.slice(i, j)
      if (!/^\d+(\.\d+)?$/.test(numberLiteral)) {
        throw new ParseError(`Invalid number: "${numberLiteral}"`)
      }
      tokens.push({ type: 'NUMBER', value: numberLiteral })
      i = j
      continue
    }
    throw new ParseError(`Unexpected character: "${char}"`)
  }
  return tokens
}

interface SignedTerm {
  sign: 1 | -1
  value: Fraction
}

class Parser {
  private tokens: Token[]
  private pos = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private advance(): Token {
    const token = this.tokens[this.pos]
    if (!token) {
      throw new ParseError('Unexpected end of expression')
    }
    this.pos++
    return token
  }

  /** Top-level: returns one Fraction per top-level `+`/`-`-separated term. */
  parseTopLevelTerms(): Fraction[] {
    const terms: SignedTerm[] = []
    let sign: 1 | -1 = 1
    terms.push({ sign, value: this.parseTerm() })
    while (this.peek()?.type === 'PLUS' || this.peek()?.type === 'MINUS') {
      const op = this.advance()
      sign = op.type === 'MINUS' ? -1 : 1
      terms.push({ sign, value: this.parseTerm() })
    }
    if (this.pos !== this.tokens.length) {
      const remaining = this.peek()
      throw new ParseError(`Unexpected token: "${remaining?.value ?? ''}"`)
    }
    return terms.map((t) => (t.sign === -1 ? negateFraction(t.value) : t.value))
  }

  /** Term := Factor (('*'|'/') Factor)* */
  private parseTerm(): Fraction {
    let value = this.parseFactor()
    while (this.peek()?.type === 'STAR' || this.peek()?.type === 'SLASH') {
      const op = this.advance()
      const rhs = this.parseFactor()
      value = op.type === 'STAR' ? mulFractions(value, rhs) : divFractions(value, rhs)
    }
    return value
  }

  /** Factor := ('+'|'-') Factor | Number | '(' Expr ')' */
  private parseFactor(): Fraction {
    const token = this.peek()
    if (!token) {
      throw new ParseError('Unexpected end of expression')
    }
    if (token.type === 'MINUS') {
      this.advance()
      return negateFraction(this.parseFactor())
    }
    if (token.type === 'PLUS') {
      this.advance()
      return this.parseFactor()
    }
    if (token.type === 'NUMBER') {
      this.advance()
      return fractionFromDecimalString(token.value)
    }
    if (token.type === 'LPAREN') {
      this.advance()
      const value = this.parseParenExpr()
      const close = this.peek()
      if (close?.type !== 'RPAREN') {
        throw new ParseError('Missing closing parenthesis')
      }
      this.advance()
      return value
    }
    throw new ParseError(`Unexpected token: "${token.value}"`)
  }

  /** Expr := Term (('+'|'-') Term)*, fully folded — used for parenthesized sub-expressions. */
  private parseParenExpr(): Fraction {
    let value = this.parseTerm()
    while (this.peek()?.type === 'PLUS' || this.peek()?.type === 'MINUS') {
      const op = this.advance()
      const rhs = this.parseTerm()
      value = op.type === 'PLUS' ? addFractions(value, rhs) : subFractions(value, rhs)
    }
    return value
  }
}

export interface ParsedAmount {
  ok: true
  centsPerTerm: number[]
}

export interface ParseFailure {
  ok: false
  error: string
}

export type ParseResult = ParsedAmount | ParseFailure

export interface ParseOptions {
  /** Reject any input that produces more than one top-level term (used by the edit form). */
  editMode?: boolean
}

export function parseAmountExpression(input: string, options: ParseOptions = {}): ParseResult {
  const trimmed = input.trim()
  if (trimmed === '') {
    return { ok: false, error: 'Enter an amount' }
  }
  if (!ALLOWED_CHARS.test(trimmed)) {
    return { ok: false, error: 'Only digits and + - * / ( ) are allowed' }
  }
  let fractions: Fraction[]
  try {
    const tokens = tokenize(trimmed)
    const parser = new Parser(tokens)
    fractions = parser.parseTopLevelTerms()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid expression'
    return { ok: false, error: message }
  }

  if (options.editMode && fractions.length > 1) {
    return { ok: false, error: 'Editing a transaction only allows a single amount, not multiple' }
  }

  if (fractions.some((f) => isZeroFraction(f))) {
    return { ok: false, error: 'Amount cannot be zero' }
  }

  const total = fractions.reduce((acc, f) => addFractions(acc, f), { num: 0n, den: 1n })
  if (isZeroFraction(total)) {
    return { ok: false, error: 'Amount cannot be zero' }
  }

  return { ok: true, centsPerTerm: fractions.map(fractionToCents) }
}
