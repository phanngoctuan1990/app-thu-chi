// ============================================================
// Thu Chi App v2 — Multi-tenant Google Apps Script
// Deploy as: Web App | Execute as: Me | Access: Anyone
//
// Supports two sheet formats (auto-detected):
//   NEW: single "Transactions" tab, flat rows: Date|Amount|Category|Note|User|Timestamp
//   OLD: monthly tabs "Tháng X", block layout per category
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

// Old format column map: category → amount column index (1-based)
var COLUMN_MAP = {
  'Ăn uống sinh hoạt': 3, 'Mua hàng': 7, 'Thu nhập': 11,
  'Chi tiêu bắt buộc': 3, 'Chi tiêu khác': 7, 'Đầu tư': 11,
  'Phương tiện di chuyển': 3, 'Đi chơi': 7, 'Tiết kiệm': 11,
};

// ── Routing ───────────────────────────────────────────────────────────────────

function doGet(e) {
  var p = e.parameter;
  try {
    if (p.action === 'summary')      return json(getSummary(p.sheetId, +p.month));
    if (p.action === 'transactions') return json(getTransactions(p.sheetId, +p.month));
    if (p.action === 'lookupCode')   return json(lookupInviteCode(p.code));
    if (p.action === 'generateCode') return json(generateInviteCode(p.sheetId));
    return json({ error: 'Unknown action' });
  } catch(err) {
    return json({ error: err.message });
  }
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  try {
    if (!body.action || body.action === 'add') {
      addRow(body.sheetId, body);
      return json({ ok: true });
    }
    if (body.action === 'delete') {
      deleteRow(body.sheetId, body);
      return json({ ok: true });
    }
    return json({ error: 'Unknown action' });
  } catch(err) {
    return json({ error: err.message });
  }
}

// ── Format detection ──────────────────────────────────────────────────────────

function isNewFormat(ss) {
  return ss.getSheetByName('Transactions') !== null;
}

function openSS(sheetId) {
  if (!sheetId) throw new Error('sheetId required');
  return SpreadsheetApp.openById(sheetId);
}

// ── Summary ───────────────────────────────────────────────────────────────────

function getSummary(sheetId, month) {
  var ss = openSS(sheetId);
  if (isNewFormat(ss)) return getSummaryNew(ss, month);
  return getSummaryOld(ss, month);
}

function getSummaryNew(ss, month) {
  var sheet = ss.getSheetByName('Transactions');
  var rows = sheet.getDataRange().getValues();
  var income = 0, totalSpent = 0, categories = {};

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0]) continue;
    var d = new Date(row[0]);
    if (d.getMonth() + 1 !== month) continue;
    var amount = parseFloat(row[1]) || 0;
    var cat = String(row[2] || '');
    if (amount > 0) {
      income += amount;
    } else {
      totalSpent += Math.abs(amount);
      categories[cat] = (categories[cat] || 0) + Math.abs(amount);
    }
  }
  return { month: month, income: income, totalSpent: totalSpent, categories: categories };
}

function getSummaryOld(ss, month) {
  var sheet = ss.getSheetByName('Tháng ' + month);
  if (!sheet) return { month: month, income: 0, totalSpent: 0, categories: {} };

  var lastRow = sheet.getLastRow();
  var data = sheet.getRange(1, 13, lastRow, 2).getValues();
  var catMap = {};
  for (var i = 0; i < data.length; i++) {
    var name = data[i][0];
    var amount = data[i][1];
    if (typeof name === 'string' && name.trim() !== '' && typeof amount === 'number' && amount > 0) {
      catMap[name.trim()] = amount;
    }
  }

  var dautu    = getBlockTotal(sheet, 'Đầu tư');
  var tietkiem = getBlockTotal(sheet, 'Tiết kiệm');

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
      'Đầu tư':                dautu,
      'Tiết kiệm':             tietkiem,
    }
  };
}

function getBlockTotal(sheet, cat) {
  var col = COLUMN_MAP[cat];
  if (!col) return 0;
  var finder = sheet.getRange(1, col - 2, sheet.getLastRow(), 1)
    .createTextFinder(cat).findNext();
  if (!finder) return 0;
  var startRow = finder.getRow() + 2;
  var searchRange = sheet.getRange(startRow, col - 2, 60, 1).getValues();
  for (var i = 0; i < searchRange.length; i++) {
    if (typeof searchRange[i][0] === 'string' && searchRange[i][0].includes('Tổng cộng')) {
      var total = sheet.getRange(startRow + i, col).getValue();
      return typeof total === 'number' ? total : 0;
    }
  }
  return 0;
}

// ── Transactions ──────────────────────────────────────────────────────────────

function getTransactions(sheetId, month) {
  var ss = openSS(sheetId);
  if (isNewFormat(ss)) return getTransactionsNew(ss, month);
  return getTransactionsOld(ss, month);
}

function getTransactionsNew(ss, month) {
  var sheet = ss.getSheetByName('Transactions');
  var rows = sheet.getDataRange().getValues();
  var transactions = [];

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0]) continue;
    var d = new Date(row[0]);
    if (d.getMonth() + 1 !== month) continue;
    var amount = parseFloat(row[1]) || 0;
    var catVi = String(row[2] || '');
    transactions.push({
      day:      d.getDate(),
      amount:   amount,
      category: CATEGORY_EN[catVi] || catVi,
      note:     String(row[3] || ''),
      user:     String(row[4] || ''),
    });
  }

  transactions.sort(function(a, b) { return b.day - a.day; });
  return { transactions: transactions };
}

