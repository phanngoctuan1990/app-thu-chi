// ============================================================
// Thu Chi App v2 — Multi-tenant Google Apps Script
// Deploy as: Web App | Execute as: Me | Access: Anyone
//
// Sheet format: monthly tabs "Tháng X", block layout per category
// Each block: Mô tả chi tiêu | Ngày | Số tiền  (3 cols)
// Group 1: cols A,B,C (amount=3) | gap D
// Group 2: cols E,F,G (amount=7) | gap H
// Group 3: cols I,J,K (amount=11) | gap L
// Summary: cols M,N,O (col 13+)
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

// Amount col (1-based). Block: (col-2)=Note, (col-1)=Ngày, col=Số tiền
var COLUMN_MAP = {
  'Ăn uống sinh hoạt':     3,   // A,B,C | D gap
  'Mua hàng':               7,   // E,F,G | H gap
  'Thu nhập':              11,   // I,J,K | L gap
  'Chi tiêu bắt buộc':     3,
  'Chi tiêu khác':          7,
  'Đầu tư':               11,
  'Phương tiện di chuyển': 3,
  'Đi chơi':               7,
  'Tiết kiệm':            11,
};

var ROW_SETS = [
  { cats: ['Ăn uống sinh hoạt', 'Mua hàng',    'Thu nhập'],  headerRow: 1  },
  { cats: ['Chi tiêu bắt buộc', 'Chi tiêu khác', 'Đầu tư'],  headerRow: 15 },
  { cats: ['Phương tiện di chuyển', 'Đi chơi',  'Tiết kiệm'], headerRow: 29 },
];

var SUMMARY_COL = 13;  // col M
var DATA_ROWS   = 10;  // data rows per block

var CAT_COLORS = {
  'Ăn uống sinh hoạt':     '#4caf50',
  'Mua hàng':               '#ff9800',
  'Thu nhập':               '#f44336',
  'Chi tiêu bắt buộc':     '#607d8b',
  'Chi tiêu khác':          '#ffc107',
  'Đầu tư':                '#66bb6a',
  'Phương tiện di chuyển': '#2196f3',
  'Đi chơi':               '#26c6da',
  'Tiết kiệm':             '#9e9e9e',
};

var CAT_BG_LIGHT = {
  'Ăn uống sinh hoạt':     '#e8f5e9',
  'Mua hàng':               '#fff3e0',
  'Thu nhập':               '#ffebee',
  'Chi tiêu bắt buộc':     '#eceff1',
  'Chi tiêu khác':          '#fff8e1',
  'Đầu tư':                '#e8f5e9',
  'Phương tiện di chuyển': '#e3f2fd',
  'Đi chơi':               '#e0f7fa',
  'Tiết kiệm':             '#f5f5f5',
};

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

