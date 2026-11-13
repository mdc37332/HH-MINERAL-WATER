/**
 * Safe local storage utility with automatic QuotaExceededError protection,
 * intelligent cache eviction, and payload sanitization.
 */

import { DEFAULT_BOTTLE_IMAGE, DEFAULT_HERO_IMAGE, isDeadOrDoctorImage } from '../data/bottlePresets';

// Fallback image for oversized base64 products in local storage (tested, active 200 OK)
const FALLBACK_BOTTLE_IMAGE = DEFAULT_BOTTLE_IMAGE;

/**
 * Sanitize product data for local storage caching by replacing oversized base64 strings
 * with lightweight URL references, preventing 5MB quota exhaustion.
 * Allows standard uploaded product photos (up to 600KB base64) to be preserved without wiping.
 */
export function sanitizeProductsForCache(products: any[]): any[] {
  if (!Array.isArray(products)) return [];
  return products.map(p => {
    if (!p || typeof p !== 'object') return p;
    const copy = { ...p };

    // Only replace truly gigantic base64 (>600KB) in local cache to protect localStorage 5MB quota
    if (typeof copy.image === 'string' && copy.image.startsWith('data:') && copy.image.length > 600000) {
      copy.image = FALLBACK_BOTTLE_IMAGE;
    }

    // Strip excessively heavy base64 from images / galleryImages in local cache
    if (Array.isArray(copy.images)) {
      copy.images = copy.images.map((img: any) => {
        if (typeof img === 'string' && img.startsWith('data:') && img.length > 600000) {
          return FALLBACK_BOTTLE_IMAGE;
        }
        return img;
      });
    }
    if (Array.isArray(copy.galleryImages)) {
      copy.galleryImages = copy.galleryImages.map((img: any) => {
        if (typeof img === 'string' && img.startsWith('data:') && img.length > 600000) {
          return FALLBACK_BOTTLE_IMAGE;
        }
        return img;
      });
    }

    // Never cache giant base64 video in local storage
    if (typeof copy.videoUrl === 'string' && copy.videoUrl.startsWith('data:') && copy.videoUrl.length > 50000) {
      copy.videoUrl = undefined;
    }

    return copy;
  });
}

/**
 * Sanitize audit logs for local storage caching by capping count and truncating huge strings.
 */
export function sanitizeAuditLogsForCache(logs: any[], maxCount = 40): any[] {
  if (!Array.isArray(logs)) return [];
  return logs.slice(0, maxCount).map(log => {
    if (!log || typeof log !== 'object') return log;
    const copy = { ...log };

    if (typeof copy.oldValue === 'string' && copy.oldValue.length > 150) {
      copy.oldValue = copy.oldValue.startsWith('data:')
        ? '[Base64 Image Data]'
        : copy.oldValue.substring(0, 140) + '... (truncated)';
    }

    if (typeof copy.newValue === 'string' && copy.newValue.length > 150) {
      copy.newValue = copy.newValue.startsWith('data:')
        ? '[Base64 Image Data]'
        : copy.newValue.substring(0, 140) + '... (truncated)';
    }

    return copy;
  });
}

/**
 * Sanitize orders for local storage caching to avoid base64 custom uploads causing QuotaExceededError.
 */
export function sanitizeOrdersForCache(orders: any[], maxCount = 50): any[] {
  if (!Array.isArray(orders)) return [];
  return orders.slice(0, maxCount).map(order => {
    if (!order || typeof order !== 'object') return order;
    const copy = { ...order };
    if (Array.isArray(copy.items)) {
      copy.items = copy.items.map((item: any) => {
        if (!item || typeof item !== 'object') return item;
        const itemCopy = { ...item };
        if (itemCopy.customDetails) {
          const cd = { ...itemCopy.customDetails };
          if (Array.isArray(cd.uploadedImages)) {
            cd.uploadedImages = cd.uploadedImages.map((img: any) => {
              if (typeof img?.url === 'string' && img.url.startsWith('data:') && img.url.length > 50000) {
                return { ...img, url: '[Saved in Database]' };
              }
              return img;
            });
          }
          if (Array.isArray(cd.uploadedVideos)) {
            cd.uploadedVideos = cd.uploadedVideos.map((vid: any) => {
              if (typeof vid?.url === 'string' && vid.url.startsWith('data:') && vid.url.length > 20000) {
                return { ...vid, url: '[Saved in Database]' };
              }
              return vid;
            });
          }
          if (typeof cd.adminProofImage === 'string' && cd.adminProofImage.startsWith('data:') && cd.adminProofImage.length > 50000) {
            cd.adminProofImage = '[Saved in Database]';
          }
          itemCopy.customDetails = cd;
        }
        return itemCopy;
      });
    }
    return copy;
  });
}

/**
 * Perform one-time cleanup of existing bloated keys on startup.
 */
