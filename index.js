require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bodyParser = require('body-parser');
const e = require('express');
const app = express();
const port = 3300;
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname)));


const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

//get events
app.get('/api/events', async (req, res) => {
  try {
    
    const connection = await pool.getConnection();
    try {
      const [results, fields] = await connection.query("SELECT * FROM events WHERE event_privacy = 'Public'");
      res.json(results);
    } finally {
      
      connection.release();
    }
  } catch (error) {
    res.status(500).send('Error querying database');
  }
});
app.get('/myEvents', async (req, res) => {
  try {
    const email = req.query.email;
    const connection = await pool.getConnection();

    try {
     
      const [results, fields] = await connection.query('SELECT * FROM events WHERE event_owner = ?',[email]);
      res.json(results);
    } finally {
      
      connection.release();
    }
  } catch (error) {
    res.status(500).send('Error querying database');
  }
});
app.get('/myBookings', async (req, res) => {
  try {
    const email = req.query.email;
    const connection = await pool.getConnection();

    try {
     
      const [results, fields] = await connection.query('SELECT * FROM bookings WHERE user = ?',[email]);
      res.json(results);
     
    } finally {
      
      connection.release();
    }
  } catch (error) {
    res.status(500).send('Error querying database');
  }
});
app.get('/checkUser', async (req, res) => {
  try {
    const email = req.query.email; // Use req.query for GET request parameters
    const connection = await pool.getConnection();
    try {
      const [results] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
      if(results.length>0) {res.json(true);}
      else{
        res.json(false);
      }
       // Return the first result as we are querying by email
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error querying database');
  }
});
app.get('/userInfo', async (req, res) => {
  try {
    const email = req.query.email; // Use req.query for GET request parameters
    const connection = await pool.getConnection();
    try {
      const [results] = await connection.query('SELECT email, name FROM users WHERE email = ?', [email]);
      res.json(results[0]); // Return the first result as we are querying by email
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error querying database');
  }
});
app.post('/signin', async (req, res) => {
  const { email, password } = req.body;
 
  try {
    const connection = await pool.getConnection();
    try {
      const [results] = await connection.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
      if (results.length > 0) {
        res.json({ success: true, message: 'Login successful' });
      } else {
        res.json({ success: false, message: 'Email or password does not match' });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error signing in user' });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const connection = await pool.getConnection();
    const [existingUsers] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
    connection.release();

    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Insert new user into database
    const newUser = { email, name, password };
    const insertQuery = 'INSERT INTO users (email, name, password) VALUES (?, ?, ?)';
    const insertValues = [newUser.email, newUser.name, newUser.password];

    const insertConnection = await pool.getConnection();
    await insertConnection.query(insertQuery, insertValues);
    insertConnection.release();

    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ success: false, message: 'Error registering user' });
  }
});
app.post('/addEvent', async (req, res) => {
  const { event_name, event_details, event_time, event_privacy, event_price, event_location, category, event_owner } = req.body;

  if (!event_name || !event_details || !event_time || !event_privacy || !event_price || !event_location || !event_owner || !category) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const connection = await pool.getConnection();
    try {
      // Get the next id by counting the current number of events
      const [rows] = await connection.query('SELECT COUNT(*) AS count FROM events');
      const id = rows[0].count + 1;
      
      
      await connection.query(
        'INSERT INTO events (id, event_name, event_details, event_time, event_privacy, event_price, event_location, event_owner, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, event_name, event_details, event_time, event_privacy, event_price, event_location, event_owner, category]
      );
      res.status(201).json({ message: 'Event created successfully!' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error inserting event:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.get('/eventDetails', async (req, res) => {
  try {
    const id = req.query.id;
    const connection = await pool.getConnection();

    try {
     
      const [results] = await connection.query('SELECT * FROM events WHERE id = ?',[id]);
      res.json(results[0]);
    } finally {
      
      connection.release();
    }
  } catch (error) {
    res.status(500).send('Error querying database');
  }
});
app.get('/eventTicketsCount', async (req, res) => {
  try {
    const id = req.query.id;
    const connection = await pool.getConnection();

    try {
     
      const [results] = await connection.query('SELECT event_id, SUM(tickets) AS total_tickets FROM bookings WHERE event_id = ?',[id]);
      res.json(results[0]);
      console.log(results[0].total_tickets);
    } finally {
      
      connection.release();
    }
  } catch (error) {
    res.status(500).send('Error querying database');
  }
});
app.get('/bookingDetails', async (req, res) => {
  try {
    const event_id = req.query.event_id;
    const connection = await pool.getConnection();

    try {
      const [results] = await connection.query('SELECT * FROM bookings WHERE event_id = ?', [event_id]);
      res.json(results);
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).send('Error querying database');
  }
});
app.post('/buyTicket', async (req, res) => {
  const { eventId, userEmail, ticketCount } = req.body;

  if (!eventId || !userEmail || !ticketCount) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const connection = await pool.getConnection();
    try {
      // Retrieve event details
      const [eventRows] = await connection.query('SELECT * FROM events WHERE id = ?', [eventId]);
      if (eventRows.length === 0) {
        return res.status(404).json({ message: 'Event not found.' });
      }
      const event = eventRows[0];

      // Calculate total price
      const totalPrice = event.event_price * ticketCount;
      const [rows] = await connection.query('SELECT COUNT(*) AS count FROM bookings');
      const id = rows[0].count + 1;
      // Insert booking into the database
      await connection.query(
        'INSERT INTO bookings (id,event_id, user, tickets, total_price) VALUES (?, ?, ?, ?, ?)',
        [id,eventId, userEmail, ticketCount, totalPrice]
      );

      res.status(201).json({ message: 'Tickets bought successfully!' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error buying tickets:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.post('/updateEvent', async (req, res) => {
  const {
   
    event_name,
    event_details,
    event_time,
    event_privacy,
    event_price,
    event_location,
    category,
    event_id
  } = req.body;

  if (!event_id) {
    return res.status(400).json({ message: 'Event ID is required' });
  }

  try {
    const connection = await pool.getConnection();
    try {
      const query = `
        UPDATE events 
        SET event_name = ?, event_details = ?, event_time = ?, event_privacy = ?, event_price = ?, event_location = ?, category = ?
        WHERE id = ?;
      `;
      const values = [
        event_name,
        event_details,
        new Date(event_time), // Ensure the date is properly formatted
        event_privacy,
        event_price,
        event_location,
        category,
        event_id,
      ];

      const [result] = await connection.query(query, values);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Event not found' });
      }

      res.json({ message: 'Event updated successfully' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Error updating event' });
  }
});
app.post('/updateNotification', async (req, res) => {
  const {
    notification,
    event_id
  } = req.body;

  if (!event_id) {
    return res.status(400).json({ message: 'Event ID is required' });
  }

  try {
    const connection = await pool.getConnection();
    try {
      const query = `
        UPDATE events 
        SET notification = ?
        WHERE id = ?;
      `;
      const values = [
        notification,
        event_id
      ];

      const [result] = await connection.query(query, values);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Event not found' });
      }

      res.json({ message: 'Event Notification updated successfully' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Error updating event' });
  }
});
app.post('/addChat', async (req, res) => {
  const {
    chat,
    event_id,
    user_email,
    user_name
  } = req.body;

  if (!event_id) {
    return res.status(400).json({ message: 'Event ID is required' });
  }

  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query('SELECT COUNT(*) AS count FROM chat');
      const id = rows[0].count + 1;
      await connection.query(
        'INSERT INTO chat (id, chat, event_id, user_email, user_name) VALUES (?, ?, ?, ?, ?)',
        [id, chat, event_id, user_email, user_name]
      );

      res.json({ message: 'Chat updated successfully' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating chat:', error);
    res.status(500).json({ message: 'Error updating chat' });
  }
});
app.get('/chatDetails', async (req, res) => {
  try {
    const event_id = req.query.event_id;
    const connection = await pool.getConnection();

    try {
      const [results] = await connection.query('SELECT * FROM chat WHERE event_id = ?', [event_id]);
      res.json(results);
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).send('Error querying database');
  }
});
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});
app.get('/signin', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth','login.html'));
});
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth','register.html'));
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard','dashboard.html'));
});
app.get('/addEvent', (req, res) => {
  res.sendFile(path.join(__dirname, 'addEvent','addEvent.html'));
});
app.get('/myEvents', (req, res) => {
  res.sendFile(path.join(__dirname, 'myEvents','myEvents.html'));
});
app.get('/eventDetails', (req, res) => {
  res.sendFile(path.join(__dirname, 'eventDetails','eventDetails.html'));
});
app.get('/editEvent', (req, res) => {
  res.sendFile(path.join(__dirname, 'addEvent','editEvent.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
