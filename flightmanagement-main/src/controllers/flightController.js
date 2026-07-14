const { getDb, saveDb } = require("../config/database");
const { NotFoundError, ConflictError, ValidationError } = require("../utils/errors");

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

async function createFlight(req, res, next) {
  try {
    const { airline_id, flight_number, source, destination, departure_time, arrival_time, total_seats, price } = req.body;
    const db = await getDb();

    const airline = rowToObject(db.exec("SELECT id FROM airlines WHERE id = ?", [airline_id]));
    if (!airline) return next(new NotFoundError("Airline"));

    const existing = db.exec("SELECT id FROM flights WHERE flight_number = ?", [flight_number]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return next(new ConflictError("Flight number already exists"));
    }

    db.run(
      `INSERT INTO flights (airline_id, flight_number, source, destination, departure_time, arrival_time, total_seats, available_seats, price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [airline_id, flight_number, source, destination, departure_time, arrival_time, total_seats, total_seats, price]
    );
    saveDb();

    const id = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];
    const flight = rowToObject(db.exec("SELECT * FROM flights WHERE id = ?", [id]));

    res.status(201).json({ success: true, message: "Flight created", data: { flight } });
  } catch (err) {
    next(err);
  }
}

async function getFlights(req, res, next) {
  try {
    const db = await getDb();
    const flights = rowsToArray(
      db.exec(`
        SELECT f.*, a.name as airline_name, a.code as airline_code
        FROM flights f
        JOIN airlines a ON f.airline_id = a.id
        ORDER BY f.departure_time
      `)
    );
    res.json({ success: true, data: { flights, count: flights.length } });
  } catch (err) {
    next(err);
  }
}

async function getFlightById(req, res, next) {
  try {
    const db = await getDb();
    const flight = rowToObject(
      db.exec(
        `SELECT f.*, a.name as airline_name, a.code as airline_code
         FROM flights f JOIN airlines a ON f.airline_id = a.id
         WHERE f.id = ?`,
        [req.params.id]
      )
    );
    if (!flight) return next(new NotFoundError("Flight"));
    res.json({ success: true, data: { flight } });
  } catch (err) {
    next(err);
  }
}

async function updateFlight(req, res, next) {
  try {
    const db = await getDb();
    const flight = rowToObject(db.exec("SELECT * FROM flights WHERE id = ?", [req.params.id]));
    if (!flight) return next(new NotFoundError("Flight"));

    const { airline_id, flight_number, source, destination, departure_time, arrival_time, total_seats, price } = req.body;

    if (airline_id) {
      const airline = rowToObject(db.exec("SELECT id FROM airlines WHERE id = ?", [airline_id]));
      if (!airline) return next(new NotFoundError("Airline"));
    }

    if (flight_number && flight_number !== flight.flight_number) {
      const existing = db.exec("SELECT id FROM flights WHERE flight_number = ? AND id != ?", [
        flight_number, req.params.id,
      ]);
      if (existing.length > 0 && existing[0].values.length > 0) {
        return next(new ConflictError("Flight number already exists"));
      }
    }

    const updates = [];
    const values = [];
    const fields = { airline_id, flight_number, source, destination, departure_time, arrival_time, total_seats, price };
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) {
        updates.push(`${key} = ?`);
        values.push(val);
      }
    }

    if (updates.length === 0) {
      return next(new ValidationError("No fields to update"));
    }

    if (total_seats !== undefined) {
      const seatDiff = total_seats - flight.total_seats;
      const newAvailable = flight.available_seats + seatDiff;
      if (newAvailable < 0) {
        return next(new ValidationError("Cannot reduce total seats below booked count"));
      }
      updates.push("available_seats = ?");
      values.push(newAvailable);
    }

    values.push(req.params.id);
    db.run(`UPDATE flights SET ${updates.join(", ")} WHERE id = ?`, values);
    saveDb();

    const updated = rowToObject(
      db.exec(
        `SELECT f.*, a.name as airline_name, a.code as airline_code
         FROM flights f JOIN airlines a ON f.airline_id = a.id WHERE f.id = ?`,
        [req.params.id]
      )
    );

    res.json({ success: true, message: "Flight updated", data: { flight: updated } });
  } catch (err) {
    next(err);
  }
}

async function deleteFlight(req, res, next) {
  try {
    const db = await getDb();
    const flight = rowToObject(db.exec("SELECT * FROM flights WHERE id = ?", [req.params.id]));
    if (!flight) return next(new NotFoundError("Flight"));

    const activeBookings = db.exec(
      "SELECT COUNT(*) as count FROM bookings WHERE flight_id = ? AND status = 'confirmed'",
      [req.params.id]
    );
    if (activeBookings.length > 0 && activeBookings[0].values[0][0] > 0) {
      return next(new ValidationError("Cannot delete flight with active bookings"));
    }

    db.run("DELETE FROM flights WHERE id = ?", [req.params.id]);
    saveDb();
    res.json({ success: true, message: "Flight deleted" });
  } catch (err) {
    next(err);
  }
}

async function searchFlights(req, res, next) {
  try {
    const { source, destination, date, min_price, max_price } = req.query;
    const db = await getDb();

    let query = `
      SELECT f.*, a.name as airline_name, a.code as airline_code
      FROM flights f
      JOIN airlines a ON f.airline_id = a.id
      WHERE f.available_seats > 0
    `;
    const params = [];

    if (source) {
      query += " AND LOWER(f.source) = LOWER(?)";
      params.push(source);
    }
    if (destination) {
      query += " AND LOWER(f.destination) = LOWER(?)";
      params.push(destination);
    }
    if (date) {
      query += " AND DATE(f.departure_time) = DATE(?)";
      params.push(date);
    }
    if (min_price) {
      query += " AND f.price >= ?";
      params.push(parseFloat(min_price));
    }
    if (max_price) {
      query += " AND f.price <= ?";
      params.push(parseFloat(max_price));
    }

    query += " ORDER BY f.departure_time ASC";

    const flights = rowsToArray(db.exec(query, params));
    res.json({
      success: true,
      data: {
        flights,
        count: flights.length,
        filters: { source, destination, date, min_price, max_price },
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createFlight, getFlights, getFlightById, updateFlight, deleteFlight, searchFlights };
