// Anna-Setu Backend — consolidated corrected Code.gs
// IMPORTANT: Verify the STUDENTS UID map and meal hours before deployment.
// This file does not create or maintain an RFID Scan Log sheet.

const CONFIG = {
  TIMEZONE: "Asia/Kolkata",
  ATTENDANCE_SHEET: "Attendance",
  SUMMARY_SHEET: "Meal Summary",
  FOOD_SHEET: "Food Records",
  DEVICE_KEY: "dhruv"
};

const STUDENTS = {
  "1E6B7E05": "Student 1",
  "13CE022F": "Student 2"
};

const MEALS = {
  breakfast: { start: 7, end: 9 },
  lunch: { start: 12, end: 14 },
  dinner: { start: 20, end: 21 }
};

/**
 * Web app entry point. Opening /exec in a browser serves Index.html.
 * It deliberately does NOT create or write an RFID Scan Log sheet.
 */
function doGet(e) {
  const action = e && e.parameter ? String(e.parameter.action || "") : "";
  if (action === "health") {
    return json_({ status: "success", message: "Anna-Setu backend online" });
  }

  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("Anna-Setu Meal Attendance Dashboard")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** Returns the bound spreadsheet, or a clear error if this script is standalone. */
function getSpreadsheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("This Apps Script must be bound to the Anna-Setu Google Sheet.");
  }
  return ss;
}

/**
 * Creates only the three intended operational sheets if missing.
 * It never creates, clears, or deletes RFID Scan Log or other sheets.
 */
function setupSheets_() {
  const ss = getSpreadsheet_();
  ensureSheet_(ss, CONFIG.ATTENDANCE_SHEET, [
    "Timestamp", "UID", "Student Name", "Date", "Meal", "Status"
  ]);
  ensureSheet_(ss, CONFIG.SUMMARY_SHEET, [
    "Date", "Day", "Holiday", "Consecutive holidays",
    "Mess status", "Breakfast", "Lunch", "Dinner"
  ]);
  ensureSheet_(ss, CONFIG.FOOD_SHEET, [
    "Timestamp", "Food name", "Quantity (kg)", "Waste (kg)", "Source"
  ]);
}

/** Find a Meal Summary row by normalized date; returns 1-based row or -1. */
function findSummaryRow_(sheet, date) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (dateKey_(values[i][0]) === date) return i + 1;
  }
  return -1;
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Called by Index.html. Recalculates counts from Attendance records,
 * preserves historical summary values on dates with no attendance rows,
 * and sorts Meal Summary newest-to-oldest.
 */
