
const express = require('express');
const jsonwebtoken = require('jsonwebtoken');
const bcrypt = require('bcrypt');//הוספתי בגלל הצ'ט
//const myRepository = require('./myRepository');
const myRepository = require('./myRepository');
const app = express();
const port = 3001;
const SECRET_KEY = 'my_amazing_salt';

// Middleware to parse JSON data
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // This is for parsing form data (application/x-www-form-urlencoded)
// Static file serving (assuming your HTML files are in the "public" folder)
app.use(express.static('public'));

app.get('/hello', (req, res) => {
    res.send('hello world');
});
///סעיף 10
// Middleware לאימות ה-token
function authenticateToken(req, res, next) {
    // קבלת ה-token מה-cookie
    const token = req.cookies.auth_token;
    if (!token) {
        return res.status(401).send('Not authorized');
    }

    // פענוח ה-token
    jsonwebtoken.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).send('Forbidden');
        }
        req.user = user; // שמירה של המידע מה-token ב-req.user
        next(); // המשך ביצוע הפונקציה הבאה
    });
}

// ה-handler למסלול /protected
app.get('/protected', authenticateToken, (req, res) => {
    // אם ה-token תקף, נחזיר את המידע של המשתמש
    res.status(200).send(`Welcome to the protected route, ${req.user.username}`);
});
///
app.post('/signUp', async (req, res) => {
    const { username, email, password } = req.body; // Getting username,email,password and  from the form data
    try {
        // Check if user already exists (optional, based on your needs)
        const existingUser = await myRepository.getUserDetailsByUsername(username);
        if (existingUser) {
            return res.status(400).send('User already exists.');
        }
        // Hash the password using bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        // Store the user details in the database with the hashed password
        await myRepository.createUser(username, email, hashedPassword);
        // After user is created, generate a JWT token for the user
        const token = jsonwebtoken.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
        // Send the JWT token and a success response
        res.status(201).json({
            message: 'User created successfully!',
            token: token // Send the token to the client
        });
    }
    catch (error) {
        console.error('Error creating user:', error);
        res.status(500).send('Internal server error.');
    }
});

////
app.post('/signin', async (req, res) => {
    const { username, password } = req.body; // Getting username and password from the request body

    try {
        // Get user details from the database
        const user = await myRepository.getUserDetailsByUsername(username);

        // If the user is not found
        if (!user) {
            return res.status(401).send('Not authorized'); // Return 401 Unauthorized
        }

        // Compare the entered password with the hashed password from the database
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (isPasswordValid) {
            // אם הסיסמאות תואמות, יצירת JWT עם שם המשתמש
            const token = jsonwebtoken.sign({ username }, SECRET_KEY, { expiresIn: '1h' });

            // שליחה של ה-cookie למשתמש עם ה-token
            res.cookie('auth_token', token, {
                httpOnly: true,          // לא ניתן לגשת אליו מה-client-side JavaScript
                secure: process.env.NODE_ENV === 'production', // true רק אם אנחנו בסביבת פרודקשן
                maxAge: 3600000,         // זמן פקיעת ה-cookie (1 שעה)
            });

            // If the passwords match, send a welcome message
            res.status(200).send('Welcome');
        } else {
            // If the passwords don't match, return 401 Unauthorized
            res.status(401).send('Not authorized');
        }
    } catch (error) {
        console.error('Error during signin:', error);
        res.status(500).send('Internal server error');
    }
});
////
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});








// app.post('/login', async (req, res) => {
//     const { uname, pass } = req.body;
//     const result = await myRepository.checkIfUserLoginValid(uname, pass);
//     if (result === 'ok') {
//         //create jwt

//         const payloadForOurJwtToken = { uname, dateOfSignIn: new Date().toLocaleString() };
//         const theToken = jsonwebtoken.sign(payloadForOurJwtToken, SECRET_KEY, { expiresIn: '2m' });
//         res.cookie('auth_token', theToken, {
//             httpOnly: true
//         });
//         res.send('welcome! you are logged in!');
//     }
//     else {
//         //return 401 (not autorised)
//         res.status(401).send();
//     }
// })


