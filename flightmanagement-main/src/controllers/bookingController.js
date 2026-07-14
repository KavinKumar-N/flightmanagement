const { getDb, saveDb } = require("../config/database");
const { NotFoundError, ValidationError, ConflictError } = require("../utils/errors");

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

async function createBooking(req, res, next) {
  try {
    const { flight_id, seats_booked } = req.body;
    const db = await getDb();

    const flight = rowToObject(
      db.exec(
        `SELECT f.*, a.name as airline_name, a.code as airline_code
         FROM flights f JOIN airlines a ON f.airline_id = a.id
         WHERE f.id = ?`,
        [flight_id]
      )
    );
    if (!flight) return next(new NotFoundError("Flight"));

    if (flight.available_seats < seats_booked) {
      return next(
        new ConflictError(
          `Only ${flight.available_seats} seats available on flight ${flight.flight_number}`
        )
      );
    }

    const existingBooking = db.exec(
      "SELECT id FROM bookings WHERE user_id = ? AND flight_id = ? AND status = 'confirmed'",
      [req.user.id, flight_id]
    );
    if (existingBooking.length > 0 && existingBooking[0].values.length > 0) {
      return next(new ConflictError("You already have an active booking on this flight"));
    }

    const total_price = flight.price * seats_booked;

    db.run("BEGIN TRANSACTION");
    try {
      db.run(
        `INSERT INTO bookings (user_id, flight_id, seats_booked, total_price)
         VALUES (?, ?, ?, ?)`,
        [req.user.id, flight_id, seats_booked, total_price]
      );

      db.run(
        "UPDATE flights SET available_seats = available_seats - ? WHERE id = ?",
        [seats_booked, flight_id]
      );

      db.run("COMMIT");
    } catch (e) {
      db.run("ROLLBACK");
      throw e;
    }

    const bookingId = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];
    const booking = rowToObject(
      db.exec(
        `SELECT b.*, f.flight_number, f.source, f.destination, f.departure_time, f.arrival_time,
                a.name as airline_name, a.code as airline_code
         FROM bookings b
         JOIN flights f ON b.flight_id = f.id
         JOIN airlines a ON f.airline_id = a.id
         WHERE b.id = ?`,
        [bookingId]
      )
    );

    saveDb();

    res.status(201).json({
      success: true,
      message: "Flight booked successfully",
      data: { booking },
    });
  } catch (err) {
    next(err);
  }
}

async function getBookingById(req, res, next) {
  try {
    const db = await getDb();
    const booking = rowToObject(
      db.exec(
        `SELECT b.*, f.flight_number, f.source, f.destination, f.departure_time, f.arrival_time,
                f.price as ticket_price, a.name as airline_name, a.code as airline_code,
                u.name as passenger_name, u.email as passenger_email
         FROM bookings b
         JOIN flights f ON b.flight_id = f.id
         JOIN airlines a ON f.airline_id = a.id
         JOIN users u ON b.user_id = u.id
         WHERE b.id = ?`,
        [req.params.id]
      )
    );

    if (!booking) return next(new NotFoundError("Booking"));

    if (booking.user_id !== req.user.id && req.user.role !== "admin") {
      return next(new ValidationError("You can only view your own bookings"));
    }

    res.json({ success: true, data: { booking } });
  } catch (err) {
    next(err);
  }
}

async function getMyBookings(req, res, next) {
  try {
    const db = await getDb();
    const bookings = rowsToArray(
      db.exec(
        `SELECT b.*, f.flight_number, f.source, f.destination, f.departure_time, f.arrival_time,
                f.price as ticket_price, a.name as airline_name, a.code as airline_code
         FROM bookings b
         JOIN flights f ON b.flight_id = f.id
         JOIN airlines a ON f.airline_id = a.id
         WHERE b.user_id = ?
         ORDER BY b.booking_date DESC`,
        [req.user.id]
      )
    );

    res.json({ success: true, data: { bookings, count: bookings.length } });
  } catch (err) {
    next(err);
  }
}

async function updateBooking(req, res, next) {
  try {
    const { seats_booked } = req.body;
    const db = await getDb();

    const booking = rowToObject(
      db.exec("SELECT * FROM bookings WHERE id = ?", [req.params.id])
    );
    if (!booking) return next(new NotFoundError("Booking"));
    if (booking.status === "cancelled") {
      return next(new ValidationError("Cannot update a cancelled booking"));
    }
    if (booking.user_id !== req.user.id) {
      return next(new ValidationError("You can only update your own bookings"));
    }

    const flight = rowToObject(db.exec("SELECT * FROM flights WHERE id = ?", [booking.flight_id]));
    const seatDiff = seats_booked - booking.seats_booked;
    const newAvailable = flight.available_seats - seatDiff;

    if (newAvailable < 0) {
      return next(
        new ConflictError(
          `Only ${flight.available_seats + booking.seats_booked} seats available on this flight`
        )
      );
    }

    const newTotalPrice = flight.price * seats_booked;

    db.run("BEGIN TRANSACTION");
    try {
      db.run("UPDATE bookings SET seats_booked = ?, total_price = ? WHERE id = ?", [
        seats_booked,
        newTotalPrice,
        req.params.id,
      ]);
      db.run("UPDATE flights SET available_seats = ? WHERE id = ?", [newAvailable, flight.id]);
      db.run("COMMIT");
    } catch (e) {
      db.run("ROLLBACK");
      throw e;
    }

    const updated = rowToObject(
      db.exec(
        `SELECT b.*, f.flight_number, f.source, f.destination, f.departure_time, f.arrival_time,
                a.name as airline_name, a.code as airline_code
         FROM bookings b
         JOIN flights f ON b.flight_id = f.id
         JOIN airlines a ON f.airline_id = a.id
         WHERE b.id = ?`,
        [req.params.id]
      )
    );

    saveDb();

    res.json({ success: true, message: "Booking updated", data: { booking: updated } });
  } catch (err) {
    next(err);
  }
}

async function cancelBooking(req, res, next) {
  try {
    const db = await getDb();

    const booking = rowToObject(
      db.exec("SELECT * FROM bookings WHERE id = ?", [req.params.id])
    );
    if (!booking) return next(new NotFoundError("Booking"));
    if (booking.status === "cancelled") {
      return next(new ValidationError("Booking is already cancelled"));
    }
    if (booking.user_id !== req.user.id) {
      return next(new ValidationError("You can only cancel your own bookings"));
    }

    db.run("BEGIN TRANSACTION");
    try {
      db.run("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [req.params.id]);
      db.run(
        "UPDATE flights SET available_seats = available_seats + ? WHERE id = ?",
        [booking.seats_booked, booking.flight_id]
      );
      db.run("COMMIT");
    } catch (e) {
      db.run("ROLLBACK");
      throw e;
    }

    saveDb();

    res.json({ success: true, message: "Booking cancelled successfully" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBooking,
  getBookingById,
  getMyBookings,
  updateBooking,
  cancelBooking,
};
