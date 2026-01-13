package main

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/sipneat/wids-datathon-2025/backend/handlers"
)

func main() {
	r := gin.Default()

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})
	r.GET("/example", handlers.ExampleHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	r.Run(":" + port)
}
