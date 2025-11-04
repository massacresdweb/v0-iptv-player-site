export const errorHandler = (err, req, res, next) => {
  console.error("[v0] Error:", err)

  // Don't leak error details in production
  const isDev = process.env.NODE_ENV === "development"

  res.status(err.status || 500).json({
    error: isDev ? err.message : "Bir hata oluştu",
    ...(isDev && { stack: err.stack }),
  })
}
