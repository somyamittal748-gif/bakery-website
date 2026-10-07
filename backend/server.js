const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use(express.static("../"));

// Simple admin password
const ADMIN_PASSWORD = "bakery123";

// Create/open the database
const db = new Database("orders.db");

// Create the orders table if it doesn't exist
db.prepare(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product TEXT NOT NULL,
        createdAt TEXT NOT NULL
    )
`).run();

// Create customer orders table
db.prepare(`
    CREATE TABLE IF NOT EXISTS customer_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerName TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT NOT NULL,
        items TEXT NOT NULL,
        total REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        createdAt TEXT NOT NULL
    )
`).run();

// Create contact messages table
db.prepare(`
    CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        createdAt TEXT NOT NULL
    )
`).run();

// Admin login
app.post("/api/admin-login", (req, res) => {
    const { password } = req.body;

    if (password === ADMIN_PASSWORD) {
        return res.json({
            success: true,
            message: "Login successful"
        });
    }

    res.status(401).json({
        success: false,
        message: "Incorrect password"
    });
});

// Home
app.get("/", (req, res) => {
    res.json({
        message: "Backend is working!"
    });
});

// Save a new order
app.post("/api/orders", (req, res) => {
    const product = req.body.product;

    if (!product) {
        return res.status(400).json({
            success: false,
            message: "Product is required"
        });
    }

    const createdAt = new Date().toISOString();

    const result = db.prepare(`
        INSERT INTO orders (product, createdAt)
        VALUES (?, ?)
    `).run(product, createdAt);

    const order = db.prepare(`
        SELECT * FROM orders WHERE id = ?
    `).get(result.lastInsertRowid);

    console.log("New order saved:", order);

    res.json({
        success: true,
        message: "Order saved successfully",
        order: order
    });
});

// Get all orders
app.get("/api/orders", (req, res) => {
    const orders = db.prepare(`
        SELECT * FROM orders ORDER BY id DESC
    `).all();

    res.json(orders);
});
  

app.post("/api/place-order", (req, res) => {
    const { items, total } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Cart is empty"
        });
    }

    const createdAt = new Date().toISOString();

    const order = db.prepare(`
        INSERT INTO orders (product, createdAt)
        VALUES (?, ?)
    `).run(
        JSON.stringify({
            items: items,
            total: total
        }),
        createdAt
    );

    res.json({
        success: true,
        message: "Order placed successfully",
        orderId: order.lastInsertRowid
    });
});
// Save Contact Us message
app.post("/api/contact", (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({
            success: false,
            message: "Please fill all fields."
        });
    }

    const createdAt = new Date().toISOString();

    db.prepare(`
        INSERT INTO contact_messages (name, email, message, createdAt)
        VALUES (?, ?, ?, ?)
    `).run(name, email, message, createdAt);

    res.json({
        success: true,
        message: "Message received successfully"
    });
});
// Get all contact messages
app.get("/api/contact-messages", (req, res) => {
    const messages = db.prepare(`
        SELECT * FROM contact_messages
        ORDER BY id DESC
    `).all();

    res.json(messages);
});

// Save a customer order
app.post("/api/customer-orders", (req, res) => {
    const {
        customerName,
        phone,
        email,
        address,
        items,
        total
    } = req.body;

    if (!customerName || !phone || !address || !items || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Please provide all required customer details and cart items."
        });
    }

    const createdAt = new Date().toISOString();

    const result = db.prepare(`
        INSERT INTO customer_orders
        (customerName, phone, email, address, items, total, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        customerName,
        phone,
        email || "",
        address,
        JSON.stringify(items),
        total,
        "Pending",
        createdAt
    );

    res.json({
        success: true,
        message: "Customer order saved successfully",
        orderId: result.lastInsertRowid
    });
});

// Get all customer orders
app.get("/api/customer-orders", (req, res) => {
    const orders = db.prepare(`
        SELECT * FROM customer_orders
        ORDER BY id DESC
    `).all();

    res.json(orders);
});

// Update order status
app.put("/api/customer-orders/:id/status", (req, res) => {
    const { status } = req.body;
    const orderId = req.params.id;

    const allowedStatuses = [
        "Pending",
        "Confirmed",
        "Preparing",
        "Out for Delivery",
        "Delivered"
    ];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: "Invalid order status"
        });
    }

    const result = db.prepare(`
        UPDATE customer_orders
        SET status = ?
        WHERE id = ?
    `).run(status, orderId);

    if (result.changes === 0) {
        return res.status(404).json({
            success: false,
            message: "Order not found"
        });
    }

    res.json({
        success: true,
        message: "Order status updated successfully"
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});