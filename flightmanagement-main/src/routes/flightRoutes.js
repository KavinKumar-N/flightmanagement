const express = require("express");
const {
  createFlight,
  getFlights,
  getFlightById,
  updateFlight,
  deleteFlight,
  searchFlights,
} = require("../controllers/flightController");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { flightSchema, flightUpdateSchema } = require("../utils/validators");

const router = express.Router();

/**
 * @swagger
 * /api/flights/search:
 *   get:
 *     tags: [Flights]
 *     summary: Search flights by source, destination, date, and price range
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Departure city
 *       - in: query
 *         name: destination
 *         schema:
 *           type: string
 *         description: Arrival city
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Travel date (YYYY-MM-DD)
 *       - in: query
 *         name: min_price
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *         description: Maximum price
 *     responses:
 *       200:
 *         description: Matching flights
 */
router.get("/search", searchFlights);

/**
 * @swagger
 * /api/flights:
 *   get:
 *     tags: [Flights]
 *     summary: Get all flights
 *     responses:
 *       200:
 *         description: List of all flights
 */
router.get("/", getFlights);

/**
 * @swagger
 * /api/flights/{id}:
 *   get:
 *     tags: [Flights]
 *     summary: Get flight by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Flight details
 *       404:
 *         description: Flight not found
 */
router.get("/:id", getFlightById);

/**
 * @swagger
 * /api/flights:
 *   post:
 *     tags: [Flights]
 *     summary: Create a new flight (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [airline_id, flight_number, source, destination, departure_time, arrival_time, total_seats, price]
 *             properties:
 *               airline_id:
 *                 type: integer
 *               flight_number:
 *                 type: string
 *                 example: "6E-201"
 *               source:
 *                 type: string
 *                 example: "Delhi"
 *               destination:
 *                 type: string
 *                 example: "Mumbai"
 *               departure_time:
 *                 type: string
 *                 format: date-time
 *               arrival_time:
 *                 type: string
 *                 format: date-time
 *               total_seats:
 *                 type: integer
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Flight created
 *       400:
 *         description: Validation error
 */
router.post("/", authenticate, authorize("admin"), validate(flightSchema), createFlight);

/**
 * @swagger
 * /api/flights/{id}:
 *   put:
 *     tags: [Flights]
 *     summary: Update a flight (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               airline_id:
 *                 type: integer
 *               flight_number:
 *                 type: string
 *               source:
 *                 type: string
 *               destination:
 *                 type: string
 *               departure_time:
 *                 type: string
 *                 format: date-time
 *               arrival_time:
 *                 type: string
 *                 format: date-time
 *               total_seats:
 *                 type: integer
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Flight updated
 *       404:
 *         description: Flight not found
 */
router.put("/:id", authenticate, authorize("admin"), validate(flightUpdateSchema), updateFlight);

/**
 * @swagger
 * /api/flights/{id}:
 *   delete:
 *     tags: [Flights]
 *     summary: Delete a flight (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Flight deleted
 *       404:
 *         description: Flight not found
 */
router.delete("/:id", authenticate, authorize("admin"), deleteFlight);

module.exports = router;
