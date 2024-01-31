import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import ejs from "ejs";
import axios from "axios";


const app = express();
const port = 3000;


app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("/public"));


let books = [];
const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "books",
    password: "Krava12346073@#!%",
    port: 5432,
});

db.connect();

const searchBook = async (title) => {
    try {
    const response = await axios.get(`https://openlibrary.org/search.json?q=${encodeURIComponent(title)}`);
    const books = response.data.docs;
    if (books.length > 0) {
        const firstBook = books[0];
        const coverUrl = `https://covers.openlibrary.org/b/id/${firstBook.cover_i}-L.jpg`;
        console.log('Cover URL:', coverUrl);
    } else {
        console.log('Book not found.');
    }
    } catch (error) {
    console.error('Error fetching book information:', error.message);
    }
};

app.get("/", async (req, res) => {

    const result = await db.query("SELECT * FROM books");
    books = result.rows;
    console.log(books);


    books.forEach(book => {
        searchBook(book.title);
    });

    searchBook('The Great Gatsby');
    

    res.render("index.ejs", {books: books})
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
