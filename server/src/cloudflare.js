const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

function headers(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function validateToken(token) {
  try {
    const res = await fetch(`${CF_API_BASE}/user/tokens/verify`, {
      headers: headers(token),
    });
    const data = await res.json();
    return { valid: data.success, result: data.result, errors: data.errors };
  } catch (err) {
    return { valid: false, errors: [{ message: err.message }] };
  }
}

async function listZones(token) {
  const zones = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const res = await fetch(`${CF_API_BASE}/zones?page=${page}&per_page=50&status=active`, {
      headers: headers(token),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.errors?.[0]?.message || 'Failed to list zones');
    zones.push(...data.result);
    totalPages = data.result_info.total_pages;
    page++;
  }

  return zones;
}

async function listDnsRecords(token, zoneId, type) {
  const records = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const params = new URLSearchParams({ per_page: '100', page: String(page) });
    if (type) params.set('type', type);

    const res = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records?${params}`, {
      headers: headers(token),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.errors?.[0]?.message || 'Failed to list records');
    records.push(...data.result);
    totalPages = data.result_info.total_pages;
    page++;
  }

  return records;
}

async function createDnsRecord(token, zoneId, { name, type, content, proxied, ttl }) {
  const res = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ name, type, content, proxied: !!proxied, ttl: ttl || 1 }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message || 'Failed to create record');
  return data.result;
}

async function updateDnsRecord(token, zoneId, recordId, { name, type, content, proxied, ttl }) {
  const res = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records/${recordId}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ name, type, content, proxied: !!proxied, ttl: ttl || 1 }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message || 'Failed to update record');
  return data.result;
}

async function deleteDnsRecord(token, zoneId, recordId) {
  const res = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records/${recordId}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message || 'Failed to delete record');
  return data.result;
}

module.exports = { validateToken, listZones, listDnsRecords, createDnsRecord, updateDnsRecord, deleteDnsRecord };
