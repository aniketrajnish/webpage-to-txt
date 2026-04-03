// safari: requires $99/year apple developer program to publish on app store.
// local testing is free — run ./convert-to-safari.sh, build in xcode, enable in safari settings.

function extractContent(mode) {
  var INCLUDED = {
    'h1':1,'h2':1,'h3':1,'h4':1,'h5':1,'h6':1,
    'p':1,'a':1,'ul':1,'ol':1,'li':1,'img':1,
    'pre':1,'code':1,'blockquote':1,
    'table':1,'thead':1,'tbody':1,'tr':1,'th':1,'td':1,
    'strong':1,'em':1,'b':1,'i':1
  };
  var EXCLUDED = {
    'script':1,'style':1,'noscript':1,'meta':1,'link':1,'head':1
  };

  function isHidden(el) {
    if (mode !== 'visible') return false;
    if (el.hidden || (el.hasAttribute && el.hasAttribute('hidden'))) return true;
    try {
      var style = window.getComputedStyle(el);
      if (style) {
        if (style.display === 'none') return true;
        if (style.visibility === 'hidden') return true;
        if (style.opacity === '0') return true;
      }
    } catch (e) {}
    if (typeof el.getBoundingClientRect === 'function') {
      try {
        var rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0 && el.offsetWidth === 0 && el.offsetHeight === 0) {
          var bodyRect = document.body.getBoundingClientRect();
          if (bodyRect.width > 0 || bodyRect.height > 0) return true;
        }
      } catch (e) {}
    }
    return false;
  }

  function walk(node) {
    if (node.nodeType === 3) { var text = node.textContent; return text ? text : ''; }
    if (node.nodeType !== 1) return '';
    var tag = node.tagName.toLowerCase();
    if (EXCLUDED[tag]) return '';
    if (isHidden(node)) return '';
    var childContent = '';
    var children = node.childNodes;
    for (var i = 0; i < children.length; i++) childContent += walk(children[i]);
    if (INCLUDED[tag]) {
      if (tag === 'img') {
        var attrs = '';
        if (node.getAttribute('src')) attrs += ' src="' + node.getAttribute('src') + '"';
        if (node.getAttribute('alt')) attrs += ' alt="' + node.getAttribute('alt') + '"';
        return '<img' + attrs + '>';
      }
      if (tag === 'a') { var href = node.getAttribute('href') || ''; return '<a href="' + href + '">' + childContent + '</a>'; }
      return '<' + tag + '>' + childContent + '</' + tag + '>';
    }
    return childContent;
  }

  var root = document.body;
  if (!root) return '';
  return walk(root);
}

