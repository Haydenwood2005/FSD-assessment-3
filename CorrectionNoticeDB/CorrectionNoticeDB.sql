-- Drop the database if it exists
DROP DATABASE IF EXISTS CorrectionNoticeDB;

-- Drop users if they exist
DROP USER IF EXISTS 'officer_user'@'localhost';
DROP USER IF EXISTS 'citizen_user'@'localhost';
-- tables, users and data deleted and refreshed so no duplicate when ran again.
-- Create fresh database

CREATE DATABASE CorrectionNoticeDB
CHARACTER SET utf8mb4 -- default character set
COLLATE utf8mb4_general_ci;

-- Use new database
USE CorrectionNoticeDB;

-- Correction Notice Database Script




-- 1. Create Tables (DDL)

-- Table: RegisteredOwner
CREATE TABLE RegisteredOwner (
    OwnerID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    First_Name VARCHAR(50) NOT NULL,
    Last_Name VARCHAR(50) NOT NULL,
    Address VARCHAR(100),
    City VARCHAR(50),
    State CHAR(2),
    Postal_Code VARCHAR(10),
    Phone VARCHAR(20),
    Email VARCHAR(100)
);

-- Table: Vehicle (linked to RegisteredOwner)
CREATE TABLE Vehicle (
    VehicleID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    OwnerID INT NOT NULL,
    Vehicles_Licence_Number VARCHAR(15),
    Color VARCHAR(20),
    Make VARCHAR(50),
    VIN CHAR(17) NOT NULL UNIQUE,
    Address VARCHAR(100),
    Vehicles_Licence_State CHAR(2),
    Year INT,
    Type VARCHAR(20),
    FOREIGN KEY (OwnerID) REFERENCES RegisteredOwner(OwnerID)
);

-- Table: Officer
CREATE TABLE Officer (
    OfficerID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Personnel_Number VARCHAR(5) NOT NULL UNIQUE,
    First_Name VARCHAR(50) NOT NULL,
    Last_Name VARCHAR(50) NOT NULL
);

-- Table: Driver
CREATE TABLE Driver (
    DriverID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    First_Name VARCHAR(50) NOT NULL,
    Last_Name VARCHAR(50) NOT NULL,
    Address VARCHAR(100) NOT NULL,
    City VARCHAR(50),
    State VARCHAR(50) NOT NULL,
    Postal_Code VARCHAR(10),
    Drivers_Licence_Number VARCHAR(20) UNIQUE,
    Drivers_Licence_Issued_State CHAR(2),
    Date_Of_Birth DATE NOT NULL,
    Height VARCHAR(5) NOT NULL,
    Weight INT NOT NULL,
    Eyes_Colour VARCHAR(20) NOT NULL,
    CONSTRAINT check_dateofbirth CHECK (Date_Of_Birth <= '2025-11-08'),
    CONSTRAINT check_weight CHECK (Weight > 0)
);

-- Table: ViolationTypes
CREATE TABLE ViolationTypes (
    ViolationTypesID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Violation_Code VARCHAR(5) NOT NULL UNIQUE,
    Violation_Name VARCHAR(50) NOT NULL,
    Violation_Description VARCHAR(250)
);

-- Table: Notice (linked to Officer, Vehicle, Driver, ViolationTypes)
CREATE TABLE Notice (
    NoticeID CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()), -- GUID allowing a globally identifiable ID
    OfficerID INT NOT NULL,
    VehicleID INT,
    DriverID INT,
    ViolationTypesID INT NOT NULL,
    Violation_Date DATE NOT NULL,
    Violation_Time TIME NOT NULL,
    Violation_Street VARCHAR(100) NOT NULL,
    Violation_City VARCHAR(50) NOT NULL,
    Violation_District VARCHAR(50) NOT NULL,
    Violation_Detachment VARCHAR(50) NOT NULL,
    CONSTRAINT chk_violation_date CHECK (Violation_Date <= '2025-11-08'),
    FOREIGN KEY (OfficerID) REFERENCES Officer(OfficerID),
    FOREIGN KEY (VehicleID) REFERENCES Vehicle(VehicleID),
    FOREIGN KEY (DriverID) REFERENCES Driver(DriverID),
    FOREIGN KEY (ViolationTypesID) REFERENCES ViolationTypes(ViolationTypesID)
);

