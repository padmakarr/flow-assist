'use strict';

/**
 * Full accessibility tree via Chrome DevTools Protocol (Electron Playwright `Page` has no `page.accessibility`).
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function snapshotAxTreeViaCdp(page) {
  const client = await page.context().newCDPSession(page);
  try {
    await client.send('Accessibility.enable');
    const { nodes } = await client.send('Accessibility.getFullAXTree');
    return buildAxTreeFromCdpNodes(nodes);
  } finally {
    await client.detach().catch(() => {});
  }
}

/** @param {unknown} axv */
function axValue(axv) {
  if (axv == null) return undefined;
  if (typeof axv === 'string') return axv;
  if (typeof axv === 'object' && axv !== null && 'value' in axv) {
    const v = /** @type {{ value?: unknown }} */ (axv).value;
    return v == null ? undefined : String(v);
  }
  return undefined;
}

/**
 * @param {Array<Record<string, unknown>>} nodes
 * @returns {Record<string, unknown> | null}
 */
function buildAxTreeFromCdpNodes(nodes) {
  if (!nodes || !nodes.length) return null;

  const byId = new Map();
  for (const n of nodes) {
    const id = n.nodeId;
    if (typeof id === 'string') byId.set(id, n);
  }

  /**
   * @param {string} nodeId
   * @param {Set<string>} visiting
   */
  function build(nodeId, visiting) {
    if (visiting.has(nodeId)) return null;
    visiting.add(nodeId);
    const n = byId.get(nodeId);
    if (!n) {
      visiting.delete(nodeId);
      return null;
    }

    const role = axValue(n.role);
    const name = axValue(n.name);
    const value = axValue(n.value);
    const description = axValue(n.description);

    const childIds = Array.isArray(n.childIds) ? n.childIds.filter((x) => typeof x === 'string') : [];
    const children = [];
    for (const cid of childIds) {
      const sub = build(cid, visiting);
      if (sub) children.push(sub);
    }
    visiting.delete(nodeId);

    /** @type {Record<string, unknown>} */
    const out = { role, name };
    if (value) out.value = value;
    if (description) out.description = description;
    if (n.ignored === true) out.ignored = true;
    if (children.length) out.children = children;
    return out;
  }

  const root =
    nodes.find((n) => !n.ignored && axValue(n.role) === 'WebView') ||
    nodes.find((n) => !n.ignored && axValue(n.role) === 'RootWebArea') ||
    nodes[0];

  const rid = root && typeof root.nodeId === 'string' ? root.nodeId : null;
  if (!rid) return null;
  return build(rid, new Set());
}

module.exports = { snapshotAxTreeViaCdp };