export function cleanStorageBloat(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    // 1. Check and clean product audit logs
    const rawAudit = localStorage.getItem('hh_mineral_prod_audit_v1');
    if (rawAudit) {
      try {
        const parsed = JSON.parse(rawAudit);
        if (Array.isArray(parsed)) {
          // If size is too large or too many items, prune down
          if (rawAudit.length > 50000 || parsed.length > 30) {
            const clean = sanitizeAuditLogsForCache(parsed, 20);
            try {
              localStorage.setItem('hh_mineral_prod_audit_v1', JSON.stringify(clean));
            } catch {
              localStorage.removeItem('hh_mineral_prod_audit_v1');
            }
          }
        } else {
          localStorage.removeItem('hh_mineral_prod_audit_v1');
        }
      } catch {
        localStorage.removeItem('hh_mineral_prod_audit_v1');
      }
    }

    // 2. Check and clean products cache only if truly near quota exhaustion (>3MB)
    const rawProducts = localStorage.getItem('hh_mineral_products_v1');
    if (rawProducts && rawProducts.length > 3000000) {
      try {
        const parsed = JSON.parse(rawProducts);
        if (Array.isArray(parsed)) {
          const clean = sanitizeProductsForCache(parsed);
          try {
            localStorage.setItem('hh_mineral_products_v1', JSON.stringify(clean));
          } catch {
            localStorage.removeItem('hh_mineral_products_v1');
          }
        }
      } catch {
        localStorage.removeItem('hh_mineral_products_v1');
      }
    }

    // 3. Heal dead hero media or broken URLs in cached admin settings
    const rawSettings = localStorage.getItem('hh_mineral_admin_settings_v1');
    if (rawSettings) {
      try {
        const parsedSettings = JSON.parse(rawSettings);
        if (parsedSettings && typeof parsedSettings === 'object') {
          let settingsModified = false;
          if (isDeadOrDoctorImage(parsedSettings.heroBannerImage)) {
            parsedSettings.heroBannerImage = DEFAULT_HERO_IMAGE;
            settingsModified = true;
          }
          if (parsedSettings.heroBannerVideo && parsedSettings.heroBannerVideo.includes('coverr.co')) {
            parsedSettings.heroBannerVideo = 'https://vjs.zencdn.net/v/oceans.mp4';
            settingsModified = true;
          }
          if (settingsModified) {
            localStorage.setItem('hh_mineral_admin_settings_v1', JSON.stringify(parsedSettings));
          }
        }
      } catch {}
    }

    // 4. Clean legacy keys if any
    localStorage.removeItem('hh_products_v1');
  } catch (err) {
    console.warn('[Storage] Clean bloat non-fatal notice:', err);
  }
}

// Auto-run cleanup once on module execution
cleanStorageBloat();

export const safeStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;

    // Pre-sanitize known high-volume keys before attempting write
    let payload = value;
    if (key === 'hh_mineral_prod_audit_v1') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          payload = JSON.stringify(sanitizeAuditLogsForCache(parsed, 30));
        }
      } catch {}
    } else if (key === 'hh_mineral_products_v1') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          payload = JSON.stringify(sanitizeProductsForCache(parsed));
        }
      } catch {}
    } else if (key === 'hh_mineral_orders_v1' || key === 'hh_orders') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          payload = JSON.stringify(sanitizeOrdersForCache(parsed, 40));
        }
      } catch {}
    } else if (key === 'hh_mineral_admin_settings_v1') {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object') {
          const copy = { ...parsed };
          // Omit heavy base64 video (>100KB) from localStorage cache to prevent QuotaExceededError.
          // The full video is safely preserved in PostgreSQL and retrieved via /api/settings.
          if (
            typeof copy.heroBannerVideo === 'string' &&
            copy.heroBannerVideo.startsWith('data:') &&
            copy.heroBannerVideo.length > 100000
          ) {
            copy.heroBannerVideo = '';
          }
          payload = JSON.stringify(copy);
        }
      } catch {}
    }

    try {
      localStorage.setItem(key, payload);
      return true;
    } catch (err: any) {
      const isQuota =
        err?.name === 'QuotaExceededError' ||
        err?.code === 22 ||
        err?.code === 1014 ||
        err?.number === -2147024882 ||
        (typeof err?.message === 'string' && err.message.toLowerCase().includes('quota'));

      if (isQuota) {
        console.warn(`[safeStorage] QuotaExceededError on key "${key}". Running emergency eviction.`);
        try {
          // Evict dispensable high-volume cache keys
          localStorage.removeItem('hh_mineral_prod_audit_v1');
          localStorage.removeItem('hh_mineral_invoices_v1');

          // If products, clean aggressively
          if (key === 'hh_mineral_products_v1') {
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) {
                const ultraClean = parsed.map(p => ({
                  ...p,
                  image: (typeof p.image === 'string' && p.image.startsWith('data:')) ? FALLBACK_BOTTLE_IMAGE : p.image,
                  images: [],
                  galleryImages: [],
                  videoUrl: undefined,
                }));
                localStorage.setItem(key, JSON.stringify(ultraClean));
                return true;
              }
            } catch {}
          } else if (key === 'hh_mineral_prod_audit_v1') {
            // Keep minimal 10 logs
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) {
                const tiny = sanitizeAuditLogsForCache(parsed, 10);
                localStorage.setItem(key, JSON.stringify(tiny));
                return true;
              }
            } catch {}
            return false;
          }

          // Retry writing
          localStorage.setItem(key, payload);
          return true;
        } catch (retryErr) {
          console.warn(`[safeStorage] Retry after eviction failed for "${key}":`, retryErr);
          return false;
        }
      }

      console.warn(`[safeStorage] Write failed for "${key}":`, err);
      return false;
    }
  },

  removeItem(key: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.removeItem(key);
    } catch {}
  }
};