-- Table: ActionSelection (Linked to Notice)
CREATE TABLE ActionSelection (
    NoticeID CHAR(36) NOT NULL PRIMARY KEY,
    Action_Number_1 BOOLEAN NOT NULL,
    Action_Number_2 BOOLEAN NOT NULL,
    Action_Number_3 BOOLEAN NOT NULL,
    CONSTRAINT fk_notice FOREIGN KEY (NoticeID) REFERENCES Notice(NoticeID),
    CONSTRAINT chk_at_least_one_action CHECK (
        (Action_Number_1 + Action_Number_2 + Action_Number_3) = 1
    )
);




-- 2. Create Users & Assign Privileges (DCL)

-- Create user accounts
CREATE USER 'officer_user'@'localhost' IDENTIFIED BY 'OfficerPass123';
CREATE USER 'citizen_user'@'localhost' IDENTIFIED BY 'CitizenPass123';

-- Officer privileges (can modify data, *issuing new notices*)
GRANT SELECT, INSERT, UPDATE, DELETE ON CorrectionNoticeDB.* TO 'officer_user'@'localhost';

-- Citizen privileges (read-only)
GRANT SELECT ON CorrectionNoticeDB.* TO 'citizen_user'@'localhost';




-- 3. Insert Sample Data (DML)

-- Insert Registered Owners
INSERT INTO RegisteredOwner (First_Name, Last_Name, Address, City, State, Postal_Code, Phone, Email)
VALUES 
('Hayden', 'Wood', '29 Main Street', 'Ravenstone', 'LS', 'LE672AS', '07914675395', 'haydenwood24@outlook.com'),
('Emily', 'Smith', '12 Oak Avenue', 'Jersey City', 'NJ', '10801', '07914563210', 'emilysmith@gmail.com'),
('James', 'Brown', '45 Pine Road', 'Stamford', 'CT', '10601', '07914785932', 'jamesbrown@yahoo.com'),
('Sophia', 'Taylor', '78 Maple Street', 'Philadelphia', 'PA', '10528', '07914856321', 'sophiataylor@hotmail.com'),
('Liam', 'Johnson', '101 Birch Lane', 'Boston', 'MA', '10550', '07914987654', 'liamjohnson@gmail.com');

-- Insert Vehicles
INSERT INTO Vehicle (OwnerID, Vehicles_Licence_Number, Color, Make, VIN, Address, Vehicles_Licence_State, Year, Type)
VALUES 
(1, 'JR80ODL', 'Blue', 'Renault', '1HGCM82633A004352', '29 Main Street', 'LS', 2011, 'Car'),
(2, 'EF456GH', 'Red', 'Ford', '1FTRX18L1XNA12345', '12 Oak Avenue', 'NJ', 2020, 'Truck'),
(3, '3IJ789KL', 'Black', 'Honda', '2HGEJ6672XH123456', '45 Pine Road', 'NY', 2019, 'Car'),
(4, 'MN012OP', 'White', 'BMW', 'WBAEV33443KL12345', '78 Maple Street', 'PA', 2021, 'SUV'),
(5, 'QR345ST', 'Silver', 'Audi', 'WAUZZZ8K9AA123456', '101 Birch Lane', 'NY', 2022, 'Car');

-- Insert Officers
INSERT INTO Officer (Personnel_Number, First_Name, Last_Name)
VALUES 
('O1001', 'Alice', 'Morrison'),
('O1002', 'David', 'Harris'),
('O1003', 'Olivia', 'King'),
('O1004', 'Ethan', 'Wright'),
('O1005', 'Mia', 'Sanders');

-- Insert Drivers
INSERT INTO Driver (First_Name, Last_Name, Address, City, State, Postal_Code, Drivers_Licence_Number, Drivers_Licence_Issued_State, Date_Of_Birth, Height, Weight, Eyes_Colour)
VALUES
('Hayden', 'Wood', '29 Main Street', 'Ravenstone', 'NY', 'LE672AS', 'D1234567890123456', 'NY', '2005-12-20', '5.9', 75, 'Brown'),
('Emily', 'Smith', '12 Oak Avenue', 'Jersey City', 'NJ', '10801', 'D2345678901234567', 'NJ', '1988-11-23', '5.5', 60, 'Blue'),
('James', 'Brown', '45 Pine Road', 'Stamford', 'CT', '10601', 'D3456789012345678', 'CT', '2006-03-15', '6.0', 80, 'Green'),
('Sophia', 'Taylor', '78 Maple Street', 'Philadelphia', 'PA', '10528', 'D4567890123456789', 'PA', '1995-07-30', '5.6', 65, 'Hazel'),
('Liam', 'Johnson', '101 Birch Lane', 'Boston', 'MA', '10550', 'D5678901234567890', 'MA', '1985-12-01', '5.10', 78, 'Brown');