function getDashboardData() {
  setupSheets_();

  const ss = getSpreadsheet_();
  const summarySheet = ss.getSheetByName(CONFIG.SUMMARY_SHEET);
  const foodSheet = ss.getSheetByName(CONFIG.FOOD_SHEET);
  const attendanceSheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET);

  const attendance = objects_(attendanceSheet);
  const foods = objects_(foodSheet);
  const summary = objects_(summarySheet);
  const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd");

  const countsByDate = {};
  attendance.forEach(r => {
    const date = dateKey_(r.Date);
    const meal = String(r.Meal || "").trim().toLowerCase();
    const status = String(r.Status || "").trim().toUpperCase();

    if (!date || status !== "PRESENT") return;
    if (!["breakfast", "lunch", "dinner"].includes(meal)) return;

    if (!countsByDate[date]) {
      countsByDate[date] = { breakfast: 0, lunch: 0, dinner: 0 };
    }
    countsByDate[date][meal]++;
  });

  // Ensure there is a row for today.
  let todaySummary = summary.find(r => dateKey_(r.Date) === today);
  if (!todaySummary) {
    const now = new Date();
    summarySheet.appendRow([
      today,
      Utilities.formatDate(now, CONFIG.TIMEZONE, "EEEE"),
      "", 0, "Open", 0, 0, 0
    ]);
    todaySummary = {
      Date: today,
      Day: Utilities.formatDate(now, CONFIG.TIMEZONE, "EEEE"),
      Holiday: "",
      "Consecutive holidays": 0,
      "Mess status": "Open",
      Breakfast: 0, Lunch: 0, Dinner: 0
    };
    summary.push(todaySummary);
  }

  // Ensure every date with PRESENT attendance exists in Meal Summary.
  let currentSummaryRows = objects_(summarySheet);
  const existingDates = new Set(
    currentSummaryRows.map(r => dateKey_(r.Date)).filter(Boolean)
  );

  Object.keys(countsByDate).forEach(date => {
    if (existingDates.has(date)) return;
    const d = new Date(date + "T12:00:00");
    summarySheet.appendRow([
      date,
      Utilities.formatDate(d, CONFIG.TIMEZONE, "EEEE"),
      "", 0, "Open", 0, 0, 0
    ]);
    existingDates.add(date);
  });

  // Write attendance-derived counts into summary for dates that have
  // PRESENT attendance records. Historical dates without attendance
  // rows keep their imported dataset values.
  currentSummaryRows = objects_(summarySheet);
  const rowByDate = {};
  currentSummaryRows.forEach((r, i) => {
    const d = dateKey_(r.Date);
    if (d) rowByDate[d] = i + 2;
  });

  Object.keys(countsByDate).forEach(date => {
    const row = rowByDate[date];
    if (!row) return;
    const c = countsByDate[date];
    summarySheet.getRange(row, 6, 1, 3).setValues([[
      c.breakfast, c.lunch, c.dinner
    ]]);
  });

  // Sort physical sheet so newest date is first.
  const lastRow = summarySheet.getLastRow();
  if (lastRow > 2) {
    summarySheet.getRange(2, 1, lastRow - 1, 8)
      .sort({ column: 1, ascending: false });
  }

  // Re-read after updates/sort so returned data matches the sheet.
  const sortedSummary = objects_(summarySheet);
  const summaryOutput = sortedSummary.map(r => {
    const date = dateKey_(r.Date);
    const counts = countsByDate[date];
    return {
      date: date,
      day: r.Day || "",
      holiday: r.Holiday || "",
      consecutive: numberOrZero_(r["Consecutive holidays"]),
      messStatus: r["Mess status"] || "Open",
      breakfast: counts ? counts.breakfast : numberOrZero_(r.Breakfast),
      lunch: counts ? counts.lunch : numberOrZero_(r.Lunch),
      dinner: counts ? counts.dinner : numberOrZero_(r.Dinner)
    };
  });

  return {
    status: "success",
    summary: summaryOutput,
    foods: foods.reverse().slice(0, 100).map(r => ({
      timestamp: displayValue_(r.Timestamp),
      food: r["Food name"] || "",
      quantity: numberOrZero_(r["Quantity (kg)"]),
      waste: numberOrZero_(r["Waste (kg)"]),
      source: r.Source || ""
    })),
    attendance: attendance.reverse().slice(0, 100).map(r => ({
      timestamp: displayValue_(r.Timestamp),
      uid: r.UID || "",
      student: r["Student Name"] || "",
      date: dateKey_(r.Date),
      meal: r.Meal || "",
      status: r.Status || ""
    }))
  };
}

function saveFoodRecord(p) {
  setupSheets_();
  const food = String((p && p.food) || "").trim();
  const quantity = Number(p && p.quantity);
  const waste = Number(p && p.waste);

  if (!food || food.length > 100 || !Number.isFinite(quantity) ||
      !Number.isFinite(waste) || quantity < 0 || waste < 0 || waste > quantity) {
    throw new Error("Enter a food name and ensure 0 ≤ waste ≤ quantity.");
  }

  SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(CONFIG.FOOD_SHEET)
    .appendRow([new Date(), food, quantity, waste, "Dashboard"]);

  return { status: "success", message: "Food record saved." };
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;

  try {
    console.log("POST reached; has body: " +
      Boolean(e && e.postData && e.postData.contents));

    const raw = e && e.postData && e.postData.contents
      ? e.postData.contents
      : "";
    if (!raw) {
      return json_({ status: "error", message: "EMPTY_REQUEST_BODY" });
    }

    let body;
    try {
      body = JSON.parse(raw);
    } catch (parseError) {
      return json_({ status: "error", message: "INVALID_JSON" });
    }

    if (String(body.key || "") !== CONFIG.DEVICE_KEY) {
      return json_({ status: "error", message: "UNAUTHORIZED" });
    }

    const uid = String(body.uid || "")
      .replace(/[^a-fA-F0-9]/g, "")
      .toUpperCase();

    if (!uid || !Object.prototype.hasOwnProperty.call(STUDENTS, uid)) {
      return json_({ status: "error", message: "INVALID_CARD" });
    }

    const now = new Date();
    const date = Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd");
    const time = Utilities.formatDate(now, CONFIG.TIMEZONE, "HH:mm:ss");
    const hour = Number(Utilities.formatDate(now, CONFIG.TIMEZONE, "H"));

    const meal = Object.keys(MEALS).find(m =>
      hour >= MEALS[m].start && hour < MEALS[m].end
    );

    if (!meal) {
      return json_({
        status: "error",
        message: "OUTSIDE_MEAL_WINDOW",
        time: time
      });
    }

    lock.waitLock(10000);
    lockAcquired = true;

    const ss = getSpreadsheet_();
    const attendanceSheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET);
    const summarySheet = ss.getSheetByName(CONFIG.SUMMARY_SHEET);

    if (!attendanceSheet || !summarySheet) {
      throw new Error("Required sheets are missing.");
    }

    const values = attendanceSheet.getDataRange().getValues();
    const duplicate = values.slice(1).some(r =>
      String(r[1] || "").trim().toUpperCase() === uid &&
      dateKey_(r[3]) === date &&
      String(r[4] || "").trim().toLowerCase() === meal &&
      String(r[5] || "").trim().toUpperCase() === "PRESENT"
    );

    if (duplicate) {
      return json_({ status: "error", message: "ALREADY_DONE", uid, meal, date });
    }

    let summaryRow = findSummaryRow_(summarySheet, date);
    if (summaryRow < 0) {
      summarySheet.appendRow([
        date,
        Utilities.formatDate(now, CONFIG.TIMEZONE, "EEEE"),
        "",
        0,
        "Open",
        0,
        0,
        0
      ]);
      summaryRow = summarySheet.getLastRow();
    }

    const messStatus = String(
      summarySheet.getRange(summaryRow, 5).getDisplayValue() || "Open"
    ).trim().toLowerCase();

    if (messStatus === "closed") {
      return json_({ status: "error", message: "MESS_CLOSED", uid, meal, date });
    }

    // Existing Attendance column order: Timestamp, UID, Student Name, Date, Meal, Status.
    attendanceSheet.appendRow([now, uid, STUDENTS[uid], date, meal, "PRESENT"]);
    recalculateSummaryForDate_(date);
    SpreadsheetApp.flush();

    return json_({
      status: "success",
      message: "ATTENDANCE_RECORDED",
      uid: uid,
      student: STUDENTS[uid],
      date: date,
      time: time,
      meal: meal
    });

  } catch (err) {
    console.error("doPost error: " + String(err && err.stack ? err.stack : err));
    return json_({
      status: "error",
      message: "SERVER_ERROR",
      detail: String(err && err.message ? err.message : err)
    });
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}

