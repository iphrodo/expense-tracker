/**
 * Exact-fraction decimal arithmetic (BigInt numerator/denominator) so amount
 * expressions never pass through floating point, per design.md's rounding-drift decision.
 */
export interface Fraction {
  num: bigint
  den: bigint
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a
  let y = b < 0n ? -b : b
  while (y !== 0n) {
    ;[x, y] = [y, x % y]
  }
  return x === 0n ? 1n : x
}

function reduce(num: bigint, den: bigint): Fraction {
  if (den < 0n) {
    num = -num
    den = -den
  }
  const g = gcd(num, den)
  return { num: num / g, den: den / g }
}

export function fractionFromInt(n: number): Fraction {
  return { num: BigInt(n), den: 1n }
}

/** Parses a plain (unsigned) decimal literal like "12.50" or "3" into an exact fraction. */
export function fractionFromDecimalString(literal: string): Fraction {
  const dotIndex = literal.indexOf('.')
  if (dotIndex === -1) {
    return reduce(BigInt(literal), 1n)
  }
  const wholePart = literal.slice(0, dotIndex) || '0'
  const fracPart = literal.slice(dotIndex + 1)
  const den = 10n ** BigInt(fracPart.length)
  const num = BigInt(wholePart) * den + BigInt(fracPart)
  return reduce(num, den)
}

export function addFractions(a: Fraction, b: Fraction): Fraction {
  return reduce(a.num * b.den + b.num * a.den, a.den * b.den)
}

export function subFractions(a: Fraction, b: Fraction): Fraction {
  return reduce(a.num * b.den - b.num * a.den, a.den * b.den)
}

export function mulFractions(a: Fraction, b: Fraction): Fraction {
  return reduce(a.num * b.num, a.den * b.den)
}

export function divFractions(a: Fraction, b: Fraction): Fraction {
  if (b.num === 0n) {
    throw new Error('Division by zero')
  }
  return reduce(a.num * b.den, a.den * b.num)
}

export function negateFraction(a: Fraction): Fraction {
  return { num: -a.num, den: a.den }
}

export function isZeroFraction(a: Fraction): boolean {
  return a.num === 0n
}

/** Rounds a fraction (a EUR amount) to the nearest integer cent, half away from zero. */
export function fractionToCents(a: Fraction): number {
  const scaledNum = a.num * 100n
  const den = a.den
  const negative = scaledNum < 0n
  const absNum = negative ? -scaledNum : scaledNum
  const absDen = den < 0n ? -den : den
  const quotient = absNum / absDen
  const remainder = absNum % absDen
  const roundedAbs = remainder * 2n >= absDen ? quotient + 1n : quotient
  const rounded = negative ? -roundedAbs : roundedAbs
  return Number(rounded)
}

/** Formats a cents value as a decimal EUR string. Non-integer cents (e.g. an average) are rounded to the nearest cent for display. */
export function formatCents(cents: number): string {
  const rounded = Math.round(cents)
  const negative = rounded < 0
  const abs = Math.abs(rounded)
  const wholePart = Math.floor(abs / 100)
  const centsPart = abs % 100
  return `${negative ? '-' : ''}${wholePart}.${String(centsPart).padStart(2, '0')}`
}

export function centsToDecimalString(cents: number): string {
  return formatCents(cents)
}

/** Parses a plain (non-expression) decimal EUR string, e.g. from a CSV column, to integer cents. */
export function parseDecimalEurToCents(value: string): number {
  const trimmed = value.trim()
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid decimal amount: ${value}`)
  }
  const negative = trimmed.startsWith('-')
  const unsigned = negative ? trimmed.slice(1) : trimmed
  const fraction = fractionFromDecimalString(unsigned)
  const cents = fractionToCents(fraction)
  return negative ? -cents : cents
}
