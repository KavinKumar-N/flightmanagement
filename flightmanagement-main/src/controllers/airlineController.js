const { getDb, saveDb } = require("../config/database");
const { NotFoundError, ConflictError } = require("../utils/errors");

function rowToObject(result) {
  if (result.length === 0 || result[0].values.length === 0) return null;
  const obj = {};
  result[0].columns.forEach((col, i) => (obj[col] = result[0].values[0][i]));
  return obj;
}

function rowsToArray(result) {
  if (result.length === 0) return [];
  return result[0].values.map((row) => {
    const obj = {};
    result[0].columns.forEach((col, i) => (obj[col] = row[i]));
    return obj;
  });
}

async function createAirline(req, res, next) {
  try {
    const { name, code } = req.body;
    const db = await getDb();

    const existing = db.exec("SELECT id FROM airlines WHERE code = ?", [code]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return next(new ConflictError("Airline code already exists"));
    }

    db.run("INSERT INTO airlines (name, code) VALUES (?, ?)", [name, code]);
    saveDb();
    const id = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];

    const airline = rowToObject(db.exec("SELECT * FROM airlines WHERE id = ?", [id]));

    res.status(201).json({ success: true, message: "Airline created", data: { airline } });
  } catch (err) {
    next(err);
  }
}

async function getAirlines(req, res, next) {
  try {
    const db = await getDb();
    const airlines = rowsToArray(db.exec("SELECT * FROM airlines ORDER BY name"));
    res.json({ success: true, data: { airlines, count: airlines.length } });
  } catch (err) {
    next(err);
  }
}

async function getAirlineById(req, res, next) {
  try {
    const db = await getDb();
    const airline = rowToObject(db.exec("SELECT * FROM airlines WHERE id = ?", [req.params.id]));
    if (!airline) return next(new NotFoundError("Airline"));
    res.json({ success: true, data: { airline } });
  } catch (err) {
    next(err);
  }
}

async function updateAirline(req, res, next) {
  try {
    const { name, code } = req.body;
    const db = await getDb();

    const airline = rowToObject(db.exec("SELECT * FROM airlines WHERE id = ?", [req.params.id]));
    if (!airline) return next(new NotFoundError("Airline"));

    if (code && code !== airline.code) {
      const existing = db.exec("SELECT id FROM airlines WHERE code = ? AND id != ?", [
        code,
        req.params.id,
      ]);
      if (existing.length > 0 && existing[0].values.length > 0) {
        return next(new ConflictError("Airline code already exists"));
      }
    }

    const updates = [];
    const values = [];
    if (name) { updates.push("name = ?"); values.push(name); }
    if (code) { updates.push("code = ?"); values.push(code); }
    values.push(req.params.id);

    db.run(`UPDATE airlines SET ${updates.join(", ")} WHERE id = ?`, values);
    saveDb();
    const updated = rowToObject(db.exec("SELECT * FROM airlines WHERE id = ?", [req.params.id]));

    res.json({ success: true, message: "Airline updated", data: { airline: updated } });
  } catch (err) {
    next(err);
  }
}

async function deleteAirline(req, res, next) {
  try {
    const db = await getDb();
    const airline = rowToObject(db.exec("SELECT * FROM airlines WHERE id = ?", [req.params.id]));
    if (!airline) return next(new NotFoundError("Airline"));

    db.run("DELETE FROM airlines WHERE id = ?", [req.params.id]);
    saveDb();
    res.json({ success: true, message: "Airline deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = { createAirline, getAirlines, getAirlineById, updateAirline, deleteAirline };
