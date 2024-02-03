// Import necessary modules and create an Express app
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import ejs from "ejs";
import axios from "axios";

// Set up Express app and database connection pool
const app = express();
const port = 3000;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
const dbConfig = { user: "postgres", host: "localhost", database: "books", password: "Krava12346073@#!%", port: 5432 };
const pool = new pg.Pool(dbConfig);

// Create an Axios instance with custom settings
const axiosInstance = axios.create({ maxSockets: 100, maxFreeSockets: 10, timeout: 60000 });

// Cache to store book cover URLs for efficient retrieval
const coverCache = {};

// Function to search for a book and retrieve its cover URL
const searchBook = async (title) => {
  try {
    // Check if the cover URL is already in the cache
    if (coverCache[title]) {
      console.log('Cover URL (from cache):', coverCache[title]);
      return coverCache[title];
    };

    // Make a request to the Open Library API
    const response = await axiosInstance.get(`https://openlibrary.org/search.json?q=${encodeURIComponent(title)}`);
    const books = response.data.docs;

    if (title != "undefined") {
      const firstBook = books[0];
      const coverUrl = `https://covers.openlibrary.org/b/id/${firstBook.cover_i}-L.jpg`;

      if(coverUrl === "https://covers.openlibrary.org/b/id/undefined-L.jpg") {
        window.alert("Book not found, please check yours spelling.")
      } else {
        // Cache the cover URL with the title as the key
        coverCache[title] = coverUrl;

        console.log('Cover URL:', coverUrl);
        return coverUrl;
      };
    } else {
      console.log('Book not found.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching book information:', error.message);
    return null;
  }
};

// Function to fetch book covers for an array of books in parallel
const fetchBookCovers = async (books) => {
  try {
    const promises = books.map(book => searchBook(book.title));
    const bookCoverLinks = await Promise.all(promises);

    console.log(bookCoverLinks);
    return bookCoverLinks.filter(link => link !== null);
  } catch (error) {
    console.error('Error fetching book covers:', error.message);
    return [];
  };
};

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Handle GET requests to the root URL
app.get("/", async (req, res) => {
  try {
    // Query all books from the database
    const { rows } = await pool.query("SELECT * FROM books");
    const fetchedBooks = rows;

    // Wait for all asynchronous book cover fetches to complete
    const bookCoverLinks = await fetchBookCovers(fetchedBooks);

    // Render the EJS template with book and cover data
    res.render("index.ejs", { books: fetchedBooks, book_cover: bookCoverLinks });
  } catch (error) {
    console.error('Error handling GET request:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Handle POST request to edit an existing book
app.post("/edit", async (req, res) => {
  try {
    // Extract data from the request body
    const { updatedTitle, updatedDescription, updatedRating, updatedBookId } = req.body;

    // Update the book in the database using a prepared statement
    await pool.query("UPDATE books SET title = $1, description = $2, rating = $3 WHERE id = $4",
      [updatedTitle, updatedDescription, updatedRating, updatedBookId]);

    // Redirect to the home page after successful update
    res.redirect("/");
  } catch (error) {
    // Log and handle errors, sending an internal server error status
    console.error('Error handling POST request for editing a book:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Handle POST request to add a new book
app.post("/add", async (req, res) => {
  try {
    // Extract data from the request body
    const { newTitle, newDescription, newRating } = req.body;

    // Insert a new book into the database
    await pool.query("INSERT INTO books (title, description, rating) VALUES ($1, $2, $3)", [newTitle, newDescription, newRating]);

    res.redirect('/'); // Redirect to the home page
  } catch (error) {
    console.error('Error handling POST request for adding a book:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Handle POST request to delete a book
app.post("/delete", async (req, res) => {
  try {
    // Extract data from the request body
    const { deleteBookId } = req.body;

    // Delete the book from the database
    await pool.query("DELETE FROM books WHERE id = $1", [deleteBookId]);

    res.redirect("/"); // Redirect to the home page
  } catch (error) {
    console.error('Error handling POST request for deleting a book:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
