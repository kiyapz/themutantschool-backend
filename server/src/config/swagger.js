import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

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
        url: "http://localhost:3000",
        description: "Local dev server",
      },
      {
        url: "https://themutantschool-backend.onrender.com",
        description: "Production (Render)",
      },
    ],
    tags: [{ name: "Auth", description: "Authentication and user management" }],
  },
  apis: ["./src/routes/*.js"],
};

export const swaggerSpec = swaggerJSDoc(options);
export const swaggerUiHandler = swaggerUi.serve;
export const swaggerDocsHandler = swaggerUi.setup(swaggerSpec);
