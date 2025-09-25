// Centraliza configuración del módulo ICVP/IPS clon.
// En producción, reemplazar estos valores vía variables de entorno y proceso de build.
// Se soporta override mediante window.__MFE_CONFIG__ si existe.

const globalCfg = (typeof window !== 'undefined' && window.__MFE_CONFIG__) || {};

export const ICVP_CONFIG = {
  REGIONAL_BASE: globalCfg.ICVP_REGIONAL_BASE || process.env.ICVP_REGIONAL_BASE || 'https://10.68.174.206:5000/regional',
  BASIC_USER: globalCfg.ICVP_BASIC_USER || process.env.ICVP_BASIC_USER || 'mediator-proxy@openhim.org',
  BASIC_PASS: globalCfg.ICVP_BASIC_PASS || process.env.ICVP_BASIC_PASS || 'Lopior.123',
  VHL_ISSUANCE_URL: globalCfg.ICVP_VHL_ISSUANCE_URL || process.env.ICVP_VHL_ISSUANCE_URL || 'https://10.68.174.206:5000/vhl/_generate',
  VHL_RESOLVE_URL: globalCfg.ICVP_VHL_RESOLVE_URL || process.env.ICVP_VHL_RESOLVE_URL || 'https://10.68.174.206:5000/vhl/_resolve',
  ICVP_BASE: globalCfg.ICVP_BASE || process.env.ICVP_BASE || 'http://10.68.174.221:3000'
};

export function buildBasicAuth() {
  const { BASIC_USER, BASIC_PASS } = ICVP_CONFIG;
  if (typeof btoa === 'function') {
    return 'Basic ' + btoa(`${BASIC_USER}:${BASIC_PASS}`);
  }
  return '';
}
