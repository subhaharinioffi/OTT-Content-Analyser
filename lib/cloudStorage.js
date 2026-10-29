import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'czqgne9x',
  api_key: process.env.CLOUDINARY_API_KEY || '443963171659555',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'VXFDFUdd3lqVGY4d6Lyjo8uft88',
  secure: true,
});

// Container memory cache
const memoryCache = {
  reports: new Map(),
  index: null,
  lastIndexFetch: 0,
  users: null,
  lastUsersFetch: 0,
};

const INDEX_PUBLIC_ID = 'censor_reports/index_v1.json';
const USERS_INDEX_PUBLIC_ID = 'censor_auth/users_v1.json';

/**
 * Upload raw JSON to Cloudinary with explicit invalidation
 */
export async function uploadRawJson(publicId, data) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        public_id: publicId,
        overwrite: true,
        invalidate: true,
      },
      (error, result) => {
        if (error) {
          console.error('[CloudStorage] Upload error for', publicId, error);
          return reject(error);
        }
        resolve(result);
      }
    );
    uploadStream.end(Buffer.from(JSON.stringify(data)));
  });
}

/**
 * Fetch raw JSON from Cloudinary.
 * First queries Cloudinary Admin API for the exact version URL to ensure 0-second cache invalidation.
 * Falls back to direct fetch.
 */
export async function fetchRawJson(publicId) {
  // Method 1: Get exact version URL via Cloudinary API
  try {
    const resource = await cloudinary.api.resource(publicId, { resource_type: 'raw' });
    if (resource && resource.secure_url) {
      const res = await fetch(resource.secure_url);
      if (res.ok) {
        return await res.json();
      }
    }
  } catch (apiErr) {
    // Admin API fallback to direct public URL if rate limited or unauthenticated
  }

  // Method 2: Direct public URL with cache-busting timestamp
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'czqgne9x';
    const url = `https://res.cloudinary.com/${cloudName}/raw/upload/${publicId}?nocache=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn('[CloudStorage] Fetch warning for', publicId, err.message);
    return null;
  }
}

/**
 * Persist a report to Cloudinary and update the global index
 */
export async function saveReportToCloud(report) {
  try {
    const reportId = report._id?.toString() || report.id;
    const publicId = `censor_reports/report_${reportId}.json`;

    // Cache locally
    memoryCache.reports.set(reportId, report);

    // Save individual report JSON
    await uploadRawJson(publicId, report);

    // Update global index
    let currentReports = await getCloudReports();
    currentReports = currentReports.filter((r) => (r._id?.toString() || r.id) !== reportId);
    currentReports.unshift(report);

    memoryCache.index = currentReports;
    memoryCache.lastIndexFetch = Date.now();

    await uploadRawJson(INDEX_PUBLIC_ID, currentReports);
    console.log('[CloudStorage] Report persisted to cloud successfully:', reportId);
    return report;
  } catch (err) {
    console.error('[CloudStorage] Failed to save report to cloud:', err);
    return report;
  }
}

/**
 * Retrieve a single report by ID from Cloudinary
 */
export async function getCloudReportById(id) {
  if (!id) return null;

  // 1. Check in-memory container cache
  if (memoryCache.reports.has(id)) {
    return memoryCache.reports.get(id);
  }

  // 2. Fetch specific report file
  try {
    const publicId = `censor_reports/report_${id}.json`;
    const report = await fetchRawJson(publicId);
    if (report) {
      memoryCache.reports.set(id, report);
      return report;
    }
  } catch (err) {
    console.warn('[CloudStorage] getCloudReportById fetch error:', err.message);
  }

  // 3. Fallback: Search index
  try {
    const all = await getCloudReports();
    const found = all.find((r) => (r._id?.toString() || r.id) === id);
    if (found) {
      memoryCache.reports.set(id, found);
      return found;
    }
  } catch (e) {}

  return null;
}

export async function updateCloudReportsIndex(reports) {
  memoryCache.index = Array.isArray(reports) ? reports : [];
  memoryCache.lastIndexFetch = Date.now();
  await uploadRawJson(INDEX_PUBLIC_ID, memoryCache.index);
  return memoryCache.index;
}

/**
 * Retrieve all reports from Cloudinary index
 */
export async function getCloudReports() {
  const now = Date.now();
  if (memoryCache.index && now - memoryCache.lastIndexFetch < 5000) {
    return memoryCache.index;
  }

  try {
    const cloudIndex = await fetchRawJson(INDEX_PUBLIC_ID);
    if (Array.isArray(cloudIndex)) {
      memoryCache.index = cloudIndex;
      memoryCache.lastIndexFetch = now;
      return cloudIndex;
    }
  } catch (err) {
    console.warn('[CloudStorage] getCloudReports fetch error:', err.message);
  }

  return memoryCache.index || [];
}

/**
 * Retrieve all registered users from Cloudinary with 0 stale cache
 */
export async function getCloudUsers() {
  const now = Date.now();
  if (memoryCache.users && now - memoryCache.lastUsersFetch < 2000) {
    return memoryCache.users;
  }

  try {
    const cloudUsers = await fetchRawJson(USERS_INDEX_PUBLIC_ID);
    if (Array.isArray(cloudUsers)) {
      memoryCache.users = cloudUsers;
      memoryCache.lastUsersFetch = now;
      return cloudUsers;
    }
  } catch (err) {
    console.warn('[CloudStorage] getCloudUsers fetch error:', err.message);
  }

  return memoryCache.users || [];
}

/**
 * Save user to Cloudinary global user database
 */
export async function saveUserToCloud(user) {
  try {
    let users = await getCloudUsers();
    const userEmail = (user.email || '').toLowerCase().trim();
    const userUname = (user.username || user.name || '').toLowerCase().trim();

    // Filter out if user already exists
    users = users.filter((u) => {
      const uEmail = (u.email || '').toLowerCase().trim();
      const uUname = (u.username || u.name || '').toLowerCase().trim();
      const sameId = (u.id && u.id === user.id) || (u._id && u._id === user._id);
      return uEmail !== userEmail && uUname !== userUname && !sameId;
    });

    users.push(user);
    memoryCache.users = users;
    memoryCache.lastUsersFetch = Date.now();

    await uploadRawJson(USERS_INDEX_PUBLIC_ID, users);
    console.log('[CloudStorage] User persisted to cloud successfully:', userEmail || userUname);
    return user;
  } catch (err) {
    console.error('[CloudStorage] Failed to save user to cloud:', err);
    return user;
  }
}
