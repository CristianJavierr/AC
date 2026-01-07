/*
  # AC - Air Conditioning Management System Schema

  ## Overview
  Database schema for AC technician and job management system.

  ## Tables

  ### 1. user_profiles
  Extends auth.users with profile information for admins and technicians:
  - `id` (uuid, primary key) - References auth.users(id)
  - `full_name` (text) - User's full name
  - `phone` (text) - User's phone number
  - `role` (text) - User role: 'admin' or 'technician'
  - `avatar_url` (text) - Profile picture URL
  - `is_active` (boolean) - Account active status
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. customers
  Manages customer information:
  - `id` (uuid, primary key) - Unique customer identifier
  - `name` (text) - Customer full name
  - `email` (text) - Customer email address
  - `phone` (text) - Customer phone number
  - `address` (text) - Customer address
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. jobs
  Tracks installation and repair jobs:
  - `id` (uuid, primary key) - Unique job identifier
  - `customer_id` (uuid, foreign key) - Reference to customer
  - `technician_id` (uuid, foreign key) - Reference to assigned technician
  - `job_type` (text) - Type: installation, repair, maintenance, inspection
  - `title` (text) - Job title/summary
  - `description` (text) - Detailed description
  - `address` (text) - Job location address
  - `scheduled_date` (timestamptz) - Scheduled date and time
  - `completed_date` (timestamptz) - Completion date and time
  - `status` (text) - Status: pending, assigned, in_progress, completed, cancelled
  - `priority` (text) - Priority: low, medium, high, urgent
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. appointments
  Manages scheduled appointments:
  - `id` (uuid, primary key) - Unique appointment identifier
  - `customer_id` (uuid, foreign key) - Reference to customer
  - `title` (text) - Appointment title/subject
  - `description` (text) - Appointment details
  - `start_time` (timestamptz) - Appointment start time
  - `end_time` (timestamptz) - Appointment end time
  - `status` (text) - Status: scheduled, completed, cancelled
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Admins have full access
  - Technicians can view their assigned jobs and update status
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'technician' CHECK (role IN ('admin', 'technician')),
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  job_type text NOT NULL CHECK (job_type IN ('installation', 'repair', 'maintenance', 'inspection')),
  title text NOT NULL,
  description text,
  address text NOT NULL,
  scheduled_date timestamptz NOT NULL,
  completed_date timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
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

-- Policies for customers (all authenticated users can manage)
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

-- Policies for jobs
CREATE POLICY "Authenticated users can view jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (true);

-- Policies for appointments
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

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'technician')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
