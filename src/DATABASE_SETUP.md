# PANDA POS - Database Setup Instructions

## ⚠️ IMPORTANT: Add Missing Columns to Existing Database

If you already have a PANDA POS database running, you need to add the `shots` table, `order_shots` table, `updated_at` column, and `staff_id` column.

**Run these SQL commands in your Supabase SQL Editor:**

```sql
-- Create Shots Table
CREATE TABLE IF NOT EXISTS shots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Specials Table (Food items like loaded fries, wings, hookah, etc.)
CREATE TABLE IF NOT EXISTS specials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Order Shots Table (for tracking shots in orders)
CREATE TABLE IF NOT EXISTS order_shots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shot_id UUID NOT NULL REFERENCES shots(id),
  staff_id UUID NOT NULL REFERENCES users(id),
  quantity INTEGER NOT NULL,
  price_at_time DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Order Specials Table (for tracking specials in orders)
CREATE TABLE IF NOT EXISTS order_specials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  special_id UUID NOT NULL REFERENCES specials(id),
  staff_id UUID NOT NULL REFERENCES users(id),
  quantity INTEGER NOT NULL,
  price_at_time DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add updated_at to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add staff_id to orders table (to track which staff member created the tab/order)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES users(id);

-- Add payment_method to orders table (if not exists)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('cash', 'visa', 'mpesa', 'ecocash'));

-- Fix orders status constraint (drop old constraint and add new one)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'paid'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_shots_order_id ON order_shots(order_id);
CREATE INDEX IF NOT EXISTS idx_order_specials_order_id ON order_specials(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_staff_id ON orders(staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Enable RLS for shots, specials, and their order tables
ALTER TABLE shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE specials ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_specials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all operations on shots" ON shots FOR ALL USING (true);
CREATE POLICY "Allow all operations on order_shots" ON order_shots FOR ALL USING (true);
CREATE POLICY "Allow all operations on specials" ON specials FOR ALL USING (true);
CREATE POLICY "Allow all operations on order_specials" ON order_specials FOR ALL USING (true);

-- Enable Realtime for shots, specials, and their order tables
ALTER PUBLICATION supabase_realtime ADD TABLE shots;
ALTER PUBLICATION supabase_realtime ADD TABLE order_shots;
ALTER PUBLICATION supabase_realtime ADD TABLE specials;
ALTER PUBLICATION supabase_realtime ADD TABLE order_specials;
```

After running these commands, refresh your application and you're ready to go!

---

## Supabase Database Schema

Run the following SQL commands in your Supabase SQL Editor to set up the database:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'bartender', 'waitress')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items Table
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  barcode TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shots Table (No inventory tracking)
CREATE TABLE shots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Specials Table (Food items like loaded fries, wings, hookah, etc.)
CREATE TABLE specials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Shots Table (for tracking shots in orders)
CREATE TABLE order_shots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shot_id UUID NOT NULL REFERENCES shots(id),
  staff_id UUID NOT NULL REFERENCES users(id),
  quantity INTEGER NOT NULL,
  price_at_time DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Specials Table (for tracking specials in orders)
CREATE TABLE order_specials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  special_id UUID NOT NULL REFERENCES specials(id),
  staff_id UUID NOT NULL REFERENCES users(id),
  quantity INTEGER NOT NULL,
  price_at_time DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders Table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'visa', 'mpesa', 'ecocash')),
  total DECIMAL(10, 2) NOT NULL,
  service_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  staff_id UUID REFERENCES users(id)
);

-- Order Items Table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  staff_id UUID NOT NULL REFERENCES users(id),
  quantity INTEGER NOT NULL,
  price_at_time DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Riders Table (Free Items)
CREATE TABLE riders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id),
  quantity INTEGER NOT NULL,
  recipient TEXT NOT NULL,
  given_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_staff_id ON order_items(staff_id);
CREATE INDEX idx_order_items_created_at ON order_items(created_at);
CREATE INDEX idx_riders_created_at ON riders(created_at);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow all operations for authenticated users)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on items" ON items FOR ALL USING (true);
CREATE POLICY "Allow all operations on orders" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on order_items" ON order_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on riders" ON riders FOR ALL USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE riders;
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Insert Sample Admin User
INSERT INTO users (username, name, pin, role) VALUES
  ('admin', 'Administrator', '1234', 'admin'),
  ('john', 'John Bartender', '1111', 'bartender'),
  ('mary', 'Mary Waitress', '2222', 'waitress');

-- Insert Sample Items
INSERT INTO items (name, quantity, barcode, price, category, low_stock_threshold) VALUES
  ('Coca Cola', 100, '123456789', 2.50, 'Beverages', 20),
  ('Sprite', 80, '123456790', 2.50, 'Beverages', 20),
  ('Burger', 50, '123456791', 8.99, 'Food', 10),
  ('Fries', 60, '123456792', 3.99, 'Food', 15),
  ('Beer', 120, '123456793', 4.50, 'Alcohol', 30),
  ('Wine', 40, '123456794', 12.99, 'Alcohol', 10),
  ('Coffee', 90, '123456795', 3.50, 'Beverages', 20),
  ('Pizza', 30, '123456796', 14.99, 'Food', 10);
```

## Default Login Credentials

After running the SQL above, you can log in with these accounts:

- **Admin**
  - Username: `admin`
  - PIN: `1234`

- **Bartender**
  - Username: `john`
  - PIN: `1111`

- **Waitress**
  - Username: `mary`
  - PIN: `2222`

## Features by Role

### Admin
- Full access to all features
- User management
- Reports and analytics
- Inventory management
- POS system
- Riders (free items)

### Bartender
- POS system
- Inventory view/edit
- Riders (free items)

### Waitress
- POS system (with 10% service fee)
- Inventory view
- Riders (free items)

## Realtime Sync

The application uses Supabase Realtime to sync data across multiple devices/tabs instantly. Changes to items, orders, and riders will be reflected immediately on all connected clients.

## Next Steps

1. Run the SQL script in your Supabase SQL Editor
2. Verify the tables are created
3. Test login with the default credentials
4. Add more users and products as needed
5. **To manage shots**: Navigate to "Shots" page (Admin only) → Click "Add Shot" → Enter shot details
6. **In POS**: Toggle between "Items" and "Shots" to add shots to orders

## Managing Shots

Shots are special products in a separate table that don't require inventory tracking. Only **Admins** can manage shots.

### Adding Shots:

1. Go to **Shots** page (Admin navigation menu)
2. Click **"Add Shot"** button
3. Enter the shot details:
   - **Name**: e.g., "Hennessy VSOP"
   - **Price**: e.g., 50 (for M50)
4. Click **Create**

### Using Shots in POS:

1. In the POS page, toggle between **"Items"** and **"Shots"** view
2. Click on a shot to add it to the cart (unlimited quantity, no inventory tracking)
3. Shots can be mixed with regular items in the same order

**Example Shots:**
- Hennessy VSOP - M50
- Hennessy VS - M40
- Jameson - M30
- Jameson Select - M35
- Jagermeister - M25
- Olmeca - M30
- Martell - M45
- Gordon's - M20

**Key Features:**
- No inventory tracking
- No barcode required
- Unlimited quantity
- Separate management page for admins only