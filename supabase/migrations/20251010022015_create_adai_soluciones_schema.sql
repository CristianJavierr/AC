/*
  # Adai Soluciones Database Schema

  ## Overview
  Complete database schema for Adai Soluciones inventory and customer management system.

  ## Tables Created

  ### 1. products
  Stores information about the flour products offered by Adai Soluciones:
  - `id` (uuid, primary key) - Unique product identifier
  - `name` (text) - Product name
  - `description` (text) - Product description and benefits
  - `stock` (integer) - Current stock quantity
  - `min_stock` (integer) - Minimum stock level for alerts
  - `price` (numeric) - Product price
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. customers
  Manages customer information:
  - `id` (uuid, primary key) - Unique customer identifier
  - `name` (text) - Customer full name
  - `email` (text) - Customer email address
  - `phone` (text) - Customer phone number
  - `company` (text) - Company name (optional)
  - `address` (text) - Customer address
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. sales
  Tracks all sales transactions:
  - `id` (uuid, primary key) - Unique sale identifier
  - `customer_id` (uuid, foreign key) - Reference to customer
  - `total_amount` (numeric) - Total sale amount
  - `sale_date` (timestamptz) - Date and time of sale
  - `notes` (text) - Additional sale notes
  - `created_at` (timestamptz) - Record creation timestamp

  ### 4. sale_items
  Details of products in each sale:
  - `id` (uuid, primary key) - Unique item identifier
  - `sale_id` (uuid, foreign key) - Reference to sale
  - `product_id` (uuid, foreign key) - Reference to product
  - `quantity` (integer) - Quantity sold
  - `unit_price` (numeric) - Price per unit at time of sale
  - `subtotal` (numeric) - Line item total

  ### 5. appointments
  Manages customer appointments and meetings:
  - `id` (uuid, primary key) - Unique appointment identifier
  - `customer_id` (uuid, foreign key) - Reference to customer
  - `title` (text) - Appointment title/subject
  - `description` (text) - Appointment details
  - `start_time` (timestamptz) - Appointment start time
  - `end_time` (timestamptz) - Appointment end time
  - `status` (text) - Appointment status (scheduled, completed, cancelled)
  - `created_at` (timestamptz) - Record creation timestamp

  ### 6. user_profiles
  Extends auth.users with additional profile information:
  - `id` (uuid, primary key) - References auth.users(id)
  - `full_name` (text) - User's full name
  - `phone` (text) - User's phone number
  - `role` (text) - User role (admin, user, manager) - For future use
  - `avatar_url` (text) - Profile picture URL
  - `is_active` (boolean) - Account active status
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  Note: Email is stored in auth.users table. This table extends it with profile data.
  A trigger automatically creates a profile when a user signs up.

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Policies created for authenticated users to manage all records
  - Public access denied by default
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 10,
  price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  company text,
  address text,
  created_at timestamptz DEFAULT now()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  sale_date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  quantity integer NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  subtotal numeric(10,2) NOT NULL
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now()
);

-- Create user_profiles table (extends auth.users with additional info)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  role text DEFAULT 'user',
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for products
CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for customers
CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for sales
CREATE POLICY "Authenticated users can view sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sales"
  ON sales FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for sale_items
CREATE POLICY "Authenticated users can view sale_items"
  ON sale_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sale_items"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sale_items"
  ON sale_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sale_items"
  ON sale_items FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for appointments
CREATE POLICY "Authenticated users can view appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for user_profiles
CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile when user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert initial products
INSERT INTO products (name, description, stock, min_stock, price) VALUES
  ('Premezcla para Cupcake', 'Facilita el proceso de elaboración, basta adicionar líquidos, mezclar, hornear', 100, 20, 150.00),
  ('Mejorante para todo tipo de pan', 'Fórmula superconcentrada, con proteínas y vitaminas, ofrece ahorro hasta un 75%', 80, 15, 200.00),
  ('Base Concentrada para Donuts', 'Obtén los mejores resultados de donuts sabrosos y suaves durante varios días', 60, 15, 180.00),
  ('Base Concentrada Pastel de Vainilla', 'Mezcla perfecta para crear pasteles de vainilla con textura suave y sabor', 90, 20, 170.00)
ON CONFLICT DO NOTHING;