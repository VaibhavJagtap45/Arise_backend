// Reusable request validator. Parses `req[source]` with the given zod schema,
// stores the parsed (coerced + defaulted) result on `req.validated`, and hands
// ZodErrors to the centralized errorHandler (which already renders them as a
// 400 with field details). Keeps validation at the route edge and controllers
// free of parsing boilerplate.
//
// Usage:
//   router.post("/add-meal", validate(AddMealSchema), ...)
//   router.get("/monthly", validate(MonthSchema, "query"), ...)
export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    try {
      req.validated = schema.parse(req[source]);
      next();
    } catch (error) {
      next(error);
    }
  };
