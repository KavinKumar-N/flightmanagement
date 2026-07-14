const express = require("express");
const {
  createAirline,
  getAirlines,
  getAirlineById,
  updateAirline,
  deleteAirline,
} = require("../controllers/airlineController");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { airlineSchema, airlineUpdateSchema } = require("../utils/validators");

const router = express.Router();

/**
 * @swagger
 * /api/airlines:
 *   get:
 *     tags: [Airlines]
 *     summary: Get all airlines
 *     responses:
 *       200:
 *         description: List of airlines
 */
router.get("/", getAirlines);

/**
 * @swagger
 * /api/airlines/{id}:
 *   get:
 *     tags: [Airlines]
 *     summary: Get airline by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Airline details
 *       404:
 *         description: Airline not found
 */
router.get("/:id", getAirlineById);

/**
 * @swagger
 * /api/airlines:
 *   post:
 *     tags: [Airlines]
 *     summary: Create a new airline (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "IndiGo Airlines"
 *               code:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 2
 *                 example: "6E"
 *     responses:
 *       201:
 *         description: Airline created
 *       409:
 *         description: Airline code already exists
 */
router.post("/", authenticate, authorize("admin"), validate(airlineSchema), createAirline);

/**
 * @swagger
 * /api/airlines/{id}:
 *   put:
 *     tags: [Airlines]
 *     summary: Update an airline (admin only)
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
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Airline updated
 *       404:
 *         description: Airline not found
 */
router.put("/:id", authenticate, authorize("admin"), validate(airlineUpdateSchema), updateAirline);

/**
 * @swagger
 * /api/airlines/{id}:
 *   delete:
 *     tags: [Airlines]
 *     summary: Delete an airline (admin only)
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
 *         description: Airline deleted
 *       404:
 *         description: Airline not found
 */
router.delete("/:id", authenticate, authorize("admin"), deleteAirline);

module.exports = router;
