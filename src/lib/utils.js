// utilidades compartidas: RNG determinista, cálculo de subredes y formato
export const INTERNET = '8.8.8.8'
export const M24 = '255.255.255.0'
export const M30 = '255.255.255.252'
export const M16 = '255.255.0.0'
export const M0 = '0.0.0.0'

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function ipToInt(ip) {
  const p = String(ip).split('.')
  return ((((+p[0] << 24) | (+p[1] << 16) | (+p[2] << 8) | +p[3])) >>> 0)
}
export function intToIp(n) {
  n = n >>> 0
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}
export function netOf(ip, mask) { return intToIp(ipToInt(ip) & ipToInt(mask)) }
export function inSubnet(ip, net, mask) { return (ipToInt(ip) & ipToInt(mask)) === ipToInt(net) }
export function maskLen(m) { let n = ipToInt(m), c = 0; while (n) { c += n & 1; n >>>= 1 } return c }
export function lenMask(l) { return intToIp(l === 0 ? 0 : (0xffffffff << (32 - l))) }
export function validIp(s) {
  if (!/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(s)) return false
  return s.split('.').every((o) => +o <= 255)
}
export function parseMask(s) {
  if (s.includes('/')) return lenMask(+s.split('/')[1])
  return s
}
export function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
export function macOf(key) {
  const h = hashStr(key)
  const b = [0xfa, 0x16, (h >>> 24) & 255, (h >>> 16) & 255, (h >>> 8) & 255, h & 255]
  const hex = b.map((x) => x.toString(16).padStart(2, '0')).join('')
  return hex.slice(0, 4) + '.' + hex.slice(4, 8) + '.' + hex.slice(8, 12)
}
export function pad(s, n) {
  s = String(s)
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

export function isSwitch(d) { return d.type === 'l2switch' || d.type === 'l3switch' }
export function hasCli(d) { return d.type !== 'isp' }