function recalculateSummaryForDate_(date) {
  const ss = getSpreadsheet_();
  const attendanceSheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET);
  const summarySheet = ss.getSheetByName(CONFIG.SUMMARY_SHEET);
  const rows = objects_(attendanceSheet);

  const counts = { breakfast: 0, lunch: 0, dinner: 0 };
  rows.forEach(r => {
    if (dateKey_(r.Date) !== date) return;
    if (String(r.Status || "").trim().toUpperCase() !== "PRESENT") return;
    const meal = String(r.Meal || "").trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(counts, meal)) counts[meal]++;
  });

  const values = summarySheet.getDataRange().getValues();
  let rowNumber = -1;
  for (let i = 1; i < values.length; i++) {
    if (dateKey_(values[i][0]) === date) {
      rowNumber = i + 1;
      break;
    }
  }

  if (rowNumber < 0) {
    const d = new Date(date + "T12:00:00");
    summarySheet.appendRow([
      date, Utilities.formatDate(d, CONFIG.TIMEZONE, "EEEE"),
      "", 0, "Open", counts.breakfast, counts.lunch, counts.dinner
    ]);
  } else {
    summarySheet.getRange(rowNumber, 6, 1, 3).setValues([[
      counts.breakfast, counts.lunch, counts.dinner
    ]]);
  }
}

function objects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1)
    .filter(row => row.some(value => value !== ""))
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => obj[header] = row[i]);
      return obj;
    });
}

function dateKey_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, CONFIG.TIMEZONE, "yyyy-MM-dd");
  }

  const s = String(value == null ? "" : value).trim();
  if (!s) return "";

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return iso[1] + "-" + iso[2].padStart(2, "0") + "-" + iso[3].padStart(2, "0");
  }

  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s|$)/);
  if (us) {
    const month = Number(us[1]);
    const day = Number(us[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return us[3] + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    }
  }

  const dmy = s.match(/^(\d{1,2})[.-](\d{1,2})[.-](\d{2,4})$/);
  if (dmy) {
    let year = dmy[3];
    if (year.length === 2) year = "20" + year;
    return year + "-" + dmy[2].padStart(2, "0") + "-" + dmy[1].padStart(2, "0");
  }

  const parsed = new Date(s);
  return isNaN(parsed.getTime())
    ? s
    : Utilities.formatDate(parsed, CONFIG.TIMEZONE, "yyyy-MM-dd");
}

function numberOrZero_(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function displayValue_(value) {
  if (value === "" || value === null || value === undefined) return "";
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, CONFIG.TIMEZONE, "dd MMM yyyy, HH:mm:ss");
  }
  return String(value);
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
