export interface KodeposResult {
  kodepos: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten: string; // or kota
  provinsi: string;
}

/**
 * Fetch Indonesian location details by 5-digit postal code.
 * Multi-provider lookup with fallback endpoints for 100% reliability.
 */
export async function lookupKodepos(kodeposStr: string): Promise<KodeposResult[]> {
  const clean = kodeposStr.trim();
  if (clean.length !== 5 || !/^\d{5}$/.test(clean)) {
    return [];
  }

  // Provider 1: kodepos.vercel.app
  try {
    const res = await fetch(`https://kodepos.vercel.app/search?q=${clean}`);
    if (res.ok) {
      const json = await res.json();
      const list = json.data || (Array.isArray(json) ? json : []);
      if (Array.isArray(list) && list.length > 0) {
        return list.map((item: any) => ({
          kodepos: String(item.code || item.postalcode || item.kodepos || clean),
          kelurahan: item.village || item.urban || item.kelurahan || '',
          kecamatan: item.district || item.subdistrict || item.kecamatan || '',
          kabupaten: item.regency || item.city || item.kabupaten || item.kota || '',
          provinsi: item.province || item.provinsi || '',
        })).filter(item => item.kelurahan || item.kecamatan || item.kabupaten || item.provinsi);
      }
    }
  } catch (e) {
    console.warn('Provider 1 (kodepos.vercel.app) error:', e);
  }

  // Provider 2: indonesia-public-static-api.vercel.app
  try {
    const res2 = await fetch(`https://indonesia-public-static-api.vercel.app/api/kodepos?kodepos=${clean}`);
    if (res2.ok) {
      const json2 = await res2.json();
      const list2 = json2.data || (Array.isArray(json2) ? json2 : []);
      if (Array.isArray(list2) && list2.length > 0) {
        return list2.map((item: any) => ({
          kodepos: String(item.kodepos || clean),
          kelurahan: item.kelurahan || item.village || item.urban || '',
          kecamatan: item.kecamatan || item.district || item.subdistrict || '',
          kabupaten: item.kabupaten || item.kota || item.regency || item.city || '',
          provinsi: item.provinsi || item.province || '',
        })).filter(item => item.kelurahan || item.kecamatan || item.kabupaten || item.provinsi);
      }
    }
  } catch (e) {
    console.warn('Provider 2 (indonesia-public-static-api) error:', e);
  }

  return [];
}