-- Insert Violation Types
INSERT INTO ViolationTypes (Violation_Code, Violation_Name, Violation_Description)
VALUES
('V001', 'Speeding', 'Exceeding the posted speed limit.'),
('V002', 'Red Light', 'Failure to stop at a red traffic signal.'),
('V003', 'Illegal Parking', 'Parking in a no-parking zone.'),
('V004', 'Speeding', 'Exceeding the posted speed limit.'),
('V005', 'Reckless Driving', 'Driving in a manner that endangers others.');

INSERT INTO Notice (NoticeID, OfficerID, VehicleID, DriverID, ViolationTypesID, Violation_Date, Violation_Time, Violation_Street, Violation_City, Violation_District, Violation_Detachment)
VALUES (UUID(), 1, 1, 1, 1, '2025-01-15', '14:30:00', 'Main Street', 'Yonkers', 'District 1', 'Central Detachment');

INSERT INTO Notice (NoticeID, OfficerID, VehicleID, DriverID, ViolationTypesID, Violation_Date, Violation_Time, Violation_Street, Violation_City, Violation_District, Violation_Detachment)
VALUES (UUID(), 2, 2, 2, 2, '2025-02-20', '09:45:00', 'Oak Avenue', 'Stonehill', 'District 3', 'Northern Detachment');

INSERT INTO Notice (NoticeID, OfficerID, VehicleID, DriverID, ViolationTypesID, Violation_Date, Violation_Time, Violation_Street, Violation_City, Violation_District, Violation_Detachment)
VALUES (UUID(), 3, 3, 3, 3, '2025-03-10', '16:15:00', 'Pine Road', 'Stamford', 'District 2', 'Eastern Detachment');

INSERT INTO Notice (NoticeID, OfficerID, VehicleID, DriverID, ViolationTypesID, Violation_Date, Violation_Time, Violation_Street, Violation_City, Violation_District, Violation_Detachment)
VALUES (UUID(), 4, 4, 4, 4, '2025-04-05', '11:00:00', 'Maple Street', 'Philadelphia', 'District 4', 'Southern Detachment');

INSERT INTO Notice (NoticeID, OfficerID, VehicleID, DriverID, ViolationTypesID, Violation_Date, Violation_Time, Violation_Street, Violation_City, Violation_District, Violation_Detachment)
VALUES (UUID(), 5, 5, 5, 5, '2025-05-22', '13:20:00', 'Birch Lane', 'Boston', 'District 6', 'Western Detachment');

-- Insert Action Selections
INSERT INTO ActionSelection (NoticeID, Action_Number_1, Action_Number_2, Action_Number_3)
SELECT NoticeID, 1, 0, 0 FROM Notice WHERE Violation_Street = 'Main Street';

INSERT INTO ActionSelection (NoticeID, Action_Number_1, Action_Number_2, Action_Number_3)
SELECT NoticeID, 0, 1, 0 FROM Notice WHERE Violation_Street = 'Oak Avenue';

INSERT INTO ActionSelection (NoticeID, Action_Number_1, Action_Number_2, Action_Number_3)
SELECT NoticeID, 0, 0, 1 FROM Notice WHERE Violation_Street = 'Pine Road';

INSERT INTO ActionSelection (NoticeID, Action_Number_1, Action_Number_2, Action_Number_3)
SELECT NoticeID, 1, 0, 0 FROM Notice WHERE Violation_Street = 'Maple Street';

INSERT INTO ActionSelection (NoticeID, Action_Number_1, Action_Number_2, Action_Number_3)
SELECT NoticeID, 1, 0, 0 FROM Notice WHERE Violation_Street = 'Birch Lane';




-- 4. View All Data In Tables

