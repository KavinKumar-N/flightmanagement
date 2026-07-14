const Joi = require("joi");

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const airlineSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  code: Joi.string().length(2).uppercase().required(),
});

const airlineUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  code: Joi.string().length(2).uppercase(),
}).min(1);

const flightSchema = Joi.object({
  airline_id: Joi.number().integer().positive().required(),
  flight_number: Joi.string().min(3).max(10).required(),
  source: Joi.string().min(2).max(100).required(),
  destination: Joi.string().min(2).max(100).required(),
  departure_time: Joi.date().iso().required(),
  arrival_time: Joi.date().iso().greater(Joi.ref("departure_time")).required(),
  total_seats: Joi.number().integer().positive().required(),
  price: Joi.number().positive().required(),
});

const flightUpdateSchema = Joi.object({
  airline_id: Joi.number().integer().positive(),
  flight_number: Joi.string().min(3).max(10),
  source: Joi.string().min(2).max(100),
  destination: Joi.string().min(2).max(100),
  departure_time: Joi.date().iso(),
  arrival_time: Joi.date().iso(),
  total_seats: Joi.number().integer().positive(),
  price: Joi.number().positive(),
}).min(1);

const bookingSchema = Joi.object({
  flight_id: Joi.number().integer().positive().required(),
  seats_booked: Joi.number().integer().positive().max(10).required(),
});

const bookingUpdateSchema = Joi.object({
  seats_booked: Joi.number().integer().positive().max(10).required(),
});

const searchSchema = Joi.object({
  source: Joi.string().min(2).max(100),
  destination: Joi.string().min(2).max(100),
  date: Joi.date().iso(),
  min_price: Joi.number().positive(),
  max_price: Joi.number().positive().greater(Joi.ref("min_price")),
}).min(1);

module.exports = {
  registerSchema,
  loginSchema,
  airlineSchema,
  airlineUpdateSchema,
  flightSchema,
  flightUpdateSchema,
  bookingSchema,
  bookingUpdateSchema,
  searchSchema,
};
