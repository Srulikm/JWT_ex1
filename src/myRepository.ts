import * as sql from 'mssql';

interface DatabaseConfig {
    user: string;
    password: string;
    server: string;
    database: string;
    options: {
        encrypt: boolean;
        trustServerCertificate: boolean;
    };
}

interface User {
    username: string;
    email: string;
    password: string;
}

const config: DatabaseConfig = {
    user: 'sa31',
    password: '1234',
    server: 'localhost',
    database: 'Ex1JwtUsers',
    options: {
        encrypt: false, // for azure change to true
        trustServerCertificate: true // change to false for production
    }
};

// Function to get user details by username
export async function getUserDetailsByUsername(userName: string): Promise<User | null> {
    let pool: sql.ConnectionPool | undefined;
    try {
        // Create a connection pool to the database
        pool = await sql.connect(config);

        // Execute the stored procedure
        const result = await pool.request()
            .input('username', sql.VarChar, userName) // Pass the username as input to the SP
            .execute('GetUserDetails'); // Replace with the name of your stored procedure

        // Check if any user was found
        if (result.recordset.length > 0) {
            return result.recordset[0] as User; // Return the first user record
        }
        else {
            return null; // Return null if no user is found
        }
    }
    catch (err) {
        console.error('Error fetching user details:', err);
        console.log(err);
        throw err; // Re-throw the error to be handled by calling code
    }
    finally {
        await pool?.close();
    }
}

// פונקציה להוספת משתמש חדש
export async function createUser(userName: string, email: string, password: string): Promise<string> {
    let pool: sql.ConnectionPool | undefined;
    try {
        // התחברות למסד הנתונים
        pool = await sql.connect(config);

        // פנייה לפרוצדורה
        await pool.request()
            .input('username', sql.VarChar, userName)   // שם המשתמש
            .input('password', sql.VarChar, password)   // הסיסמה
            .input('email', sql.VarChar, email)         // כתובת האימייל
            .execute('CreateUser');                    // שם הפרוצדורה

        // אם ההכנסה הצליחה, נחזיר הודעת הצלחה
        return 'User created successfully';
    }
    catch (err) {
        console.error('Error creating user:', err);
        throw err; // נזרוק את השגיאה לטיפול חיצוני אם יש
    }
    finally {
        await pool?.close();
    }
}
