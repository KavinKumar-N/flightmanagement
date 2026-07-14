const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Flight Booking System API",
      version: "1.0.0",
      description:
        "A RESTful API for searching flights, booking tickets, managing reservations, and viewing booking history.",
      contact: { name: "API Support" },
      license: { name: "ISC" },
    },
    servers: [{ url: "http://localhost:3000", description: "Development server" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            role: { type: "string", enum: ["user", "admin"] },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Airline: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            code: { type: "string", description: "IATA 2-letter code" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Flight: {
          type: "object",
          properties: {
            id: { type: "integer" },
            airline_id: { type: "integer" },
            airline_name: { type: "string" },
            airline_code: { type: "string" },
            flight_number: { type: "string" },
            source: { type: "string" },
            destination: { type: "string" },
            departure_time: { type: "string", format: "date-time" },
            arrival_time: { type: "string", format: "date-time" },
            total_seats: { type: "integer" },
            available_seats: { type: "integer" },
            price: { type: "number" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Booking: {
          type: "object",
          properties: {
            id: { type: "integer" },
            user_id: { type: "integer" },
            flight_id: { type: "integer" },
            seats_booked: { type: "integer" },
            total_price: { type: "number" },
            status: { type: "string", enum: ["confirmed", "cancelled"] },
            booking_date: { type: "string", format: "date-time" },
            flight_number: { type: "string" },
            source: { type: "string" },
            destination: { type: "string" },
            departure_time: { type: "string", format: "date-time" },
            arrival_time: { type: "string", format: "date-time" },
            airline_name: { type: "string" },
            airline_code: { type: "string" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "User registration and login" },
      { name: "Airlines", description: "Manage airlines (admin only)" },
      { name: "Flights", description: "Manage and search flights" },
      { name: "Bookings", description: "Book and manage reservations" },
    ],
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
