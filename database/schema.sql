-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS user_intervals;
DROP TABLE IF EXISTS user_objectives;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS intervals;
DROP TABLE IF EXISTS interval_types;
DROP TABLE IF EXISTS objectives;

-- Create interval_types table
CREATE TABLE interval_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    duration_minutes INT NOT NULL,
    description VARCHAR(255)
);

-- Create objectives table
CREATE TABLE objectives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL UNIQUE
);

-- Create users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL
);

-- Create intervals table
CREATE TABLE intervals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    interval_type_id INT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    FOREIGN KEY (interval_type_id) REFERENCES interval_types(id) ON DELETE CASCADE,
    INDEX idx_interval_dates (start_date, end_date)
);

-- Create junction table for users and objectives (many-to-many)
CREATE TABLE user_objectives (
    user_id INT NOT NULL,
    objective_id INT NOT NULL,
    PRIMARY KEY (user_id, objective_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE
);

-- Create junction table for users and intervals (many-to-many)
CREATE TABLE user_intervals (
    user_id INT NOT NULL,
    interval_id INT NOT NULL,
    PRIMARY KEY (user_id, interval_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (interval_id) REFERENCES intervals(id) ON DELETE CASCADE
);

-- Insert default interval types
INSERT INTO interval_types (name, duration_minutes, description) VALUES 
('1 hour', 60, 'One hour session'),
('1 day', 1440, 'Full day session'),
('1 week', 10080, 'One week session');

-- Insert default objectives
INSERT INTO objectives (title) VALUES 
('Weight Loss'),
('Muscle Gain'),
('Maintenance'),
('Endurance'),
('Flexibility');
