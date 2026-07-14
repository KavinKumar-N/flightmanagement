const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDb, saveDb } = require("../config/database");
const { ConflictError, UnauthorizedError, NotFoundError } = require("../utils/errors");

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const db = await getDb();

    const existing = db.exec("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return next(new ConflictError("Email already registered"));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    db.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [
      name,
      email,
      hashedPassword,
    ]);

    saveDb();
    const userId = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];

    const token = jwt.sign(
      { id: userId, email, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: { id: userId, name, email, role: "user" },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const db = await getDb();

    const result = db.exec("SELECT * FROM users WHERE email = ?", [email]);
    if (result.length === 0 || result[0].values.length === 0) {
      return next(new UnauthorizedError("Invalid email or password"));
    }

    const cols = result[0].columns;
    const row = result[0].values[0];
    const user = {};
    cols.forEach((col, i) => (user[col] = row[i]));

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(new UnauthorizedError("Invalid email or password"));
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    const db = await getDb();
    const result = db.exec("SELECT id, name, email, role, created_at FROM users WHERE id = ?", [
      req.user.id,
    ]);

    if (result.length === 0 || result[0].values.length === 0) {
      return next(new NotFoundError("User"));
    }

    const cols = result[0].columns;
    const row = result[0].values[0];
    const user = {};
    cols.forEach((col, i) => (user[col] = row[i]));

    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getProfile };