function htmlToMarkdown(html) {
  if (!html || !html.trim()) return '';
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, 'text/html');

  function getTextContent(node) {
    var result = '';
    for (var i = 0; i < node.childNodes.length; i++) {
      var child = node.childNodes[i];
      if (child.nodeType === 3) result += child.textContent;
      else if (child.nodeType === 1) result += walkNode(child);
    }
    return result;
  }

  function walkNode(node) {
    if (node.nodeType === 3) return node.textContent.replace(/\s+/g, ' ');
    if (node.nodeType !== 1) return '';
    var tag = node.tagName.toLowerCase();
    if (/^h([1-6])$/.test(tag)) { var level = parseInt(tag.charAt(1), 10); var prefix = ''; for (var h = 0; h < level; h++) prefix += '#'; var ht = getTextContent(node).trim(); return ht ? prefix + ' ' + ht + '\n\n' : ''; }
    if (tag === 'p') { var pT = getTextContent(node).trim(); return pT ? pT + '\n\n' : ''; }
    if (tag === 'a') { var lt = getTextContent(node).trim(); var hr = node.getAttribute('href') || ''; return lt ? '[' + lt + '](' + hr + ')' : ''; }
    if (tag === 'img') { return '![' + (node.getAttribute('alt') || '') + '](' + (node.getAttribute('src') || '') + ')'; }
    if (tag === 'ul') { var ulR = ''; var ulI = node.children; for (var u = 0; u < ulI.length; u++) { if (ulI[u].tagName && ulI[u].tagName.toLowerCase() === 'li') { var lic = getTextContent(ulI[u]).trim(); if (lic) ulR += '- ' + lic + '\n'; } } return ulR ? ulR + '\n' : ''; }
    if (tag === 'ol') { var olR = '', olN = 1, olI = node.children; for (var o = 0; o < olI.length; o++) { if (olI[o].tagName && olI[o].tagName.toLowerCase() === 'li') { var olc = getTextContent(olI[o]).trim(); if (olc) { olR += olN + '. ' + olc + '\n'; olN++; } } } return olR ? olR + '\n' : ''; }
    if (tag === 'pre') { var cc = node.querySelector('code'); var ct = cc ? cc.textContent : node.textContent; ct = ct.replace(/^\n+|\n+$/g, ''); return '```\n' + ct + '\n```\n\n'; }
    if (tag === 'code') { if (node.parentNode && node.parentNode.tagName && node.parentNode.tagName.toLowerCase() === 'pre') return node.textContent; return '`' + node.textContent + '`'; }
    if (tag === 'blockquote') { var bqT = getTextContent(node).trim(); if (!bqT) return ''; var bqL = bqT.split('\n'), bqR = ''; for (var bq = 0; bq < bqL.length; bq++) bqR += '> ' + bqL[bq].trim() + '\n'; return bqR + '\n'; }
    if (tag === 'table') { var rows = [], allR = node.querySelectorAll('tr'); for (var r = 0; r < allR.length; r++) { var cells = allR[r].querySelectorAll('th, td'); var row = []; for (var c = 0; c < cells.length; c++) row.push(getTextContent(cells[c]).trim()); rows.push(row); } if (rows.length === 0) return ''; var tR = '| ' + rows[0].join(' | ') + ' |\n', sep = '|'; for (var s = 0; s < rows[0].length; s++) sep += ' --- |'; tR += sep + '\n'; for (var d = 1; d < rows.length; d++) tR += '| ' + rows[d].join(' | ') + ' |\n'; return tR + '\n'; }
    if (tag === 'strong' || tag === 'b') { var bt = getTextContent(node).trim(); return bt ? '**' + bt + '**' : ''; }
    if (tag === 'em' || tag === 'i') { var it = getTextContent(node).trim(); return it ? '*' + it + '*' : ''; }
    if (tag === 'li' || tag === 'thead' || tag === 'tbody' || tag === 'tr' || tag === 'th' || tag === 'td') return getTextContent(node);
    return getTextContent(node);
  }

  var body = doc.body;
  if (!body) return '';
  var output = getTextContent(body);
  output = output.replace(/\n{3,}/g, '\n\n');
  return output.trim() + '\n';
}

function htmlToPlainText(html) {
  if (!html || !html.trim()) return '';
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, 'text/html');

  function getText(node) {
    var result = '';
    for (var i = 0; i < node.childNodes.length; i++) {
      var child = node.childNodes[i];
      if (child.nodeType === 3) result += child.textContent;
      else if (child.nodeType === 1) result += walkPlain(child);
    }
    return result;
  }

  function walkPlain(node) {
    if (node.nodeType === 3) return node.textContent.replace(/\s+/g, ' ');
    if (node.nodeType !== 1) return '';
    var tag = node.tagName.toLowerCase();
    if (/^h([1-6])$/.test(tag)) { var hT = getText(node).trim(); return hT ? hT.toUpperCase() + '\n\n' : ''; }
    if (tag === 'p') { var pT = getText(node).trim(); return pT ? pT + '\n\n' : ''; }
    if (tag === 'a') { var lt = getText(node).trim(); var hr = node.getAttribute('href') || ''; if (!lt) return ''; return hr ? lt + ' (' + hr + ')' : lt; }
    if (tag === 'img') { return '[image: ' + (node.getAttribute('alt') || '') + ']'; }
    if (tag === 'ul') { var ulR = ''; var ulI = node.children; for (var u = 0; u < ulI.length; u++) { if (ulI[u].tagName && ulI[u].tagName.toLowerCase() === 'li') { var liT = getText(ulI[u]).trim(); if (liT) ulR += '- ' + liT + '\n'; } } return ulR ? ulR + '\n' : ''; }
    if (tag === 'ol') { var olR = '', olN = 1, olI = node.children; for (var o = 0; o < olI.length; o++) { if (olI[o].tagName && olI[o].tagName.toLowerCase() === 'li') { var oT = getText(olI[o]).trim(); if (oT) { olR += olN + '. ' + oT + '\n'; olN++; } } } return olR ? olR + '\n' : ''; }
    if (tag === 'pre') { var cc = node.querySelector('code'); var ct = cc ? cc.textContent : node.textContent; ct = ct.replace(/^\n+|\n+$/g, ''); var lines = ct.split('\n'), ind = ''; for (var cl = 0; cl < lines.length; cl++) ind += '    ' + lines[cl] + '\n'; return ind + '\n'; }
    if (tag === 'code') { if (node.parentNode && node.parentNode.tagName && node.parentNode.tagName.toLowerCase() === 'pre') return node.textContent; return node.textContent; }
    if (tag === 'blockquote') { var bqT = getText(node).trim(); if (!bqT) return ''; var bqL = bqT.split('\n'), bqR = ''; for (var bq = 0; bq < bqL.length; bq++) bqR += '> ' + bqL[bq].trim() + '\n'; return bqR + '\n'; }
    if (tag === 'table') { var rows = [], allR = node.querySelectorAll('tr'); for (var r = 0; r < allR.length; r++) { var cells = allR[r].querySelectorAll('th, td'); var row = []; for (var c = 0; c < cells.length; c++) row.push(getText(cells[c]).trim()); rows.push(row.join('\t')); } return rows.join('\n') + '\n\n'; }
    if (tag === 'strong' || tag === 'b' || tag === 'em' || tag === 'i') return getText(node);
    if (tag === 'li' || tag === 'thead' || tag === 'tbody' || tag === 'tr' || tag === 'th' || tag === 'td') return getText(node);
    return getText(node);
  }

  var body = doc.body;
  if (!body) return '';
  var output = getText(body);
  output = output.replace(/\n{3,}/g, '\n\n');
  output = output.replace(/^\n+/, '').replace(/\s+$/, '');
  return output + '\n';
}