function getTransactionsOld(ss, month) {
  var sheet = ss.getSheetByName('Tháng ' + month);
  if (!sheet) return { transactions: [] };

  var transactions = [];
  var isIncome = { 'Thu nhập': true };

  for (var cat in COLUMN_MAP) {
    var col = COLUMN_MAP[cat];
    var finder = sheet.getRange(1, col - 2, sheet.getLastRow(), 1)
      .createTextFinder(cat).findNext();
    if (!finder) continue;

    var startRow = finder.getRow() + 2;
    var blockData = sheet.getRange(startRow, col - 2, 60, 3).getValues();

    for (var i = 0; i < blockData.length; i++) {
      var note   = blockData[i][0];
      var day    = blockData[i][1];
      var amount = blockData[i][2];
      if (typeof note === 'string' && note.includes('Tổng cộng')) break;
      if (!amount || amount === 0) continue;
      transactions.push({
        day:      typeof day === 'number' ? day : 0,
        category: CATEGORY_EN[cat] || cat,
        note:     (note && note !== '') ? String(note) : cat,
        amount:   isIncome[cat] ? amount : -amount,
      });
    }
  }

  transactions.sort(function(a, b) { return b.day - a.day; });
  return { transactions: transactions };
}

// ── Add row ───────────────────────────────────────────────────────────────────

function addRow(sheetId, body) {
  var ss = openSS(sheetId);
  if (isNewFormat(ss)) return addRowNew(ss, body);
  return addRowOld(ss, body);
}

function addRowNew(ss, body) {
  var sheet = ss.getSheetByName('Transactions');
  var isIncome = (body.category === 'Thu nhập');
  var signedAmount = isIncome ? Math.abs(body.amount) : -Math.abs(body.amount);
  sheet.appendRow([
    body.date,
    signedAmount,
    body.category || '',
    body.note || '',
    body.userName || '',
    new Date().toISOString(),
  ]);
}

function addRowOld(ss, body) {
  var month = body.date ? parseInt(body.date.split('-')[1], 10) : new Date().getMonth() + 1;
  var sheet = ss.getSheetByName('Tháng ' + month);
  if (!sheet) throw new Error('Không tìm thấy sheet Tháng ' + month);

  var cat = body.category;
  var col = COLUMN_MAP[cat];
  if (!col) throw new Error('Sai Category: ' + cat);

  var headerColRange = sheet.getRange(1, col - 2, sheet.getLastRow(), 1);
  var textFinder = headerColRange.createTextFinder(cat).findNext();
  if (!textFinder) throw new Error('Không tìm thấy tiêu đề ' + cat);

  var startRow = textFinder.getRow() + 2;
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
  sheet.getRange(targetRow, col).setValue(body.amount);
}

// ── Delete row ────────────────────────────────────────────────────────────────

function deleteRow(sheetId, body) {
  var ss = openSS(sheetId);
  if (isNewFormat(ss)) return deleteRowNew(ss, body);
  return deleteRowOld(ss, body);
}

function deleteRowNew(ss, body) {
  var sheet = ss.getSheetByName('Transactions');
  var rows = sheet.getDataRange().getValues();
  var month = body.month, day = body.day, amount = Math.abs(body.amount);
  var note = body.note || '';

  for (var i = rows.length - 1; i >= 1; i--) {
    var row = rows[i];
    if (!row[0]) continue;
    var d = new Date(row[0]);
    if (d.getMonth() + 1 !== month || d.getDate() !== day) continue;
    var rowCatEn = CATEGORY_EN[String(row[2])] || String(row[2]);
    if (rowCatEn !== body.category) continue;
    if (Math.abs(parseFloat(row[1])) !== amount) continue;
    if (String(row[3]) !== note) continue;
    sheet.deleteRow(i + 1);
    return;
  }
}

function deleteRowOld(ss, body) {
  var month = body.month || new Date().getMonth() + 1;
  var sheet = ss.getSheetByName('Tháng ' + month);
  if (!sheet) throw new Error('Không tìm thấy sheet Tháng ' + month);

  // Find category by English name
  var catVi = null;
  for (var k in CATEGORY_EN) { if (CATEGORY_EN[k] === body.category) { catVi = k; break; } }
  if (!catVi) catVi = body.category;

  var col = COLUMN_MAP[catVi];
  if (!col) throw new Error('Sai Category');

  var finder = sheet.getRange(1, col - 2, sheet.getLastRow(), 1)
    .createTextFinder(catVi).findNext();
  if (!finder) throw new Error('Không tìm thấy tiêu đề ' + catVi);

  var startRow = finder.getRow() + 2;
  var blockData = sheet.getRange(startRow, col - 2, 60, 3).getValues();

  for (var i = 0; i < blockData.length; i++) {
    var rowNote = blockData[i][0], rowDay = blockData[i][1], rowAmount = blockData[i][2];
    if (typeof rowNote === 'string' && rowNote.includes('Tổng cộng')) break;
    var normalizeNote = function(n, cat) {
      var s = String(n == null ? '' : n).trim();
      return (s === '' || s === cat) ? '' : s;
    };
    var noteMatch = normalizeNote(rowNote, catVi) === normalizeNote(body.note, catVi);
    if (rowDay === body.day && noteMatch && rowAmount === body.amount) {
      var targetRow = startRow + i;
      sheet.getRange(targetRow, col - 2).setValue('');
      sheet.getRange(targetRow, col - 1).setValue('');
      sheet.getRange(targetRow, col).setValue('');
      return;
    }
  }
  throw new Error('Không tìm thấy giao dịch cần xóa');
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
