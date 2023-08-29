const express = require('express')
const crypto = require('node:crypto')
const movies = require('./movies.json')
const app = express()
const cors = require('cors')
const { validateMovie, validatePartialMovie } = require('./schemas/movies')
const PORT = process.env.PORT || 1234

app.disable('x-powered-by')
app.use(express.json())
// app.use(cors()) Esto está poniendo el header Access-Control-Allow-Origin: * !!!!!

const ACCEPTED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:1234',
  'https://movies.com'
]

app.use(cors({
  origin: (origin, cb) => {
    if (ACCEPTED_ORIGINS.includes(origin) || !origin) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed by CORS'))
    }
  }
}))

// Todos los recursos que sean MOVIES se identifica con /movies
app.get('/movies', (req, res) => {
  const origin = req.headers.origin

  // Si la petición es del mismo ORIGIN el navegador NO te envia la cabezera origin
  if (ACCEPTED_ORIGINS.includes(origin) || !origin) {
    res.header('Access-Control-Allow-Origin', origin)
  }
  const { genre } = req.query
  if (genre) {
    const filteredMovies = movies.filter(movie =>
      movie.genre.some(g => g.toLowerCase() === genre.toLowerCase())
    )
    return res.json(filteredMovies)
  }
  res.json(movies)
})

app.get('/movies/:id', (req, res) => { // path-to-regexp (biblioteca que usa por debajo para transformar nuestro path en regex, pero podemos hacer regex directamente tambien)
  const { id } = req.params
  const movie = movies.find(movie => movie.id === id)
  if (movie) return res.json(movie)

  return res.status(404).json({ message: 'Movie not found' })
})

app.post('/movies', (req, res) => {
  const result = validateMovie(req.body)

  if (!result.success) {
    // 422 - Unprocessable Entity
    return res.status(404).json({ error: JSON.parse(result.error.message) })
  }

  const newMovie = {
    id: crypto.randomUUID(), // Te crea un uuid v4 (identificador unico universal)
    ...result.data
  }
  // Esto no sería REST, porque estamos guardando el estado de la aplicación en memoria
  // (lo haremos bien la semana que viene)
  movies.push(newMovie)

  res.status(201).json(newMovie) // actualizar la caché del cliente
})

app.delete('/movies/:id', (req, res) => {
  const origin = req.headers.origin
  console.log(origin)
  if (ACCEPTED_ORIGINS.includes(origin) || !origin) {
    console.log('entra')
    res.header('Access-Control-Allow-Origin', origin || '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE')
  }
  const { id } = req.params
  const movieIndex = movies.findIndex(movie => movie.id === id)

  if (movieIndex === -1) {
    return res.status(404).json({ message: 'Movie not found' })
  }

  movies.splice(movieIndex, 1)

  return res.json({ message: 'Movie deleted' })
})

app.patch('/movies/:id', (req, res) => {
  const { id } = req.params
  const movieIndex = movies.findIndex(movie => movie.id === id)

  const result = validatePartialMovie(req.body)

  // Al no tener el id en la validación, este no se puede actualizar!
  if (!result.success) {
    // 422 - Unprocessable Entity
    return res.status(400).json({ error: JSON.parse(result.error.message) })
  }

  if (movieIndex === -1) {
    return res.status(404).json({ message: 'Movie not found' })
  }

  const updatedMovie = {
    ...movies[movieIndex],
    ...result.data
  }

  movies[movieIndex] = updatedMovie

  return res.json(updatedMovie)
})

app.options('*', (req, res) => {
  const origin = req.headers.origin
  if (ACCEPTED_ORIGINS.includes(origin) || !origin) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE')
  }
  res.send()
})

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`)
})
