/* eslint-disable no-console */
// Decode HC1 (Base45 -> zlib -> COSE_Sign1 -> CWT/CBOR) and print where ICVP-like data lives.
// Run:
//   node tools/decode-hc1.js

const { decode: cborDecode } = require('cbor-x');
const pako = require('pako');

const BASE45_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const BASE45_MAP = (() => {
  const m = new Map();
  for (let i = 0; i < BASE45_ALPHABET.length; i++) m.set(BASE45_ALPHABET[i], i);
  return m;
})();

function base45Decode(input) {
  const s = String(input || '');
  const out = [];
  for (let i = 0; i < s.length; ) {
    const c1 = s[i++];
    const c2 = s[i++];
    if (c2 === undefined) throw new Error('Base45 inválido: longitud impar');

    const v1 = BASE45_MAP.get(c1);
    const v2 = BASE45_MAP.get(c2);
    if (v1 === undefined || v2 === undefined) throw new Error('Base45 inválido: caracter no permitido');

    if (i < s.length) {
      const c3 = s[i];
      const v3 = BASE45_MAP.get(c3);
      if (v3 !== undefined) {
        i++;
        const x = v1 + v2 * 45 + v3 * 45 * 45;
        if (x > 0xffff) throw new Error('Base45 inválido: overflow');
        out.push((x >> 8) & 0xff, x & 0xff);
        continue;
      }
    }

    const x = v1 + v2 * 45;
    if (x > 0xff) throw new Error('Base45 inválido: overflow');
    out.push(x);
  }
  return new Uint8Array(out);
}

function unwrapCborTagged(value) {
  if (!value || typeof value !== 'object') return value;
  if (Object.prototype.hasOwnProperty.call(value, 'tag') && Object.prototype.hasOwnProperty.call(value, 'value')) {
    return value.value;
  }
  return value;
}

function getClaim(mapOrObj, key) {
  if (!mapOrObj) return null;
  if (mapOrObj instanceof Map) return mapOrObj.get(key);
  const sk = String(key);
  return mapOrObj[key] ?? mapOrObj[sk] ?? null;
}

function summarizeKeys(x) {
  if (!x) return [];
  if (x instanceof Map) return Array.from(x.keys()).map(String);
  if (typeof x === 'object') return Object.keys(x);
  return [];
}

function findIcvpCandidates(node, path = '$', results = []) {
  const n = node;
  if (!n) return results;

  if (n instanceof Map) {
    const keys = Array.from(n.keys());
    // Candidate: has keys typical of ICVPMin
    const has = (k) => keys.some((kk) => String(kk) === String(k));
    const looks = has('n') && has('gn') && has('dob') && has('v');
    if (looks) results.push({ path, kind: 'Map', keys: keys.map(String) });
    for (const [k, v] of n.entries()) {
      findIcvpCandidates(unwrapCborTagged(v), `${path}[${JSON.stringify(String(k))}]`, results);
    }
    return results;
  }

  if (Array.isArray(n)) {
    n.forEach((v, i) => findIcvpCandidates(unwrapCborTagged(v), `${path}[${i}]`, results));
    return results;
  }

  if (typeof n === 'object') {
    const keys = Object.keys(n);
    const has = (k) => Object.prototype.hasOwnProperty.call(n, k);
    const looks = has('n') && has('gn') && has('dob') && has('v');
    if (looks) results.push({ path, kind: 'Object', keys });
    for (const [k, v] of Object.entries(n)) {
      findIcvpCandidates(unwrapCborTagged(v), `${path}.${k}`, results);
    }
    return results;
  }

  return results;
}

// Pega acá tu HC1 (puede tener saltos de línea; se eliminan \r/\n/\t).
const HC1 = `HC1:6BFOXN%TSMAHN-HXYS1XSWKNC5J347KW8OLBM*4$KJBNCXPC-YGF4INO49K8S$C$DFTIA%IHG-K4IJ2F1MKN.Z8OA7-PVYLVGLOPHNB1P$HFZD5CC9T0H+:ICNND*2I 0SGH4XPHOP2H5CF4THG3TP0LAQJAKE0PSUBJ9MN9WP5.T1FVQHQ1AT1JPATU1LMA$%HTPQVZ5MQQZ0QBT1RXQ9W16IAXPMHQ15%PAT1+ZEQS5/PIPQIB+HZUIRLEIGIYIGASAX8R0NLIWMCSOL7O5X7G16*H5.P4708NDSE87-HQT*O3S8 NRH57-8RQ0QRTBCNP2F4K27J64*ER41R*ER*Y4M65I47:/62/4EA7/K6O1R-HQ8EQEA7L*K3NPKO64IKO1QKIH5BO+38*%RZ5J3OK0$SVM2/Y6/0S50N099:NF*S2O5B RMM/A6ET%NMA%RT 9XU4$L828RDTEKDBMAUWVU9LNQK929VKHU6002XQ 2`;

function main() {
  const normalized = String(HC1)
    .trim()
    .replace(/[\r\n\t]+/g, '')
    .replace(/^(HC1:)\s+/i, '$1');

  if (!/^HC1:/i.test(normalized)) {
    throw new Error('No comienza con HC1:');
  }

  const b45 = normalized.replace(/^HC1:/i, '');
  const compressed = base45Decode(b45);
  const coseBytes = pako.inflate(compressed);

  let cose = unwrapCborTagged(cborDecode(coseBytes));
  if (!Array.isArray(cose) || cose.length < 4) throw new Error('COSE inválido');

  const payloadBytes = cose[2];
  const cwt = unwrapCborTagged(cborDecode(payloadBytes));

  console.log('CWT kind:', cwt instanceof Map ? 'Map' : typeof cwt);
  console.log('CWT keys:', summarizeKeys(cwt));

  const hcertContainer = unwrapCborTagged(getClaim(cwt, -260));
  if (hcertContainer) {
    console.log('Found claim -260 keys:', summarizeKeys(hcertContainer));
    const hcert1 = unwrapCborTagged(getClaim(hcertContainer, 1));
    console.log('Claim -260/1 type:', hcert1 instanceof Map ? 'Map' : typeof hcert1);
    console.log('Claim -260/1 keys:', summarizeKeys(hcert1));

    const hcertNeg6 = unwrapCborTagged(getClaim(hcertContainer, -6));
    console.log('Claim -260/-6 type:', hcertNeg6 instanceof Map ? 'Map' : typeof hcertNeg6);
    console.log('Claim -260/-6 keys:', summarizeKeys(hcertNeg6));
    console.log('Claim -260/-6 (preview):');
    console.dir(hcertNeg6, { depth: 6, maxArrayLength: 50 });

    const candsNeg6 = findIcvpCandidates(hcertNeg6, '$["-260"]["-6"]');
    if (candsNeg6.length) console.log('ICVPMin-like candidates under -260/-6:', candsNeg6);
  } else {
    console.log('No claim -260 present');
  }

  const candidates = findIcvpCandidates(cwt);
  console.log('ICVPMin-like candidates:', candidates);
}

main();
