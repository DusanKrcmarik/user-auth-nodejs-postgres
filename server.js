const express = require("express");
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
require("dotenv").config();
const app = express();

const PORT = process.env.PORT || 3000;

const initializePassport = require("./passportConfig");

initializePassport(passport);

//Setting up ejs as view engine
app.use(express.urlencoded({extended: false}))
app.set('view engine', 'ejs');


//Setting up session middleware
app.use(session
    ({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUnitialized: false
}))

//Setting up passport middleware
app.use(passport.initialize());
app.use(passport.session());

//Displaying flash messages
app.use(flash())

//Basic routing
app.get("/", (req, res) => {
    res.render("index");
  });
  
  app.get("/users/register", checkAuthenticated, (req, res) => {
    res.render("register.ejs");
  });
  
  app.get("/users/login", checkAuthenticated, (req, res) => {
    // flash sets a messages variable. passport sets the error message
    console.log(req.session.flash.error);
    res.render("login.ejs");
  });
  
  app.get("/users/dashboard", checkNotAuthenticated, (req, res) => {
    console.log(req.isAuthenticated());
    res.render("dashboard", { user: req.user.name });
  });

  app.get("/users/logout", (req, res) => {
    req.logout();
    res.render("index", { message: "You have logged out successfully" });
  });

//Register validation check
app.post("/users/register", async (req, res) => {
    let { name, email, password, password2 } = req.body;
  
    let errors = [];
  
    console.log({
      name,
      email,
      password,
      password2
    });
  
    if (!name || !email || !password || !password2) {
      errors.push({ message: "Please enter all fields" });
    }
  
    if (password.length < 6) {
      errors.push({ message: "Password must be a least 6 characters long" });
    }
  
    if (password !== password2) {
      errors.push({ message: "Passwords do not match" });
    }
  
    if (errors.length > 0) {
      res.render("register", { errors, name, email, password, password2 });
    } else {
        //Password encryption with bcrypt
      hashedPassword = await bcrypt.hash(password, 10);
      console.log(hashedPassword);
      // Validation passed, querying database
      pool.query(
        `SELECT * FROM users
          WHERE email = $1`,
        [email],
        (err, results) => {
          if (err) {
            console.log(err);
          }
          console.log(results.rows);
  
          if (results.rows.length > 0) {
            return res.render("register", {
              message: "Email already registered"
            });
          } else {
            pool.query(
              `INSERT INTO users (name, email, password)
                  VALUES ($1, $2, $3)
                  RETURNING id, password`,
              [name, email, hashedPassword],
              (err, results) => {
                if (err) {
                  throw err;
                }
                console.log(results.rows);
                req.flash("success_msg", "You are now registered. Please log in");
                res.redirect("/users/login");
              }
            );
          }
        }
      );
    }
  });

  app.post(
    "/users/login",
    passport.authenticate("local", {
      successRedirect: "/users/dashboard",
      failureRedirect: "/users/login",
      failureFlash: true
    })
  );
  
  //redirect after authentication
  function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect("/users/dashboard");
    }
    next();
  }
  
  function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect("/users/login");
  }
  


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})