function htmlToJson(html, pageTitle, pageUrl, mode) {
  if (!html || !html.trim()) {
    return JSON.stringify({ title: pageTitle || '', url: pageUrl || '', extractionMode: mode || 'all', content: [] }, null, 2);
  }
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, 'text/html');
  var content = [];

  function getPlainText(node) {
    var result = '';
    for (var i = 0; i < node.childNodes.length; i++) {
      var child = node.childNodes[i];
      if (child.nodeType === 3) result += child.textContent;
      else if (child.nodeType === 1) result += getPlainText(child);
    }
    return result;
  }

  function walkJson(node) {
    if (node.nodeType !== 1) return;
    var tag = node.tagName.toLowerCase();
    if (/^h([1-6])$/.test(tag)) { var level = parseInt(tag.charAt(1), 10); var text = getPlainText(node).trim(); if (text) content.push({ type: 'heading', level: level, text: text }); return; }
    if (tag === 'p') { var pT = getPlainText(node).trim(); if (pT) content.push({ type: 'paragraph', text: pT }); return; }
    if (tag === 'a') { var lt = getPlainText(node).trim(); var hr = node.getAttribute('href') || ''; if (lt) content.push({ type: 'link', text: lt, url: hr }); return; }
    if (tag === 'img') { content.push({ type: 'image', alt: node.getAttribute('alt') || '', src: node.getAttribute('src') || '' }); return; }
    if (tag === 'ul' || tag === 'ol') { var ordered = tag === 'ol'; var items = []; var li = node.children; for (var l = 0; l < li.length; l++) { if (li[l].tagName && li[l].tagName.toLowerCase() === 'li') { var iT = getPlainText(li[l]).trim(); if (iT) items.push(iT); } } if (items.length > 0) content.push({ type: 'list', ordered: ordered, items: items }); return; }
    if (tag === 'pre') { var cc = node.querySelector('code'); var ct = cc ? cc.textContent : node.textContent; ct = ct.replace(/^\n+|\n+$/g, ''); content.push({ type: 'code', language: '', text: ct }); return; }
    if (tag === 'blockquote') { var bqT = getPlainText(node).trim(); if (bqT) content.push({ type: 'blockquote', text: bqT }); return; }
    if (tag === 'table') { var headers = [], dataRows = [], allR = node.querySelectorAll('tr'); for (var r = 0; r < allR.length; r++) { var thC = allR[r].querySelectorAll('th'); if (thC.length > 0 && headers.length === 0) { for (var th = 0; th < thC.length; th++) headers.push(getPlainText(thC[th]).trim()); } else { var cells = allR[r].querySelectorAll('th, td'); var row = []; for (var c = 0; c < cells.length; c++) row.push(getPlainText(cells[c]).trim()); if (row.length > 0) dataRows.push(row); } } content.push({ type: 'table', headers: headers, rows: dataRows }); return; }
    for (var i = 0; i < node.childNodes.length; i++) walkJson(node.childNodes[i]);
  }

  var body = doc.body;
  if (body) { for (var i = 0; i < body.childNodes.length; i++) walkJson(body.childNodes[i]); }
  return JSON.stringify({ title: pageTitle || '', url: pageUrl || '', extractionMode: mode || 'all', content: content }, null, 2);
}

function sanitizeFilename(title, format) {
  var name = (title || '').replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
  if (!name) name = 'download';
  return name + '.' + format;
}

