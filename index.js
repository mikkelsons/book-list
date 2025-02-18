import express from "express";
import bodyParser from "body-parser";
import ejs from "ejs";
import pg from "pg";
// import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;
app.set("view engine", "ejs");

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

function newDate() {
  let date = new Date();
  let year = date.getFullYear();
  let month = date.getMonth(); // 0-11, so add 1 for human-readable format
  let day = date.getDate();
  return `${month + 1}-${day}-${year}`;
}

// Use this as an example of how to format your SQL table:
let books = [
  {
    id: 1,
    book_title: "Moby Dick",
    isbn: "0143105957",
    book_description:
      "Considered by some to be the number one piece of English literature, Moby Dick tells the story of Captain Ahab's revenge against the whale who took his leg. The story is told through the point of view of Ishmael, the protagonist who decides to put out to sea on a whaling voyage to see what it is all about. He befriends an experienced Pacific islander harpooner, and the two of them ship off from Nantucket in the Peaquod.\n \n The story balances both narrative as well as philosophical musings. We even see a chapter on whale taxonomy.\n \n An excellent read, and worthy of the title 'Classic'.",
    date: "2-14-2025",
  },
];

let currentSort = { field: "id", order: "ASC" };
let isFirstLoad = true;
let sortingApplied = false;

app.get("/", async (req, res) => {
  try {
    let sortField = req.query.sortField;
    let sortOrder = req.query.sortOrder;

    const validSortFields = ["book_title", "date", "id", "author"];
    let field, order;

    // If the same field is selected, toggle the order

    if (isFirstLoad && !sortField && !sortOrder) {
      field = "id";
      order = "ASC";
      isFirstLoad = false;
    } else {
      field = validSortFields.includes(sortField)
        ? sortField
        : currentSort.field;

      if (sortField && sortField === currentSort.field) {
        order = currentSort.order === "ASC" ? "DESC" : "ASC";
      } else {
        order = sortOrder
          ? sortOrder.toUpperCase() === "DESC"
            ? "DESC"
            : "ASC"
          : "ASC";
      }
      sortingApplied = true;
    }

    currentSort = { field, order };

    const result = await db.query(
      `SELECT * FROM books ORDER BY ${field} ${order}`
    );
    res.render("index.ejs", {
      books: result.rows,
      currentSort: currentSort,
      sortingApplied: sortingApplied,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching posts" });
  }
});

app.get("/new", (req, res) => {
  res.render("modify.ejs", { heading: "New Post", submit: "Create Post" });
});

app.post("/newPost", async (req, res) => {
  const title = req.body.title;
  const content = req.body.content;
  const isbn = req.body.isbn;
  const date = newDate();
  const author = req.body.author;

  try {
    await db.query(
      "INSERT INTO books (book_title, isbn, book_description, date, author) VALUES ($1, $2, $3, $4, $5)",
      [title, isbn, content, date, author]
    );
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.get("/edit/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM books WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rows.length > 0) {
      res.render("modify.ejs", {
        heading: "Edit Post",
        submit: "Update Post",
        book: result.rows[0],
      });
    } else {
      res.status(404).json({ message: "Book not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching book" });
  }
});

app.post("/edit", async (req, res) => {
  const id = req.body.id;
  const book = req.body.updatedBookTitle;
  const content = req.body.updatedContent;
  const isbn = req.body.updatedIsbn;
  const author = req.body.updatedAuthor;

  try {
    await db.query(
      "UPDATE books SET book_title = $1, isbn = $2, book_description = $3, author = $4 WHERE id = $5",
      [book, isbn, content, author, id]
    );
    res.redirect("/");
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error updating book" });
  }
});

app.post("/delete/:id", async (req, res) => {
  try {
    const result = await db.query("DELETE FROM books WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rowCount === 0) {
      res.status(404).json({ message: "Book not found" });
    } else {
      res.redirect("/");
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error deleting book" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
