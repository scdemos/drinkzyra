import { createTag } from '../../scripts/shared.js';

const MAP = 'https://www.openstreetmap.org/export/embed.html';
const ALBERTA = { lat: 53.5461, lng: -113.4938 };

function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

const point = (s) => ({ lat: Number(s.lat), lng: Number(s.lng) });

function mapSrc(loc) {
  const box = [loc.lng - 0.05, loc.lat - 0.03, loc.lng + 0.05, loc.lat + 0.03].join(',');
  return `${MAP}?bbox=${box}&layer=mapnik&marker=${loc.lat},${loc.lng}`;
}

function buildStore(store) {
  const li = createTag('li', { class: 'store' });
  li.dataset.search = `${store.name} ${store.address}`.toLowerCase();
  li.dataset.type = store.type;
  li.append(createTag('h2', { class: 'store-name' }, store.name));
  li.append(createTag('address', { class: 'store-address' }, store.address));
  if (store.carries) li.append(createTag('p', { class: 'store-carries' }, store.carries));
  const meta = createTag('dl', { class: 'store-meta' });
  if (store.hours) meta.append(createTag('dt', {}, 'Hours'), createTag('dd', {}, store.hours));
  if (store.phone) {
    const tel = createTag('a', { href: `tel:${store.phone.replace(/\D/g, '')}` }, store.phone);
    meta.append(createTag('dt', {}, 'Phone'), createTag('dd', {}, tel));
  }
  if (meta.children.length) li.append(meta);
  const q = encodeURIComponent(`${store.name}, ${store.address}`);
  li.append(createTag('a', {
    class: 'store-directions',
    href: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    target: '_blank',
    rel: 'noopener',
  }, 'Get directions ↗'));
  return li;
}

/**
 * Store locator. Row 1 = link to a sheet (/stores.json) with columns
 * name, type, address, carries, hours, phone, lat, lng.
 * @param {Element} block
 */
export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link ? new URL(link.href, window.location).pathname : '';
  block.textContent = '';
  let stores = [];
  try {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error(`${resp.status}`);
    stores = (await resp.json()).data || [];
  } catch (e) {
    block.append(createTag('p', { class: 'store-status', role: 'status' }, 'Store list is unavailable right now.'));
    return;
  }

  const search = createTag('input', {
    type: 'search', name: 'q', placeholder: 'Search stores by name or city', 'aria-label': 'Search stores by name or city',
  });
  const type = createTag('select', { 'aria-label': 'Filter by category' });
  [['', 'All'], ['retail', 'Stores'], ['club', 'Clubs']].forEach(([v, t]) => type.append(createTag('option', { value: v }, t)));
  const near = createTag('button', { type: 'button', class: 'store-near' }, 'Use my location');
  const count = createTag('p', { class: 'store-count', 'aria-live': 'polite' });
  const filters = createTag('div', { class: 'store-filters' });
  filters.append(search, type, near, count);

  const frame = createTag('iframe', {
    class: 'store-map', title: 'Map of stores', loading: 'lazy', src: mapSrc(stores[0] ? point(stores[0]) : ALBERTA),
  });
  const list = createTag('ul', { class: 'store-list' });
  const items = stores.map((s) => ({ s, li: buildStore(s) }));
  items.forEach(({ s, li }) => {
    li.addEventListener('click', (e) => {
      if (!e.target.closest('a')) frame.src = mapSrc(point(s));
    });
    list.append(li);
  });

  const apply = () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    items.forEach(({ li }) => {
      const ok = (!q || li.dataset.search.includes(q)) && (!type.value || li.dataset.type === type.value);
      li.hidden = !ok;
      if (ok) shown += 1;
    });
    count.textContent = `${shown} ${shown === 1 ? 'store' : 'stores'}`;
  };
  search.addEventListener('input', apply);
  type.addEventListener('change', apply);
  near.addEventListener('click', () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const here = { lat: coords.latitude, lng: coords.longitude };
      const sorted = items
        .map((it) => ({ ...it, d: distanceKm(here, point(it.s)) }))
        .sort((x, y) => x.d - y.d);
      sorted.forEach(({ li }) => list.append(li));
      if (sorted[0]) frame.src = mapSrc(point(sorted[0].s));
    });
  });

  const body = createTag('div', { class: 'store-body' });
  body.append(frame, list);
  block.append(filters, body);
  apply();
}
