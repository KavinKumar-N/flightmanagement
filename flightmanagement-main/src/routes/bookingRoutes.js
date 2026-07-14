const express = require("express");
const {
  createBooking,
  getBookingById,
  getMyBookings,
  updateBooking,
  cancelBooking,
} = require("../controllers/bookingController");
const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { bookingSchema, bookingUpdateSchema } = require("../utils/validators");

const router = express.Router();

/**
 * @swagger
 * /api/bookings/my:
 *   get:
 *     tags: [Bookings]
 *     summary: Get current user's booking history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's bookings
 *       401:
 *         description: Unauthorized
 */
router.get("/my", authenticate, getMyBookings);

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Get booking by ID
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
 *         description: Booking details
 *       404:
 *         description: Booking not found
 */
router.get("/:id", authenticate, getBookingById);

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     tags: [Bookings]
 *     summary: Book a flight ticket
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [flight_id, seats_booked]
 *             properties:
 *               flight_id:
 *                 type: integer
 *               seats_booked:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *     responses:
 *       201:
 *         description: Flight booked successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Not enough seats or duplicate booking
 */
router.post("/", authenticate, validate(bookingSchema), createBooking);

/**
 * @swagger
 * /api/bookings/{id}:
 *   put:
 *     tags: [Bookings]
 *     summary: Update seat count for a booking
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
 *             required: [seats_booked]
 *             properties:
 *               seats_booked:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *     responses:
 *       200:
 *         description: Booking updated
 *       400:
 *         description: Validation error
 *       409:
 *         description: Not enough seats
 */
router.put("/:id", authenticate, validate(bookingUpdateSchema), updateBooking);

/**
 * @swagger
 * /api/bookings/{id}:
 *   delete:
 *     tags: [Bookings]
 *     summary: Cancel a booking (restores seats)
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
 *         description: Booking cancelled
 *       400:
 *         description: Already cancelled
 *       404:
 *         description: Booking not found
 */
router.delete("/:id", authenticate, cancelBooking);

module.exports = router;