function downloadFile(content, pageTitle, format) {
  var mimeTypes = { md: 'text/markdown', txt: 'text/plain', json: 'application/json' };
  var mime = mimeTypes[format] || 'text/plain';
  var filename = sanitizeFilename(pageTitle, format);
  var blob = new Blob([content], { type: mime });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function copyToClipboard(content) {
  var statusEl = document.getElementById('status');
  try {
    await navigator.clipboard.writeText(content);
    statusEl.textContent = 'status: copied';
    statusEl.className = 'status success';
  } catch (e) {
    statusEl.textContent = 'status: copy failed';
    statusEl.className = 'status error';
    setTimeout(function() {
      statusEl.textContent = 'status: ready';
      statusEl.className = 'status';
    }, 3000);
  }
}

// --- State variables ---
window.cachedHtml = '';
window.cachedTitle = '';
window.cachedUrl = '';
window.currentMode = 'all';
window.currentFormat = 'txt';

function formatOutput() {
  var html = window.cachedHtml;
  var fmt = window.currentFormat;
  if (!html) return '';
  if (fmt === 'md') return htmlToMarkdown(html);
  if (fmt === 'txt') return htmlToPlainText(html);
  if (fmt === 'json') return htmlToJson(html, window.cachedTitle, window.cachedUrl, window.currentMode);
  return htmlToMarkdown(html);
}

function updateButtonStates() {
  var btnDownload = document.getElementById('btn-download');
  var btnCopy = document.getElementById('btn-copy');
  var empty = !window.cachedHtml;
  btnDownload.disabled = empty;
  btnCopy.disabled = empty;
}

function setActiveButton(groupId, dataAttr, value) {
  var group = document.getElementById(groupId);
  if (!group) return;
  var buttons = group.querySelectorAll('button');
  for (var i = 0; i < buttons.length; i++) {
    if (buttons[i].getAttribute(dataAttr) === value) buttons[i].classList.add('active');
    else buttons[i].classList.remove('active');
  }
}

async function injectAndProcess() {
  var statusEl = document.getElementById('status');
  var outputEl = document.getElementById('output');
  statusEl.textContent = 'status: extracting...';
  statusEl.className = 'status';
  try {
    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || !tabs.length) { statusEl.textContent = 'status: cannot access this page'; statusEl.className = 'status error'; outputEl.value = ''; window.cachedHtml = ''; updateButtonStates(); return; }
    var tab = tabs[0];
    window.cachedTitle = tab.title || '';
    window.cachedUrl = tab.url || '';
    var results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractContent, args: [window.currentMode] });
    var extracted = (results && results[0] && results[0].result) || '';
    window.cachedHtml = extracted;
    if (!extracted) { statusEl.textContent = 'status: no content found'; statusEl.className = 'status'; outputEl.value = ''; updateButtonStates(); return; }
    outputEl.value = formatOutput();
    updateButtonStates();
    statusEl.textContent = 'status: ready';
    statusEl.className = 'status';
  } catch (e) {
    statusEl.textContent = 'status: cannot access this page';
    statusEl.className = 'status error';
    outputEl.value = '';
    window.cachedHtml = '';
    updateButtonStates();
  }
}

// --- Theme detection ---
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.setAttribute('data-theme', 'dark');
}

// --- Event handlers (guarded for non-popup contexts like tests) ---
var modeToggle = document.getElementById('mode-toggle');
var formatSelector = document.getElementById('format-selector');
var btnDownload = document.getElementById('btn-download');
var btnCopy = document.getElementById('btn-copy');

if (modeToggle) modeToggle.addEventListener('click', function(e) {
  var btn = e.target.closest('button');
  if (!btn || !btn.dataset.mode) return;
  var newMode = btn.dataset.mode;
  if (newMode === window.currentMode) return;
  window.currentMode = newMode;
  setActiveButton('mode-toggle', 'data-mode', newMode);
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting) injectAndProcess();
});

if (formatSelector) formatSelector.addEventListener('click', function(e) {
  var btn = e.target.closest('button');
  if (!btn || !btn.dataset.format) return;
  var newFormat = btn.dataset.format;
  if (newFormat === window.currentFormat) return;
  window.currentFormat = newFormat;
  setActiveButton('format-selector', 'data-format', newFormat);
  var outputEl = document.getElementById('output');
  if (window.cachedHtml && outputEl) outputEl.value = formatOutput();
});

if (btnDownload) btnDownload.addEventListener('click', function() {
  var output = document.getElementById('output').value;
  if (!output) return;
  downloadFile(output, window.cachedTitle, window.currentFormat);
});

if (btnCopy) btnCopy.addEventListener('click', function() {
  var output = document.getElementById('output').value;
  if (!output) return;
  copyToClipboard(output);
});

// --- Initial extraction ---
if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting) {
  injectAndProcess();
}

