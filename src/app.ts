import express, { Request, Response, NextFunction } from 'express';
import jsonwebtoken from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import path from 'path';
import * as myRepository from './myRepository';

const app = express();
const port: number = 3001;
const SECRET_KEY: string = 'my_amazing_salt';

// Extend Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

app.use(cookieParser()); // Add this line to parse cookies

// Middleware to parse JSON data
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // This is for parsing form data (application/x-www-form-urlencoded)
// Static file serving (assuming your HTML files are in the "public" folder)
app.use(express.static('public'));

app.get('/hello', (req: Request, res: Response) => {
    res.send('hello world');
});

// Serve sign-in page at root and /login to avoid 404s when the client requests those paths
app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'signIn.html'));
});

app.get('/login', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'signIn.html'));
});

// Middleware לאימות ה-token
function authenticateToken(req: Request, res: Response, next: NextFunction): void {
    // קבלת ה-token מה-cookie
    const token: string = req.cookies.auth_token;
    if (!token) {
        res.status(401).send('Not authorized');
        return;
    }
    // פענוח ה-token
    jsonwebtoken.verify(token, SECRET_KEY, (err: any, user: any) => {
        if (err) {
            res.status(403).send('Forbidden');
            return;
        }
        req.user = user; // שמירה של המידע מה-token ב-req.user
        next(); // המשך ביצוע הפונקציה הבאה
    });
}

// ה-handler למסלול /protected
app.get('/protected', authenticateToken, (req: Request, res: Response) => {
    // אם ה-token תקף, נחזיר את המידע של המשתמש
    res.status(200).send(`Welcome to the protected route, ${req.user.username}`);
});

app.post('/signUp', async (req: Request, res: Response): Promise<void> => {
    const { username, email, password }: { username: string; email: string; password: string } = req.body;
    try {
        // Check if user already exists (optional, based on your needs)
        const existingUser = await myRepository.getUserDetailsByUsername(username);
        if (existingUser) {
            res.status(400).send('User already exists.');
            return;
        }
        // Hash the password using bcrypt
        const saltRounds: number = 10;
        const hashedPassword: string = await bcrypt.hash(password, saltRounds);
        // Store the user details in the database with the hashed password
        await myRepository.createUser(username, email, hashedPassword);
        // After user is created, generate a JWT token for the user
        const token: string = jsonwebtoken.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
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

app.post('/signin', async (req: Request, res: Response): Promise<void> => {
    const { username, password }: { username: string; password: string } = req.body;

    try {
        // Get user details from the database
        const user = await myRepository.getUserDetailsByUsername(username);

        // If the user is not found
        if (!user) {
            res.status(401).send('Not authorized');
            return;
        }

        // Compare the entered password with the hashed password from the database
        const isPasswordValid: boolean = await bcrypt.compare(password, user.password);

        if (isPasswordValid) {
            // אם הסיסמאות תואמות, יצירת JWT עם שם המשתמש
            const token: string = jsonwebtoken.sign({ username }, SECRET_KEY, { expiresIn: '1h' });

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
    }
    catch (error) {
        console.error('Error during signin:', error);
        res.status(500).send('Internal server error');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
