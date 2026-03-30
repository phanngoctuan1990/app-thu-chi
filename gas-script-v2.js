// ============================================================
// Thu Chi App v2 — Multi-tenant Google Apps Script
// Deploy as: Web App | Execute as: Me | Access: Anyone
//
// Sheet format: monthly tabs "Tháng X", block layout per category
// Each block: Note | Ngày | Số tiền | Người dùng | Thời gian
// Group 1: cols A-E (amount=3), gap F
// Group 2: cols G-K (amount=9), gap L
// Group 3: cols M-Q (amount=15), gap R
// Summary table: cols S-U (col 19+)
// ============================================================

var CATEGORY_EN = {
  'Ăn uống sinh hoạt': 'Meals',
  'Mua hàng': 'Shopping',
  'Phương tiện di chuyển': 'Transport',
  'Chi tiêu bắt buộc': 'Compulsory',
  'Đi chơi': 'Fun',
  'Đầu tư': 'Invest',
  'Tiết kiệm': 'Savings',
  'Thu nhập': 'Income',
  'Chi tiêu khác': 'Other',
};

// Amount column index (1-based). Block: (col-2)=Note, (col-1)=Ngày, col=Tiền, (col+1)=User, (col+2)=Timestamp
var COLUMN_MAP = {
  'Ăn uống sinh hoạt':      3,  // A,B,C,D,E | F gap
  'Mua hàng':                9,  // G,H,I,J,K | L gap
  'Thu nhập':               15,  // M,N,O,P,Q | R gap
  'Chi tiêu bắt buộc':      3,
  'Chi tiêu khác':           9,
  'Đầu tư':                 15,
  'Phương tiện di chuyển':  3,
  'Đi chơi':                 9,
  'Tiết kiệm':              15,
};

var ROW_SETS = [
  { cats: ['Ăn uống sinh hoạt', 'Mua hàng', 'Thu nhập'],           headerRow: 1  },
  { cats: ['Chi tiêu bắt buộc', 'Chi tiêu khác', 'Đầu tư'],        headerRow: 15 },
  { cats: ['Phương tiện di chuyển', 'Đi chơi', 'Tiết kiệm'],       headerRow: 29 },
];

var SUMMARY_COL = 19; // col S
var DATA_ROWS   = 10; // data rows per category block

// ── Routing ───────────────────────────────────────────────────────────────────