SELECT * FROM RegisteredOwner;
SELECT * FROM Vehicle;
SELECT * FROM Officer;
SELECT * FROM Driver;
SELECT * FROM ViolationTypes;
SELECT * FROM Notice;
SELECT * FROM ActionSelection;




-- 5. 10 Queries (DML)

-- 1. Create a new record for a correction notice
INSERT INTO Notice (
    NoticeID, OfficerID, VehicleID, DriverID, ViolationTypesID,
    Violation_Date, Violation_Time, Violation_Street, Violation_City,
    Violation_District, Violation_Detachment
)
VALUES (
    UUID(), 2, 3, 2, 1, '2025-06-10', '10:15:00',
    'Elm Street', 'White Plains', 'District 2', 'Northern Detachment'
);

-- View the new data
SELECT *
FROM Notice
WHERE Violation_Street = 'Elm Street' AND Violation_City = 'White Plains';

-- 2. Count the number notices issued to those under the age of 21 
SELECT n.NoticeID, d.First_Name, d.Last_Name, d.Date_Of_Birth
FROM Notice n
JOIN Driver d ON n.DriverID = d.DriverID
WHERE d.Date_Of_Birth > '2005-11-09';

-- 3. Search for specific text terms for violation description
SELECT Violation_Code, Violation_Name, Violation_Description
FROM ViolationTypes
WHERE Violation_Description LIKE '%speed%';

-- 4. Update a correction notice
UPDATE Notice
SET 
    Violation_District = 'Central Zone',
    Violation_Street = 'Elm Avenue'
WHERE Violation_Street = 'Elm Street' AND Violation_City = 'White Plains';

-- View the updated notice
SELECT *
FROM Notice
WHERE Violation_Street = 'Elm Avenue' AND Violation_City = 'White Plains';


-- 5. Count of violations grouped by patrol officer for the last 6 months
SELECT NoticeID, Violation_Date, Violation_City
FROM Notice
WHERE Violation_Date > '2025-05-01';

-- 6. Retrieve full notice details with officer, driver, and violation info (JOIN 4 tables)
SELECT 
    n.NoticeID,
    o.First_Name AS Officer_First_Name,
    o.Last_Name AS Officer_Last_Name,
    d.First_Name AS Driver_First_Name,
    d.Last_Name AS Driver_Last_Name,
    vt.Violation_Name,
    n.Violation_Date,
    n.Violation_City
FROM Notice n
JOIN Officer o ON n.OfficerID = o.OfficerID
JOIN Driver d ON n.DriverID = d.DriverID
JOIN ViolationTypes vt ON n.ViolationTypesID = vt.ViolationTypesID;

-- 7. List all vehicles with owners and linked notices (JOIN 3 tables)
SELECT 
    ro.First_Name AS Owner_First_Name,
    ro.Last_Name AS Owner_Last_Name,
    ve.Vehicles_Licence_Number,
    n.NoticeID
FROM Vehicle ve
JOIN RegisteredOwner ro ON ve.OwnerID = ro.OwnerID
LEFT JOIN Notice n ON ve.VehicleID = n.VehicleID;

-- 8. Find all notices issued in a specific city AND district (Boolean filter) 
SELECT n.NoticeID, n.Violation_City, n.Violation_District, o.First_Name, o.Last_Name
FROM Notice n
JOIN Officer o ON n.OfficerID = o.OfficerID
WHERE n.Violation_City = 'Philadelphia' AND n.Violation_District = 'District 4';

-- 9. Retrieve notices for a specific owner’s vehicles (JOIN 3 tables)
SELECT 
    n.NoticeID,
    ve.Vehicles_Licence_Number,
    vt.Violation_Name,
    n.Violation_Date
FROM Notice n
JOIN Vehicle ve ON n.VehicleID = ve.VehicleID
JOIN ViolationTypes vt ON n.ViolationTypesID = vt.ViolationTypesID
WHERE ve.OwnerID = 5;

-- 10. Find notices issued between two dates (comparison filter)
SELECT n.NoticeID, n.Violation_Date, d.First_Name, d.Last_Name, vt.Violation_Name
FROM Notice n
JOIN Driver d ON n.DriverID = d.DriverID
JOIN ViolationTypes vt ON n.ViolationTypesID = vt.ViolationTypesID
WHERE n.Violation_Date >= '2025-01-19' AND n.Violation_Date <= '2025-05-11';