function columnLetter(n) {
  var s = '';
  while (n > 0) { s = String.fromCharCode(64 + (n - 1) % 26 + 1) + s; n = Math.floor((n - 1) / 26); }
  return s;
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

// ── Summary ───────────────────────────────────────────────────────────────────

function getSummary(sheetId, month) {
  var ss = openSS(sheetId);
  var sheet = ss.getSheetByName('Tháng ' + month);
  if (!sheet) return { month: month, income: 0, totalSpent: 0, categories: {} };

  var spendingCats = ['Ăn uống sinh hoạt', 'Mua hàng', 'Chi tiêu bắt buộc', 'Chi tiêu khác',
                      'Phương tiện di chuyển', 'Đi chơi'];
  var cats = {};
  var totalSpent = 0;

  spendingCats.forEach(function(cat) {
    var v = getBlockTotal(sheet, cat);
    cats[cat] = v;
    totalSpent += v;
  });

  cats['Đầu tư']   = getBlockTotal(sheet, 'Đầu tư');
  cats['Tiết kiệm'] = getBlockTotal(sheet, 'Tiết kiệm');

  return {
    month:      month,
    income:     getBlockTotal(sheet, 'Thu nhập'),
    totalSpent: totalSpent,
    categories: cats,
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
    var block = sheet.getRange(startRow, col - 2, 60, 3).getValues();
    for (var i = 0; i < block.length; i++) {
      var note = block[i][0], day = block[i][1], amount = block[i][2];
      if (typeof note === 'string' && note.includes('Tổng cộng')) break;
      if (!amount || amount === 0) continue;
      txs.push({
        day:      typeof day === 'number' ? day : 0,
        category: cat,
        note:     (note && note !== '') ? String(note) : cat,
        amount:   isIncome[cat] ? amount : -amount,
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
    sheet.getRange(targetRow - 1, col - 2, 1, 3).copyTo(
      sheet.getRange(targetRow, col - 2, 1, 3),
      SpreadsheetApp.CopyPasteType.PASTE_FORMAT
    );
  }

  var day = body.date ? parseInt(body.date.split('-')[2], 10) : new Date().getDate();
  sheet.getRange(targetRow, col - 2).setValue(body.note || '');
  sheet.getRange(targetRow, col - 1).setValue(day);
  sheet.getRange(targetRow, col    ).setValue(body.amount);
}

// ── Delete row ────────────────────────────────────────────────────────────────

function deleteRow(sheetId, body) {
  var ss = openSS(sheetId);
  var month = body.month || new Date().getMonth() + 1;
  var sheet = ss.getSheetByName('Tháng ' + month);
  if (!sheet) throw new Error('Không tìm thấy sheet Tháng ' + month);

  var catVi = body.category;

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
      sheet.getRange(startRow + i, col - 2, 1, 3).clearContent();
      return;
    }
  }
  throw new Error('Không tìm thấy giao dịch cần xóa');
}

// ── Template initialization ───────────────────────────────────────────────────

function initTemplate(sheetId) {
  var ss = openSS(sheetId);

  // Create 12 month tabs
  for (var m = 1; m <= 12; m++) {
    var name = 'Tháng ' + m;
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name, m - 1);
    setupMonthSheet(sheet);
  }

  // Remove default placeholder sheets
  var placeholders = ['Sheet1', 'Trang tính 1', 'Transactions'];
  ss.getSheets().forEach(function(s) {
    if (placeholders.indexOf(s.getName()) !== -1 && ss.getSheets().length > 1)
      try { ss.deleteSheet(s); } catch(e) {}
  });

  return { ok: true };
}

function setupMonthSheet(sheet) {
  sheet.clearContents();
  sheet.clearFormats();

  ROW_SETS.forEach(function(rs) {
    var hr      = rs.headerRow;
    var dataEnd = hr + 1 + DATA_ROWS; // last data row
    var totalRow = dataEnd + 1;

    rs.cats.forEach(function(cat) {
      var col = COLUMN_MAP[cat];
      var nc  = col - 2; // note col

      // ── Category header row ──────────────────────────────────────────
      sheet.getRange(hr, nc, 1, 3).merge()
        .setValue(cat)
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle')
        .setFontWeight('bold')
        .setFontColor('#ffffff')
        .setBackground(CAT_COLORS[cat] || '#9e9e9e')
        .setFontSize(11);

      // ── Sub-header row ───────────────────────────────────────────────
      sheet.getRange(hr + 1, nc).setValue('Mô tả chi tiêu').setFontSize(9).setFontWeight('bold');
      sheet.getRange(hr + 1, nc + 1).setValue('Ngày').setFontSize(9).setFontWeight('bold');
      sheet.getRange(hr + 1, col).setValue('số tiền').setFontSize(9).setFontWeight('bold');

      // ── Data rows (alternating light bg) ────────────────────────────
      var bg = CAT_BG_LIGHT[cat] || '#f9f9f9';
      for (var r = hr + 2; r <= dataEnd; r++) {
        sheet.getRange(r, nc, 1, 3).setBackground(r % 2 === 0 ? bg : '#ffffff');
      }

      // ── Total row ────────────────────────────────────────────────────
      sheet.getRange(totalRow, nc).setValue('Tổng cộng').setFontWeight('bold');
      sheet.getRange(totalRow, nc + 1).setValue('VND').setFontColor('#888888');
      var totalFormula = '=SUMIF(' +
        columnLetter(nc) + (hr + 2) + ':' + columnLetter(nc) + dataEnd +
        ',"<>Tổng cộng",' +
        columnLetter(col) + (hr + 2) + ':' + columnLetter(col) + dataEnd + ')';
      sheet.getRange(totalRow, col).setFormula(totalFormula).setFontWeight('bold');
    });
  });

  // ── Summary table ────────────────────────────────────────────────────────────
  var sc = SUMMARY_COL;

  // Headers
  sheet.getRange(1, sc).setValue('Phân loại').setFontWeight('bold').setBackground('#ffeb3b').setFontSize(10);
  sheet.getRange(1, sc + 1).setValue('Số tiền').setFontWeight('bold').setBackground('#ffeb3b').setFontSize(10);
  sheet.getRange(1, sc + 2).setValue('%').setFontWeight('bold').setBackground('#ffeb3b').setFontSize(10);

  var summaryItems = [
    { name: 'Ăn uống sinh hoạt',     bg: '#c8e6c9' },
    { name: 'Mua hàng',               bg: '#ffe0b2' },
    { name: 'Chi tiêu bắt buộc',     bg: '#cfd8dc' },
    { name: 'Chi tiêu khác',         bg: '#fff9c4' },
    { name: 'Phương tiện di chuyển', bg: '#bbdefb' },
    { name: 'Đi chơi',               bg: '#b2ebf2' },
  ];

  summaryItems.forEach(function(item, idx) {
    var r = idx + 2;
    sheet.getRange(r, sc).setValue(item.name).setBackground(item.bg).setFontSize(9);
    sheet.getRange(r, sc + 1).setValue('VND').setFontColor('#888888').setFontSize(9);
    sheet.getRange(r, sc + 2).setValue('#DIV/0!'); // placeholder, user can add formula
  });

  var lastSummaryRow = summaryItems.length + 2;

  // Tổng chi
  sheet.getRange(lastSummaryRow, sc).setValue('Tổng chi')
    .setFontWeight('bold').setBackground('#ffeb3b').setFontSize(10);
  sheet.getRange(lastSummaryRow, sc + 1).setValue('VND').setFontWeight('bold');
  sheet.getRange(lastSummaryRow, sc + 2).setValue('-').setFontWeight('bold');

  // Thu nhập
  sheet.getRange(lastSummaryRow + 1, sc).setValue('Thu nhập')
    .setFontWeight('bold').setBackground('#f44336').setFontColor('#ffffff').setFontSize(10);
  sheet.getRange(lastSummaryRow + 1, sc + 1).setValue('VND').setFontWeight('bold');
  sheet.getRange(lastSummaryRow + 1, sc + 2).setValue('-').setFontWeight('bold');

  // Column widths
  sheet.setColumnWidth(1,  180); // A note
  sheet.setColumnWidth(2,  50);  // B ngày
  sheet.setColumnWidth(3,  90);  // C tiền
  sheet.setColumnWidth(4,  20);  // D gap
  sheet.setColumnWidth(5,  180); // E note
  sheet.setColumnWidth(6,  50);  // F ngày
  sheet.setColumnWidth(7,  90);  // G tiền
  sheet.setColumnWidth(8,  20);  // H gap
  sheet.setColumnWidth(9,  180); // I note
  sheet.setColumnWidth(10, 50);  // J ngày
  sheet.setColumnWidth(11, 90);  // K tiền
  sheet.setColumnWidth(12, 20);  // L gap
  sheet.setColumnWidth(13, 160); // M phân loại
  sheet.setColumnWidth(14, 90);  // N số tiền
  sheet.setColumnWidth(15, 60);  // O %
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