function doGet(e) {
  var p = e.parameter;
  try {
    if (p.action === 'summary')      return json(getSummary(p.sheetId, +p.month));
    if (p.action === 'transactions') return json(getTransactions(p.sheetId, +p.month));
    if (p.action === 'lookupCode')   return json(lookupInviteCode(p.code));
    if (p.action === 'generateCode') return json(generateInviteCode(p.sheetId));
    if (p.action === 'initTemplate') return json(initTemplate(p.sheetId));
    return json({ error: 'Unknown action' });
  } catch(err) {
    return json({ error: err.message });
  }
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  try {
    if (!body.action || body.action === 'add') { addRow(body.sheetId, body); return json({ ok: true }); }
    if (body.action === 'delete') { deleteRow(body.sheetId, body); return json({ ok: true }); }
    return json({ error: 'Unknown action' });
  } catch(err) {
    return json({ error: err.message });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function openSS(sheetId) {
  if (!sheetId) throw new Error('sheetId required');
  return SpreadsheetApp.openById(sheetId);
}

function getBlockTotal(sheet, cat) {
  var col = COLUMN_MAP[cat];
  if (!col) return 0;
  var finder = sheet.getRange(1, col - 2, sheet.getLastRow(), 1).createTextFinder(cat).findNext();
  if (!finder) return 0;
  var startRow = finder.getRow() + 2;
  var vals = sheet.getRange(startRow, col - 2, 60, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (typeof vals[i][0] === 'string' && vals[i][0].includes('Tổng cộng')) {
      var v = sheet.getRange(startRow + i, col).getValue();
      return typeof v === 'number' ? v : 0;
    }
  }
  return 0;
}

function columnLetter(n) {
  var s = '';
  while (n > 0) { s = String.fromCharCode(64 + (n - 1) % 26 + 1) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// ── Summary ───────────────────────────────────────────────────────────────────

function getSummary(sheetId, month) {
  var ss = openSS(sheetId);
  var sheet = ss.getSheetByName('Tháng ' + month);
  if (!sheet) return { month: month, income: 0, totalSpent: 0, categories: {} };

  var data = sheet.getRange(1, SUMMARY_COL, sheet.getLastRow(), 2).getValues();
  var catMap = {};
  for (var i = 0; i < data.length; i++) {
    var name = data[i][0], amount = data[i][1];
    if (typeof name === 'string' && name.trim() && typeof amount === 'number' && amount > 0)
      catMap[name.trim()] = amount;
  }

  return {
    month: month,
    income:     catMap['Thu nhập'] || 0,
    totalSpent: catMap['Tổng chi'] || 0,
    categories: {
      'Ăn uống sinh hoạt':     catMap['Ăn uống sinh hoạt']     || 0,
      'Mua hàng':               catMap['Mua hàng']               || 0,
      'Chi tiêu bắt buộc':     catMap['Chi tiêu bắt buộc']     || 0,
      'Chi tiêu khác':         catMap['Chi tiêu khác']          || 0,
      'Phương tiện di chuyển': catMap['Phương tiện di chuyển'] || 0,
      'Đi chơi':               catMap['Đi chơi']                || 0,
      'Đầu tư':                getBlockTotal(sheet, 'Đầu tư'),
      'Tiết kiệm':             getBlockTotal(sheet, 'Tiết kiệm'),
    }
  };
}

// ── Transactions ──────────────────────────────────────────────────────────────

function getTransactions(sheetId, month) {
  var ss = openSS(sheetId);
  var sheet = ss.getSheetByName('Tháng ' + month);
  if (!sheet) return { transactions: [] };

  var txs = [];
  var isIncome = { 'Thu nhập': true };

  for (var cat in COLUMN_MAP) {
    var col = COLUMN_MAP[cat];
    var finder = sheet.getRange(1, col - 2, sheet.getLastRow(), 1).createTextFinder(cat).findNext();
    if (!finder) continue;
    var startRow = finder.getRow() + 2;
    var block = sheet.getRange(startRow, col - 2, 60, 5).getValues();
    for (var i = 0; i < block.length; i++) {
      var note = block[i][0], day = block[i][1], amount = block[i][2], user = block[i][3];
      if (typeof note === 'string' && note.includes('Tổng cộng')) break;
      if (!amount || amount === 0) continue;
      txs.push({
        day:      typeof day === 'number' ? day : 0,
        category: CATEGORY_EN[cat] || cat,
        note:     (note && note !== '') ? String(note) : cat,
        amount:   isIncome[cat] ? amount : -amount,
        user:     String(user || ''),
      });
    }
  }

  txs.sort(function(a, b) { return b.day - a.day; });
  return { transactions: txs };
}

// ── Add row ───────────────────────────────────────────────────────────────────

function addRow(sheetId, body) {
  var ss = openSS(sheetId);
  var month = body.date ? parseInt(body.date.split('-')[1], 10) : new Date().getMonth() + 1;
  var sheet = ss.getSheetByName('Tháng ' + month);
  if (!sheet) throw new Error('Không tìm thấy sheet Tháng ' + month);

  var cat = body.category;
  var col = COLUMN_MAP[cat];
  if (!col) throw new Error('Sai Category: ' + cat);

  var finder = sheet.getRange(1, col - 2, sheet.getLastRow(), 1).createTextFinder(cat).findNext();
  if (!finder) throw new Error('Không tìm thấy tiêu đề ' + cat);

  var startRow = finder.getRow() + 2;
  var searchRange = sheet.getRange(startRow, col - 2, 50, 1).getValues();
  var rowOffset = -1;
  for (var i = 0; i < searchRange.length; i++) {
    if (typeof searchRange[i][0] === 'string' && searchRange[i][0].includes('Tổng cộng')) {
      rowOffset = i; break;
    }
  }
  if (rowOffset === -1) throw new Error('Không tìm thấy dòng Tổng cộng cho ' + cat);

  var totalRow = startRow + rowOffset;
  var targetRow = -1;
  for (var r = startRow; r < totalRow; r++) {
    if (sheet.getRange(r, col).getValue() === '') { targetRow = r; break; }
  }
  if (targetRow === -1) {
    sheet.insertRowBefore(totalRow);
    targetRow = totalRow;
    sheet.getRange(targetRow - 1, col - 2, 1, 5).copyTo(
      sheet.getRange(targetRow, col - 2, 1, 5),
      SpreadsheetApp.CopyPasteType.PASTE_FORMAT
    );
  }

  var day = body.date ? parseInt(body.date.split('-')[2], 10) : new Date().getDate();
  sheet.getRange(targetRow, col - 2).setValue(body.note || '');
  sheet.getRange(targetRow, col - 1).setValue(day);
  sheet.getRange(targetRow, col    ).setValue(body.amount);
  sheet.getRange(targetRow, col + 1).setValue(body.userName || '');
  sheet.getRange(targetRow, col + 2).setValue(new Date().toISOString());
}

// ── Delete row ────────────────────────────────────────────────────────────────

function deleteRow(sheetId, body) {
  var ss = openSS(sheetId);
  var month = body.month || new Date().getMonth() + 1;
  var sheet = ss.getSheetByName('Tháng ' + month);
  if (!sheet) throw new Error('Không tìm thấy sheet Tháng ' + month);

  var catVi = null;
  for (var k in CATEGORY_EN) { if (CATEGORY_EN[k] === body.category) { catVi = k; break; } }
  if (!catVi) catVi = body.category;

  var col = COLUMN_MAP[catVi];
  if (!col) throw new Error('Sai Category');

  var finder = sheet.getRange(1, col - 2, sheet.getLastRow(), 1).createTextFinder(catVi).findNext();
  if (!finder) throw new Error('Không tìm thấy tiêu đề ' + catVi);

  var startRow = finder.getRow() + 2;
  var block = sheet.getRange(startRow, col - 2, 60, 3).getValues();

  function norm(n, c) { var s = String(n == null ? '' : n).trim(); return (s === '' || s === c) ? '' : s; }

  for (var i = 0; i < block.length; i++) {
    var rNote = block[i][0], rDay = block[i][1], rAmt = block[i][2];
    if (typeof rNote === 'string' && rNote.includes('Tổng cộng')) break;
    if (rDay === body.day && norm(rNote, catVi) === norm(body.note, catVi) && rAmt === body.amount) {
      sheet.getRange(startRow + i, col - 2, 1, 5).clearContent();
      return;
    }
  }
  throw new Error('Không tìm thấy giao dịch cần xóa');
}

// ── Template initialization ───────────────────────────────────────────────────

function initTemplate(sheetId) {
  var ss = openSS(sheetId);

  for (var m = 1; m <= 12; m++) {
    var name = 'Tháng ' + m;
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    setupMonthSheet(sheet);
  }

  // Remove placeholder sheets
  var toDelete = ['Sheet1', 'Trang tính 1', 'Transactions'];
  ss.getSheets().forEach(function(s) {
    if (toDelete.indexOf(s.getName()) !== -1 && ss.getSheets().length > 1)
      ss.deleteSheet(s);
  });

  return { ok: true };
}

function setupMonthSheet(sheet) {
  sheet.clearContents();

  var CAT_COLORS = {
    'Ăn uống sinh hoạt': '#4caf50', 'Mua hàng': '#ff9800', 'Thu nhập': '#f44336',
    'Chi tiêu bắt buộc': '#607d8b', 'Chi tiêu khác': '#ff9800', 'Đầu tư': '#4caf50',
    'Phương tiện di chuyển': '#2196f3', 'Đi chơi': '#00bcd4', 'Tiết kiệm': '#9e9e9e',
  };
  var COL_HEADERS = ['Mô tả chi tiêu', 'Ngày', 'Số tiền', 'Người dùng', 'Thời gian'];

  ROW_SETS.forEach(function(rs) {
    var hr = rs.headerRow;
    var totalRow = hr + 1 + DATA_ROWS + 1;

    rs.cats.forEach(function(cat) {
      var col = COLUMN_MAP[cat];
      var nc  = col - 2; // note column

      // Header
      sheet.getRange(hr, nc, 1, 5).merge()
        .setValue(cat).setHorizontalAlignment('center')
        .setFontWeight('bold').setFontColor('#ffffff')
        .setBackground(CAT_COLORS[cat] || '#999999');

      // Sub-headers
      COL_HEADERS.forEach(function(h, idx) {
        sheet.getRange(hr + 1, nc + idx).setValue(h).setFontSize(9).setFontWeight('bold');
      });

      // Total row
      var tr = totalRow;
      sheet.getRange(tr, nc).setValue('Tổng cộng').setFontWeight('bold');
      sheet.getRange(tr, nc + 1).setValue('VND');
      var dataStart = hr + 2;
      sheet.getRange(tr, col).setFormula(
        '=SUMIF(' + columnLetter(nc) + dataStart + ':' + columnLetter(nc) + (tr - 1) +
        ',"<>Tổng cộng",' + columnLetter(col) + dataStart + ':' + columnLetter(col) + (tr - 1) + ')'
      ).setFontWeight('bold');
    });
  });

  // Summary table
  var sc = SUMMARY_COL;
  var summaryRows = [
    { name: 'Ăn uống sinh hoạt', bg: '#c8e6c9' },
    { name: 'Mua hàng',          bg: '#ffe0b2' },
    { name: 'Chi tiêu bắt buộc', bg: '#cfd8dc' },
    { name: 'Chi tiêu khác',     bg: '#ffe0b2' },
    { name: 'Phương tiện di chuyển', bg: '#bbdefb' },
    { name: 'Đi chơi',           bg: '#b2ebf2' },
  ];

  sheet.getRange(1, sc).setValue('Phân loại').setFontWeight('bold').setBackground('#ffeb3b');
  sheet.getRange(1, sc + 1).setValue('Số tiền').setFontWeight('bold').setBackground('#ffeb3b');
  sheet.getRange(1, sc + 2).setValue('%').setFontWeight('bold').setBackground('#ffeb3b');

  summaryRows.forEach(function(sr, idx) {
    var r = idx + 2;
    sheet.getRange(r, sc).setValue(sr.name).setBackground(sr.bg);
    sheet.getRange(r, sc + 1).setValue('VND');
  });

  var tchRow = summaryRows.length + 2;
  sheet.getRange(tchRow, sc).setValue('Tổng chi').setFontWeight('bold').setBackground('#ffeb3b');
  sheet.getRange(tchRow, sc + 1).setValue('VND').setFontWeight('bold');

  sheet.getRange(tchRow + 1, sc).setValue('Thu nhập').setFontWeight('bold')
    .setBackground('#f44336').setFontColor('#ffffff');
  sheet.getRange(tchRow + 1, sc + 1).setValue('VND').setFontWeight('bold');
}

// ── Invite codes ──────────────────────────────────────────────────────────────

function generateInviteCode(sheetId) {
  if (!sheetId) throw new Error('sheetId required');
  var code = Math.random().toString(36).substr(2, 4).toUpperCase();
  PropertiesService.getScriptProperties().setProperty('invite_' + code, sheetId);
  return { code: code };
}

function lookupInviteCode(code) {
  if (!code) throw new Error('code required');
  var sheetId = PropertiesService.getScriptProperties().getProperty('invite_' + code);
  if (!sheetId) throw new Error('Mã mời không hợp lệ');
  return { sheetId: sheetId };
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
