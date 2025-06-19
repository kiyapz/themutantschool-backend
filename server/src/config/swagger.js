import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// Dynamically choose the base URL based on the environment
const serverUrl =
  process.env.NODE_ENV === "production"
    ? "https://themutantschool-backend.onrender.com"
    : "http://localhost:3000";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "The Mutant School API",
      version: "1.0.0",
      description: "API documentation for the Mutant School platform",
    },
    servers: [
      {
        url: serverUrl,
        description:
          process.env.NODE_ENV === "production"
            ? "Production (Render)"
            : "Local dev server",
      },
    ],
    tags: [
      { name: "Auth", description: "Authentication and user management" },
      { name: "User", description: "User profile operations" },
      { name: "Institution", description: "Institution profile operations" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        cookieRefreshToken: {
          type: "apiKey",
          in: "cookie",
          name: "refreshToken",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.js"], // Adjust if your routes are elsewhere
};

export const swaggerSpec = swaggerJSDoc(options);
export const swaggerUiHandler = swaggerUi.serve;
export const swaggerDocsHandler = swaggerUi.setup(swaggerSpec);
